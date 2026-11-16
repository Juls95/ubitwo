import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { loadEnv, type Env } from "../config/env";
import { crearDemo } from "../noticias/demo";
import { repositorioMemoria, type TipoRepositorio } from "../noticias/repositorio";
import { emailPermitido, politicaAcceso, urlRetorno } from "./acceso";
import { crearServidor } from "./index";
import { cookieSesion, firmarSesion, verificarSesion } from "./sesion";
import type { ClienteAuth } from "./supabase-auth";

const SECRETO = "s".repeat(40);
const CONFIG = { SUPABASE_URL: "https://abc.supabase.co", SUPABASE_ANON_KEY: "anon", SESSION_SECRET: SECRETO, EMAILS_PERMITIDOS: "ana@example.org" };

let servidor: Server | undefined;
let base: string;

function authFalso(): ClienteAuth & { enviados: { email: string; crear: boolean }[] } {
  const enviados: { email: string; crear: boolean }[] = [];
  return {
    enviados,
    enviarEnlace: async (email, _r, crear) => void enviados.push({ email, crear }),
    usuario: async (token) => {
      if (token.startsWith("valido-")) return { email: token.slice(7).replace("_", "@") };
      throw new Error("invalid token");
    },
  };
}

async function iniciar(env: Env, fuente: TipoRepositorio, auth: ClienteAuth | null) {
  servidor = crearServidor({ env, repo: repositorioMemoria(crearDemo(new Date("2026-11-16T12:00:00Z")), fuente), distDir: "/nonexistent", auth });
  await new Promise<void>((r) => servidor?.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
}

const post = (ruta: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${ruta}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

afterEach(async () => {
  if (servidor) await new Promise<void>((r) => servidor?.close(() => r()));
  servidor = undefined;
});

describe("signed session", () => {
  it("verifies the signature and expiry", () => {
    const t = firmarSesion("Ana@Example.org", SECRETO, 0);
    expect(verificarSesion(t, SECRETO, 1000)).toMatchObject({ email: "ana@example.org" });
    expect(verificarSesion(t, "otro".repeat(10), 1000)).toBeNull();
    expect(verificarSesion(`${t}x`, SECRETO, 1000)).toBeNull();
    expect(verificarSesion(t, SECRETO, 8 * 24 * 3600 * 1000)).toBeNull();
    expect(verificarSesion("basura", SECRETO)).toBeNull();
  });

  it("the cookie is HttpOnly, SameSite=Lax, and Secure in production", () => {
    expect(cookieSesion("v", true)).toMatch(/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);
    expect(cookieSesion("v", false)).not.toMatch(/Secure/);
  });
});

describe("access policy", () => {
  it.each([
    [{}, "demo", "abierto"],
    [CONFIG, "supabase", "sesion"],
    [{}, "local", "abierto-local"],
    [{ NODE_ENV: "production" }, "supabase", "bloqueado"],
    // An empty allowlist counts as access not configured (fail closed).
    [{ ...CONFIG, EMAILS_PERMITIDOS: "", NODE_ENV: "production" }, "supabase", "bloqueado"],
  ] as const)("%j + %s → %s", (vars, fuente, esperada) => {
    expect(politicaAcceso(loadEnv({ ...vars }), fuente)).toBe(esperada);
  });

  it("an empty list lets nobody in", () => {
    expect(emailPermitido(loadEnv({ ...CONFIG, EMAILS_PERMITIDOS: "" }), "ana@example.org")).toBe(false);
    expect(emailPermitido(loadEnv(CONFIG), "ANA@example.org")).toBe(true);
  });

  it("in production the magic link only returns to APP_URL", () => {
    expect(() => urlRetorno(loadEnv({ NODE_ENV: "production" }))).toThrow(/APP_URL/);
    expect(urlRetorno(loadEnv({ NODE_ENV: "production", APP_URL: "https://ubitwo.onrender.com" }))).toBe("https://ubitwo.onrender.com/login");
  });
});

describe("access routes", () => {
  it("with real data requires a session and issues one after validating the Supabase token", async () => {
    await iniciar(loadEnv({ ...CONFIG, EMAILS_PERMITIDOS: "ana@example.org" }), "supabase", authFalso());
    expect((await fetch(`${base}/api/resumenes`)).status).toBe(401);
    expect((await fetch(`${base}/api/estado`)).status).toBe(200);

    expect((await post("/api/sesion/verificar", { access_token: "valido-bob_example.org" })).status).toBe(403);
    expect((await post("/api/sesion/verificar", { access_token: "malo-xxxxxxxxxxxxxxxxxxxxxx" })).status).toBe(401);
    expect((await post("/api/sesion/verificar", { access_token: "corto" })).status).toBe(400);
    const ok = await post("/api/sesion/verificar", { access_token: "valido-ana_example.org" });
    expect(ok.status).toBe(200);
    const cookie = (ok.headers.get("set-cookie") ?? "").split(";")[0] as string;
    expect((await fetch(`${base}/api/resumenes`, { headers: { cookie } })).status).toBe(200);
    expect((await fetch(`${base}/api/resumenes`, { headers: { cookie: `${cookie}x` } })).status).toBe(401);
  });

  it("full flow: link, verification, cookie, and sign-out", async () => {
    const auth = authFalso();
    auth.usuario = async () => ({ email: "ana@example.org" });
    await iniciar(loadEnv({ ...CONFIG, EMAILS_PERMITIDOS: "ana@example.org" }), "supabase", auth);

    const enlace = await post("/api/sesion/enlace", { email: "Ana@Example.org" });
    expect(enlace.status).toBe(200);
    const intruso = await post("/api/sesion/enlace", { email: "intruso@example.org" });
    expect(await intruso.json()).toEqual(await enlace.json());
    expect(auth.enviados).toEqual([{ email: "ana@example.org", crear: true }]);

    const v = await post("/api/sesion/verificar", { access_token: "t".repeat(40) });
    expect(v.status).toBe(200);
    const cookie = (v.headers.get("set-cookie") ?? "").split(";")[0] as string;
    expect(cookie).toMatch(/^ubitwo_sesion=/);

    const sesion = (await (await fetch(`${base}/api/sesion`, { headers: { cookie } })).json()) as { politica: string; usuario: string };
    expect(sesion).toMatchObject({ politica: "sesion", usuario: "ana@example.org" });
    expect((await fetch(`${base}/api/resumenes`, { headers: { cookie } })).status).toBe(200);

    const salir = await post("/api/sesion/salir", {}, { cookie });
    expect(salir.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("rejects POSTs from another origin and rate-limits link sends", async () => {
    await iniciar(loadEnv(CONFIG), "supabase", authFalso());
    expect((await post("/api/sesion/enlace", { email: "a@example.org" }, { origin: "https://malicioso.example" })).status).toBe(403);
    const estados: number[] = [];
    for (let i = 0; i < 6; i++) estados.push((await post("/api/sesion/enlace", { email: "a@example.org" })).status);
    expect(estados.at(-1)).toBe(429);
    expect((await post("/api/sesion/enlace", { email: "no-es-correo" })).status).toBe(429);
  });

  it("in production without access configured does not serve real data", async () => {
    await iniciar(loadEnv({ NODE_ENV: "production" }), "supabase", null);
    const r = await fetch(`${base}/api/resumenes`);
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: string }).error).toMatch(/SESSION_SECRET/);
  });

  it("the demo is public and needs no session", async () => {
    await iniciar(loadEnv({}), "demo", null);
    expect((await fetch(`${base}/api/resumenes`)).status).toBe(200);
    expect(((await (await fetch(`${base}/api/sesion`)).json()) as { politica: string }).politica).toBe("abierto");
  });
});
