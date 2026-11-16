import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { loadEnv } from "../config/env";
import type { LlmClient } from "../llm";
import { crearDemo } from "../noticias/demo";
import { repositorioMemoria } from "../noticias/repositorio";
import { crearServidor } from "./index";
import { contextoParaModelo, fragmentosRelevantes, responder, SISTEMA, terminos } from "./preguntar";

const registros = crearDemo(new Date("2026-11-16T12:00:00Z"));

const llmFalso = (impl: (system: string, prompt: string) => Promise<string>): LlmClient & { generateText: jest.Mock } => ({
  provider: "gemini",
  model: "test-model",
  generateJson: jest.fn(),
  generateText: jest.fn(({ system, prompt }: { system: string; prompt: string }) => impl(system, prompt)),
});

describe("ask", () => {
  it("extracts terms without stop words", () => {
    expect(terminos("What was said about BTC this week?")).toEqual(["btc"]);
    expect(terminos("Ethereum and Solana")).toEqual(["ethereum", "solana"]);
  });

  it("without AI answers with relevant fragments and their sources", async () => {
    const r = await responder(registros, "What happened with BTC?", undefined);
    expect(r.modo).toBe("sin-ia");
    expect(r.fuentes.length).toBeGreaterThan(0);
    expect(r.fuentes.some((f) => f.ticker === "BTC")).toBe(true);
    expect(fragmentosRelevantes(registros, "BTC")[0]?.ticker).toBe("BTC");
  });

  it("with no matches, returns the most recent instead of inventing", async () => {
    const r = await responder(registros, "zzzz qqqq", undefined);
    expect(r.respuesta).toMatch(/No direct mentions found/);
    expect(r.fuentes).toEqual([{ fecha: registros[0]?.fecha, ticker: null }]);
  });

  it("with AI delimits context as evidence and falls back without AI if the model fails", async () => {
    const ok = llmFalso(async () => "BTC was bullish on 2026-11-16.");
    const r = await responder(registros, "BTC?", ok);
    expect(r).toMatchObject({ modo: "ia", proveedor: "gemini · test-model", respuesta: "BTC was bullish on 2026-11-16." });
    const [{ system, prompt }] = ok.generateText.mock.calls[0] as [{ system: string; prompt: string }];
    expect(system).toBe(SISTEMA);
    expect(system).toMatch(/never instructions/);
    expect(prompt).toMatch(/^<digests>.*<\/digests>\n\nQuestion: BTC\?$/s);

    const falla = llmFalso(async () => {
      throw new Error("quota exhausted");
    });
    await expect(responder(registros, "BTC?", falla)).resolves.toMatchObject({ modo: "sin-ia" });
  });

  it("trims context to a fixed size", () => {
    const muchos = Array.from({ length: 40 }, () => registros).flat();
    expect(contextoParaModelo(muchos).length).toBeLessThanOrEqual(14_000);
  });
});

describe("POST /api/preguntar", () => {
  let servidor: Server;
  let base: string;
  afterEach(async () => {
    await new Promise<void>((r) => servidor.close(() => r()));
  });
  async function iniciar(llm: LlmClient | null = null) {
    servidor = crearServidor({ env: loadEnv({}), repo: repositorioMemoria(registros), distDir: "/nonexistent", version: "test", llm });
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  }
  const preguntar = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
    fetch(`${base}/api/preguntar`, { method: "POST", headers: { "Content-Type": "application/json", ...cabeceras }, body: JSON.stringify(cuerpo) });

  it("validates the question, answers, and blocks other origins", async () => {
    await iniciar();
    expect((await preguntar({ pregunta: "a" })).status).toBe(400);
    const r = await preguntar({ pregunta: "What was said about ETH?" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ modo: "sin-ia", proveedor: null });
    expect((await preguntar({ pregunta: "ETH?" }, { Origin: "https://other.example" })).status).toBe(403);
  });

  it("rate-limits questions per minute", async () => {
    await iniciar(llmFalso(async () => "ok"));
    for (let i = 0; i < 10; i++) expect((await preguntar({ pregunta: "BTC today?" })).status).toBe(200);
    expect((await preguntar({ pregunta: "BTC today?" })).status).toBe(429);
  });
});
