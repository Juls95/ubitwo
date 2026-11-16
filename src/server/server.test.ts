import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv } from "../config/env";
import { crearDemo } from "../noticias/demo";
import { repositorioMemoria } from "../noticias/repositorio";
import { resolverDentro } from "./estaticos";
import { crearServidor } from "./index";
import { crearLimitador, leerCookies } from "./utilidades";

let dist: string;
let servidor: Server;
let base: string;

async function iniciar(env = loadEnv({})) {
  servidor = crearServidor({ env, repo: repositorioMemoria(crearDemo(new Date("2026-11-16T12:00:00Z"))), distDir: dist, version: "test" });
  await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), "ubitwo-dist-"));
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "index.html"), "<!doctype html><title>ubitwo</title>");
  writeFileSync(join(dist, "assets", "app-abc.js"), "1");
});
afterEach(async () => {
  await new Promise<void>((r) => servidor.close(() => r()));
  rmSync(dist, { recursive: true, force: true });
});

describe("servidor", () => {
  it("responde salud y estado con cabeceras de seguridad", async () => {
    await iniciar();
    const r = await fetch(`${base}/healthz`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    const estado = (await (await fetch(`${base}/api/estado`)).json()) as { demo: boolean; fuente: string; ia: { disponible: boolean } };
    expect(estado).toMatchObject({ demo: true, fuente: "demo", ia: { disponible: false } });
    expect((await fetch(`${base}/readyz`)).status).toBe(200);
  });

  it("sirve resúmenes, tickers, historial, estadísticas y búsqueda", async () => {
    await iniciar();
    const res = (await (await fetch(`${base}/api/resumenes?limite=2`)).json()) as { resumenes: { fecha: string }[] };
    expect(res.resumenes.map((r) => r.fecha)).toEqual(["2026-11-16", "2026-11-15"]);
    expect((await fetch(`${base}/api/resumenes/2026-11-12`)).status).toBe(200);
    expect((await fetch(`${base}/api/resumenes/2020-01-01`)).status).toBe(404);
    const t = (await (await fetch(`${base}/api/tickers`)).json()) as { tickers: { ticker: string }[] };
    expect(t.tickers[0]?.ticker).toBe("BTC");
    const h = (await (await fetch(`${base}/api/tickers/${encodeURIComponent("cripto top100")}`)).json()) as { ticker: string };
    expect(h.ticker).toBe("CRIPTO TOP100");
    expect((await fetch(`${base}/api/estadisticas`)).status).toBe(200);
    const b = (await (await fetch(`${base}/api/buscar?q=inflación`)).json()) as { resultados: unknown[] };
    expect(b.resultados.length).toBeGreaterThan(0);
  });

  it("valida la entrada y responde errores en español", async () => {
    await iniciar();
    const r = await fetch(`${base}/api/resumenes?desde=ayer`);
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toMatch(/AAAA-MM-DD/);
    expect((await fetch(`${base}/api/buscar?q=a`)).status).toBe(400);
    expect((await fetch(`${base}/api/tickers/%3Cscript%3E`)).status).toBe(400);
    expect((await fetch(`${base}/api/no-existe`)).status).toBe(404);
    expect((await fetch(`${base}/api/tickers`, { method: "POST" })).status).toBe(405);
  });

  it("sirve la SPA y nunca sale de dist", async () => {
    await iniciar();
    expect(await (await fetch(`${base}/noticias/BTC`)).text()).toContain("ubitwo");
    const asset = await fetch(`${base}/assets/app-abc.js`);
    expect(asset.headers.get("cache-control")).toContain("immutable");
    expect((await fetch(`${base}/assets/no-existe.js`)).status).toBe(404);
    expect((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status).not.toBe(500);
    expect(resolverDentro(dist, "/../../etc/passwd")?.startsWith(dist)).toBe(true);
    expect(resolverDentro(dist, "/%2e%2e/%2e%2e/etc/passwd")?.startsWith(dist)).toBe(true);
  });

  it("limita las peticiones por minuto a la API", async () => {
    await iniciar(loadEnv({ LIMITE_PETICIONES_POR_MINUTO: "2" }));
    expect((await fetch(`${base}/api/estado`)).status).toBe(200);
    expect((await fetch(`${base}/api/estado`)).status).toBe(200);
    const r = await fetch(`${base}/api/estado`);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBeTruthy();
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });
});

describe("utilidades", () => {
  it("el limitador reinicia la ventana cada minuto", () => {
    let t = 0;
    const l = crearLimitador(1, () => t);
    expect(l.permitir("a").ok).toBe(true);
    expect(l.permitir("a").ok).toBe(false);
    expect(l.permitir("b").ok).toBe(true);
    t = 60_000;
    expect(l.permitir("a").ok).toBe(true);
  });

  it("lee cookies y tolera valores mal codificados", () => {
    const req = { headers: { cookie: "a=1; b=%E0%A4%A; c=hola%20mundo" } } as never;
    expect(leerCookies(req)).toEqual({ a: "1", c: "hola mundo" });
  });
});
