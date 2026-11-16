import { z } from "zod";
import { RegistroResumen, Postura, TipoActivo, Activo, Sesgo } from "../../../src/noticias/esquema";

/** API error with HTTP status so the UI can tell "sign in" from "something failed". */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

const CuerpoError = z.object({ error: z.string() });

export const Estado = z.object({
  version: z.string(),
  fuente: z.enum(["supabase", "local", "demo"]),
  demo: z.boolean(),
  notion: z.boolean(),
  ia: z.object({ disponible: z.boolean(), proveedor: z.string() }),
  conexiones: z
    .object({ supabase: z.boolean(), acceso: z.boolean(), notion: z.boolean(), ia: z.boolean(), app_url: z.boolean() })
    .optional(),
});
export type Estado = z.infer<typeof Estado>;

export const Sesion = z.object({
  politica: z.enum(["abierto", "sesion", "abierto-local", "bloqueado"]),
  usuario: z.string().nullable(),
  acceso_configurado: z.boolean(),
});
export type Sesion = z.infer<typeof Sesion>;

export const ResumenTicker = z.object({
  ticker: z.string(),
  tipo: TipoActivo,
  dias: z.number(),
  ultima_fecha: z.string(),
  ultima_postura: Postura,
  posturas: z.record(Postura, z.number()),
  cuentas: z.number(),
  ultimo_resumen: z.string(),
});
export type ResumenTicker = z.infer<typeof ResumenTicker>;

export const Estadisticas = z.object({
  resumenes: z.number(),
  desde: z.string().nullable(),
  hasta: z.string().nullable(),
  tickers: z.number(),
  cuentas: z.number(),
  sesgos: z.record(Sesgo, z.number()),
});
export type Estadisticas = z.infer<typeof Estadisticas>;

export const Historial = z.object({
  ticker: z.string(),
  historial: z.array(z.object({ fecha: z.string(), sesgo_del_dia: Sesgo, activo: Activo })),
});
export type Historial = z.infer<typeof Historial>;

export const Busqueda = z.object({
  consulta: z.string(),
  resultados: z.array(z.object({ fecha: z.string(), ticker: z.string().nullable(), texto: z.string(), url: z.string().nullable(), cuenta: z.string().nullable() })),
});
export type Busqueda = z.infer<typeof Busqueda>;

export const Respuesta = z.object({
  respuesta: z.string(),
  modo: z.enum(["ia", "sin-ia"]),
  proveedor: z.string().nullable(),
  fuentes: z.array(z.object({ fecha: z.string(), ticker: z.string().nullable() })),
});
export type Respuesta = z.infer<typeof Respuesta>;

type Opciones = { metodo?: "GET" | "POST"; cuerpo?: unknown; fetchImpl?: typeof fetch };

/** Typed fetch wrapper: validates each response with zod and turns failures into ErrorApi with an English message. */
export async function pedir<T>(ruta: string, schema: z.ZodType<T>, { metodo = "GET", cuerpo, fetchImpl = fetch }: Opciones = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(ruta, {
      method: metodo,
      credentials: "same-origin",
      headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, "No connection to the server. Is pnpm start running?");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = CuerpoError.safeParse(json);
    throw new ErrorApi(res.status, e.success ? e.data.error : `The server responded with ${res.status}`);
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    window.dispatchEvent(new CustomEvent("ubitwo:error", { detail: { ruta, status: res.status, issues: r.error.issues.slice(0, 5) } }));
    throw new ErrorApi(res.status, `Unexpected response from ${ruta}. Are the server and page the same version?`);
  }
  return r.data;
}

export const api = {
  estado: () => pedir("/api/estado", Estado),
  sesion: () => pedir("/api/sesion", Sesion),
  resumenes: (limite = 60) => pedir(`/api/resumenes?limite=${limite}`, z.object({ resumenes: z.array(RegistroResumen) })).then((r) => r.resumenes),
  estadisticas: () => pedir("/api/estadisticas", Estadisticas),
  tickers: () => pedir("/api/tickers", z.object({ tickers: z.array(ResumenTicker) })).then((r) => r.tickers),
  ticker: (t: string) => pedir(`/api/tickers/${encodeURIComponent(t)}`, Historial),
  buscar: (q: string) => pedir(`/api/buscar?q=${encodeURIComponent(q)}`, Busqueda),
  pedirEnlace: (email: string) => pedir("/api/sesion/enlace", z.object({ ok: z.boolean(), mensaje: z.string() }), { metodo: "POST", cuerpo: { email } }),
  verificar: (access_token: string) => pedir("/api/sesion/verificar", z.object({ ok: z.boolean(), usuario: z.string() }), { metodo: "POST", cuerpo: { access_token } }),
  salir: () => pedir("/api/sesion/salir", z.object({ ok: z.boolean() }), { metodo: "POST", cuerpo: {} }),
  preguntar: (pregunta: string) => pedir("/api/preguntar", Respuesta, { metodo: "POST", cuerpo: { pregunta } }),
};
