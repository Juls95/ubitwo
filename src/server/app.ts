import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { hasLlm, hasNotionNoticias, hasSupabase, hasSupabaseAuth, type Env } from "../config/env";
import { IsoDate } from "../lib/esquemas";
import { createLogger } from "../lib/logger";
import { buscar, estadisticas, historialTicker, resumenTickers } from "../noticias/agregados";
import type { RepositorioNoticias } from "../noticias/repositorio";
import { servirEstatico } from "./estaticos";
import { aplicarCabeceras, crearLimitador, enviarJson, ErrorHttp, ipCliente } from "./utilidades";

const log = createLogger("server");

export type Contexto = { req: IncomingMessage; res: ServerResponse; url: URL; params: Record<string, string>; ip: string };
type Manejador = (ctx: Contexto) => Promise<void> | void;
type Ruta = { metodo: "GET" | "POST"; patron: RegExp; claves: string[]; manejador: Manejador; publica?: boolean };

export type Dependencias = {
  env: Env;
  repo: RepositorioNoticias;
  distDir: string;
  version?: string;
};

const ConsultaResumenes = z.object({
  desde: IsoDate.optional(),
  hasta: IsoDate.optional(),
  limite: z.coerce.number().int().min(1).max(400).optional(),
});
const Ticker = z.string().min(1).max(20).regex(/^[A-Za-z0-9 .\-/]+$/, "ticker inválido");
const ConsultaBusqueda = z.object({ q: z.string().trim().min(2, "escribe al menos dos letras").max(120) });

export function parsear<T>(schema: z.ZodType<T>, valor: unknown): T {
  const r = schema.safeParse(valor);
  if (!r.success) throw new ErrorHttp(400, r.error.issues.map((i) => i.message).join("; "));
  return r.data;
}

export class Enrutador {
  private readonly rutas: Ruta[] = [];

  agregar(metodo: Ruta["metodo"], camino: string, manejador: Manejador, opciones: { publica?: boolean } = {}): this {
    const claves: string[] = [];
    const patron = new RegExp(`^${camino.replace(/:([a-z_]+)/g, (_m, k: string) => (claves.push(k), "([^/]+)"))}$`);
    this.rutas.push({ metodo, patron, claves, manejador, publica: opciones.publica });
    return this;
  }

  buscar(metodo: string, camino: string): { ruta: Ruta; params: Record<string, string> } | "metodo" | null {
    let otroMetodo = false;
    for (const ruta of this.rutas) {
      const m = ruta.patron.exec(camino);
      if (!m) continue;
      if (ruta.metodo !== metodo && !(metodo === "HEAD" && ruta.metodo === "GET")) {
        otroMetodo = true;
        continue;
      }
      const params: Record<string, string> = {};
      ruta.claves.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1] ?? "");
      });
      return { ruta, params };
    }
    return otroMetodo ? "metodo" : null;
  }
}

