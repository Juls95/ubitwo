import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv } from "../config/env";
import { crearDemo } from "./demo";
import { crearRepositorio, repositorioDeEscritura, repositorioLocal, repositorioMemoria, repositorioSupabase } from "./repositorio";

const demo = crearDemo(new Date("2026-11-16T12:00:00Z"));
const primero = demo[0] as (typeof demo)[number];
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ubitwo-noticias-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("repositorio en memoria", () => {
  it("filtra por rango y ordena del más reciente al más antiguo", async () => {
    const repo = repositorioMemoria(demo);
    const r = await repo.listar({ desde: "2026-11-13", hasta: "2026-11-15" });
    expect(r.map((x) => x.fecha)).toEqual(["2026-11-15", "2026-11-14", "2026-11-13"]);
    expect(await repo.obtener("2026-11-16")).not.toBeNull();
    expect((await repo.listar({ limite: 2 })).length).toBe(2);
  });
});

describe("repositorio local", () => {
  it("guarda y vuelve a leer, ignorando archivos inválidos", async () => {
    const repo = repositorioLocal(dir);
    for (const r of demo) await repo.guardar(r);
    writeFileSync(join(dir, "2026-01-01.json"), JSON.stringify({ basura: true }));
    expect((await repo.listar()).length).toBe(5);
    expect((await repo.obtener("2026-11-12"))?.resumen.sesgo).toBe("alcista");
  });
});

describe("selección de repositorio", () => {
  it("usa la demo cuando no hay nada configurado", () => {
    expect(crearRepositorio(loadEnv({}), { carpeta: dir }).tipo).toBe("demo");
  });

  it("usa los archivos locales cuando la sincronización ya escribió algo", async () => {
    await repositorioLocal(dir).guardar(primero);
    expect(crearRepositorio(loadEnv({}), { carpeta: dir }).tipo).toBe("local");
  });

  it("usa Supabase cuando hay URL y service role", () => {
    const env = loadEnv({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" });
    expect(crearRepositorio(env, { carpeta: dir }).tipo).toBe("supabase");
    expect(repositorioDeEscritura(env, dir).tipo).toBe("supabase");
  });

  it("la sincronización nunca escribe en la demo", () => {
    expect(repositorioDeEscritura(loadEnv({}), dir).tipo).toBe("local");
  });
});

describe("repositorio Supabase", () => {
  const filas = demo.map((r) => ({ fecha: r.fecha, notion_page_id: null, payload: r.resumen, actualizado: r.actualizado }));

  it("consulta PostgREST filtrando por espacio y valida cada fila", async () => {
    const fetchImpl = jest.fn().mockImplementation(async () => new Response(JSON.stringify([...filas, { ...filas[0], payload: { roto: true } }]))) as jest.Mock;
    const repo = repositorioSupabase("https://abc.supabase.co/", "service", "principal", fetchImpl as unknown as typeof fetch);
    const r = await repo.listar({ desde: "2026-11-13", limite: 10 });
    expect(r).toHaveLength(5);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/rest/v1/resumenes_diarios?");
    expect(url).toContain("espacio_id=eq.principal");
    expect(url).toContain("fecha=gte.2026-11-13");
    expect((fetchImpl.mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({ apikey: "service" });
  });

  it("hace upsert por (espacio_id, fecha) con hash y tickers", async () => {
    const fetchImpl = jest.fn().mockImplementation(async () => new Response("", { status: 201 })) as jest.Mock;
    const repo = repositorioSupabase("https://abc.supabase.co", "service", "principal", fetchImpl as unknown as typeof fetch);
    await repo.guardar(primero, "ana@example.org");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("on_conflict=espacio_id,fecha");
    expect((init.headers as Record<string, string>).Prefer).toContain("merge-duplicates");
    const body = JSON.parse(String(init.body)) as { tickers: string[]; hash_contenido: string; propietario_email: string };
    expect(body.tickers).toContain("BTC");
    expect(body.hash_contenido).toMatch(/^[0-9a-f]{64}$/);
    expect(body.propietario_email).toBe("ana@example.org");
  });

  it("reporta salud sin lanzar", async () => {
    const fetchImpl = jest.fn().mockImplementation(async () => new Response("{}", { status: 404 })) as unknown as typeof fetch;
    await expect(repositorioSupabase("https://abc.supabase.co", "s", "principal", fetchImpl).salud()).resolves.toMatchObject({ ok: false });
  });
});

describe("migración SQL", () => {
  const sql = readFileSync("supabase/migrations/0001_noticias.sql", "utf8");

  it("activa RLS y quita permisos a anon y authenticated", () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/REVOKE ALL ON public\.resumenes_diarios FROM anon, authenticated/);
    expect(sql).not.toMatch(/CREATE POLICY/);
  });

  it("garantiza un resumen por día y espacio", () => {
    expect(sql).toMatch(/UNIQUE \(espacio_id, fecha\)/);
  });
});
