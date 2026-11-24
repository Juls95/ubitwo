import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { hasSupabase, type Env } from "../config/env";
import { writeJson } from "../lib/files";
import { requestJson } from "../lib/http";
import { crearDemo } from "./demo";
import { RegistroResumen, ResumenDiario } from "./esquema";

export type TipoRepositorio = "supabase" | "local" | "demo";

export type Consulta = { desde?: string; hasta?: string; limite?: number };

export interface RepositorioNoticias {
  readonly tipo: TipoRepositorio;
  listar(consulta?: Consulta): Promise<RegistroResumen[]>;
  obtener(fecha: string): Promise<RegistroResumen | null>;
  guardar(registro: RegistroResumen, propietario?: string | null): Promise<void>;
  salud(): Promise<{ ok: boolean; detalle: string }>;
}

export const CARPETA_LOCAL = "data/noticias";
const LIMITE_MAX = 400;

export const hashContenido = (r: ResumenDiario): string => createHash("sha256").update(JSON.stringify(r)).digest("hex");

function filtrar(registros: RegistroResumen[], c: Consulta = {}): RegistroResumen[] {
  return registros
    .filter((r) => (!c.desde || r.fecha >= c.desde) && (!c.hasta || r.fecha <= c.hasta))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, Math.min(c.limite ?? LIMITE_MAX, LIMITE_MAX));
}

/** En memoria: la demo, y también un doble de prueba. */
export function repositorioMemoria(inicial: RegistroResumen[], tipo: TipoRepositorio = "demo"): RepositorioNoticias {
  const datos = new Map(inicial.map((r) => [r.fecha, r]));
  return {
    tipo,
    listar: async (c) => filtrar([...datos.values()], c),
    obtener: async (fecha) => datos.get(fecha) ?? null,
    guardar: async (r) => void datos.set(r.fecha, RegistroResumen.parse(r)),
    salud: async () => ({ ok: true, detalle: tipo === "demo" ? "in-memory demo data" : "memory" }),
  };
}

/** Archivos JSON en data/noticias: lo que deja la sincronización cuando todavía no hay Supabase. */
export function repositorioLocal(carpeta = CARPETA_LOCAL): RepositorioNoticias {
  const leerTodo = (): RegistroResumen[] => {
    if (!existsSync(carpeta)) return [];
    return readdirSync(carpeta)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .flatMap((f) => {
        const parsed = RegistroResumen.safeParse(JSON.parse(readFileSync(join(carpeta, f), "utf8")));
        return parsed.success ? [parsed.data] : [];
      });
  };
  return {
    tipo: "local",
    listar: async (c) => filtrar(leerTodo(), c),
    obtener: async (fecha) => leerTodo().find((r) => r.fecha === fecha) ?? null,
    guardar: async (r) => writeJson(join(carpeta, `${r.fecha}.json`), RegistroResumen.parse(r)),
    salud: async () => ({ ok: true, detalle: `${leerTodo().length} digests in ${carpeta}` }),
  };
}

const Fila = z.object({
  fecha: z.string(),
  notion_page_id: z.string().nullable(),
  payload: z.unknown(),
  actualizado: z.string(),
});

/**
 * Supabase por PostgREST con la service role. Solo corre en el servidor: la clave nunca llega al navegador
 * y la tabla tiene RLS activado sin políticas para anon/authenticated.
 */
export function repositorioSupabase(url: string, serviceRoleKey: string, espacio: string, fetchImpl?: typeof fetch): RepositorioNoticias {
  const base = `${url.replace(/\/$/, "")}/rest/v1/resumenes_diarios`;
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const select = "select=fecha,notion_page_id,payload,actualizado";
  const aRegistro = (f: z.infer<typeof Fila>): RegistroResumen[] => {
    const resumen = ResumenDiario.safeParse(f.payload);
    return resumen.success ? [{ fecha: f.fecha.slice(0, 10), notion_page_id: f.notion_page_id, resumen: resumen.data, actualizado: f.actualizado }] : [];
  };
  const consultar = async (params: string[]) => {
    const filas = await requestJson({ url: `${base}?${[select, `espacio_id=eq.${encodeURIComponent(espacio)}`, ...params].join("&")}`, headers, schema: z.array(Fila), fetchImpl });
    return filas.flatMap(aRegistro);
  };
  return {
    tipo: "supabase",
    listar: (c = {}) => {
      const params = ["order=fecha.desc", `limit=${Math.min(c.limite ?? LIMITE_MAX, LIMITE_MAX)}`];
      if (c.desde) params.push(`fecha=gte.${encodeURIComponent(c.desde)}`);
      if (c.hasta) params.push(`fecha=lte.${encodeURIComponent(c.hasta)}`);
      return consultar(params);
    },
    obtener: async (fecha) => (await consultar([`fecha=eq.${encodeURIComponent(fecha)}`, "limit=1"]))[0] ?? null,
    guardar: async (r, propietario = null) => {
      const registro = RegistroResumen.parse(r);
      await requestJson({
        url: `${base}?on_conflict=espacio_id,fecha`,
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: {
          espacio_id: espacio,
          fecha: registro.fecha,
          notion_page_id: registro.notion_page_id,
          payload: registro.resumen,
          tickers: registro.resumen.activos.map((a) => a.ticker),
          hash_contenido: hashContenido(registro.resumen),
          propietario_email: propietario,
          actualizado: registro.actualizado,
        },
        schema: z.null(),
        fetchImpl,
      });
    },
    salud: async () => {
      try {
        await requestJson({ url: `${base}?select=fecha&limit=1`, headers, schema: z.array(z.unknown()), fetchImpl, timeoutMs: 5000 });
        return { ok: true, detalle: "Supabase is responding" };
      } catch {
        return { ok: false, detalle: "Supabase is not responding or migration 0001 is missing" };
      }
    },
  };
}

/** Supabase si está configurado; si no, los archivos de la sincronización local; si no hay ninguno, la demo. */
export function crearRepositorio(env: Env, opciones: { carpeta?: string; hoy?: Date } = {}): RepositorioNoticias {
  if (hasSupabase(env)) return repositorioSupabase(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, env.ESPACIO_ID);
  const carpeta = opciones.carpeta ?? CARPETA_LOCAL;
  if (existsSync(carpeta) && readdirSync(carpeta).some((f) => f.endsWith(".json"))) return repositorioLocal(carpeta);
  return repositorioMemoria(crearDemo(opciones.hoy));
}

/** Destino de la sincronización: nunca la demo. */
export function repositorioDeEscritura(env: Env, carpeta = CARPETA_LOCAL): RepositorioNoticias {
  if (hasSupabase(env)) return repositorioSupabase(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, env.ESPACIO_ID);
  return repositorioLocal(carpeta);
}
