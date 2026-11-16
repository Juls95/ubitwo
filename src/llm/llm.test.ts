import { loadEnv } from "../config/env";
import { createLlmClient, maybeLlmClient } from "./index";

const geminiReply = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const xaiReply = (text: string) => ({ output: [{ type: "message", content: [{ type: "output_text", text }] }] });

function fakeFetch(body: unknown) {
  return jest.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as jest.Mock & typeof fetch;
}

describe("capa LLM intercambiable", () => {
  it("usa Gemini por defecto y pide JSON solo en generateJson", async () => {
    const fetchImpl = fakeFetch(geminiReply("hola"));
    const llm = createLlmClient(loadEnv({ GEMINI_API_KEY: "k", LLM_MODEL: "gemini-x" }), fetchImpl);
    expect(llm.provider).toBe("gemini");
    await expect(llm.generateText({ system: "s", prompt: "p" })).resolves.toBe("hola");
    await llm.generateJson({ system: "s", prompt: "p" });
    const bodies = fetchImpl.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)) as { generationConfig: object });
    expect(bodies[0]?.generationConfig).not.toHaveProperty("responseMimeType");
    expect(bodies[1]?.generationConfig).toHaveProperty("responseMimeType", "application/json");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("gemini-x");
  });

  it("cambia a xAI con LLM_PROVIDER", async () => {
    const fetchImpl = fakeFetch(xaiReply("respuesta"));
    const llm = createLlmClient(loadEnv({ LLM_PROVIDER: "xai", XAI_API_KEY: "k" }), fetchImpl);
    expect(llm.provider).toBe("xai");
    expect(llm.model).toBe("grok-4.7");
    await expect(llm.generateText({ system: "s", prompt: "p" })).resolves.toBe("respuesta");
  });

  it("falla rápido si faltan credenciales", () => {
    expect(() => createLlmClient(loadEnv({}))).toThrow(/GEMINI_API_KEY, LLM_MODEL/);
  });

  it("maybeLlmClient devuelve undefined sin credenciales", () => {
    expect(maybeLlmClient(loadEnv({}))).toBeUndefined();
  });
});