/** Rutas de lectura del panel de noticias. */
export function rutasNoticias(enrutador: Enrutador, d: Dependencias): Enrutador {
  const { repo, env } = d;
  return enrutador
    .agregar("GET", "/healthz", ({ res }) => enviarJson(res, 200, { ok: true }), { publica: true })
    .agregar(
      "GET",
      "/readyz",
      async ({ res }) => {
        const s = await repo.salud();
        enviarJson(res, s.ok ? 200 : 503, { ok: s.ok, fuente: repo.tipo });
      },
      { publica: true },
    )
    .agregar(
      "GET",
      "/api/estado",
      ({ res }) =>
        enviarJson(res, 200, {
          version: d.version ?? "dev",
          fuente: repo.tipo,
          demo: repo.tipo === "demo",
          notion: hasNotionNoticias(env),
          ia: { disponible: hasLlm(env), proveedor: env.LLM_PROVIDER },
          // Solo booleanos: dicen qué falta conectar sin revelar ningún valor.
          conexiones: {
            supabase: hasSupabase(env),
            acceso: hasSupabaseAuth(env) && Boolean(env.SESSION_SECRET) && env.EMAILS_PERMITIDOS.length > 0,
            notion: hasNotionNoticias(env),
            ia: hasLlm(env),
            app_url: Boolean(env.APP_URL),
          },
        }),
      { publica: true },
    )
    .agregar("GET", "/api/resumenes", async ({ res, url }) => {
      const q = parsear(ConsultaResumenes, Object.fromEntries(url.searchParams));
      enviarJson(res, 200, { resumenes: await repo.listar(q) });
    })
    .agregar("GET", "/api/resumenes/:fecha", async ({ res, params }) => {
      const fecha = parsear(IsoDate, params.fecha);
      const r = await repo.obtener(fecha);
      if (!r) throw new ErrorHttp(404, `No hay resumen para el ${fecha}`);
      enviarJson(res, 200, r);
    })
    .agregar("GET", "/api/estadisticas", async ({ res }) => enviarJson(res, 200, estadisticas(await repo.listar())))
    .agregar("GET", "/api/tickers", async ({ res }) => enviarJson(res, 200, { tickers: resumenTickers(await repo.listar()) }))
    .agregar("GET", "/api/tickers/:ticker", async ({ res, params }) => {
      const ticker = parsear(Ticker, params.ticker).toUpperCase();
      const historial = historialTicker(await repo.listar(), ticker);
      if (historial.length === 0) throw new ErrorHttp(404, `No hay menciones de ${ticker}`);
      enviarJson(res, 200, { ticker, historial });
    })
    .agregar("GET", "/api/buscar", async ({ res, url }) => {
      const { q } = parsear(ConsultaBusqueda, { q: url.searchParams.get("q") ?? "" });
      enviarJson(res, 200, { consulta: q, resultados: buscar(await repo.listar(), q) });
    });
}

export type Guardia = (ctx: Contexto) => Promise<void>;

/**
 * Crea el manejador HTTP. `guardia` decide si una ruta privada puede responder (lanza ErrorHttp 401/403 si no).
 * Toda respuesta lleva las cabeceras de seguridad; los errores inesperados se registran completos y se responden genéricos.
 */
export function crearManejador(d: Dependencias, enrutador: Enrutador, guardia: Guardia = async () => undefined) {
  const limitador = crearLimitador(d.env.LIMITE_PETICIONES_POR_MINUTO);
  const confiarEnProxy = d.env.NODE_ENV === "production";
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    aplicarCabeceras(res);
    const metodo = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");
    const ip = ipCliente(req, confiarEnProxy);
    const esApi = url.pathname.startsWith("/api/");
    try {
      if (esApi) {
        const limite = limitador.permitir(ip);
        if (!limite.ok) {
          enviarJson(res, 429, { error: "Demasiadas peticiones. Intenta de nuevo en un momento." }, { "Retry-After": String(limite.reintentarEn) });
          return;
        }
      }
      const encontrada = enrutador.buscar(metodo, url.pathname);
      if (encontrada === "metodo") throw new ErrorHttp(405, "Método no permitido");
      if (encontrada) {
        const ctx: Contexto = { req, res, url, params: encontrada.params, ip };
        if (!encontrada.ruta.publica) await guardia(ctx);
        await encontrada.ruta.manejador(ctx);
        return;
      }
      if (esApi) throw new ErrorHttp(404, "Ruta no encontrada");
      if ((metodo === "GET" || metodo === "HEAD") && servirEstatico(d.distDir, url.pathname, res, metodo)) return;
      if (metodo !== "GET" && metodo !== "HEAD") throw new ErrorHttp(405, "Método no permitido");
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado. ¿Ejecutaste pnpm build?");
    } catch (err) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (err instanceof ErrorHttp) {
        enviarJson(res, err.status, { error: err.message });
        return;
      }
      log.error("error no controlado", { metodo, ruta: url.pathname, query: url.search, ip, error: (err as Error).stack ?? String(err) });
      enviarJson(res, 500, { error: "Error interno. Revisa los logs del servidor." });
    }
  };
}
