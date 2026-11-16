import { addDays, isoDay } from "../../lib/dates";
import { createLogger } from "../../lib/logger";
import { ErrorResumen, extraerJson, normalizar } from "../normalizar";
import { hashContenido, type RepositorioNoticias } from "../repositorio";
import { propiedadPorTipo, textoPropiedad, type ClienteNotion, type Pagina } from "./notion";

const log = createLogger("noticias:sync");

export type OpcionesSync = {
  notion: ClienteNotion;
  repo: RepositorioNoticias;
  databaseId: string;
  /** Propiedad de Notion con el correo del dueño de cada resumen (p. ej. "Usuario"). Opcional. */
  propUsuario?: string;
  /** Si se define junto a propUsuario, solo se sincronizan los resúmenes de ese correo. */
  filtroUsuario?: string;
  dias: number;
  hoy?: Date;
};

export type ResultadoSync = {
  leidas: number;
  guardadas: number;
  sin_cambios: number;
  omitidas: number;
  errores: { pagina: string; error: string }[];
};

/** Filtro de Notion: páginas editadas en los últimos N días y, opcionalmente, de un solo dueño. */
export function construirFiltro(o: Pick<OpcionesSync, "propUsuario" | "filtroUsuario" | "dias" | "hoy">): Record<string, unknown> {
  const desde = addDays(isoDay(o.hoy ?? new Date()), -o.dias);
  const condiciones: Record<string, unknown>[] = [{ timestamp: "last_edited_time", last_edited_time: { on_or_after: desde } }];
  if (o.propUsuario && o.filtroUsuario) condiciones.push({ property: o.propUsuario, email: { equals: o.filtroUsuario } });
  return condiciones.length === 1 ? (condiciones[0] as Record<string, unknown>) : { and: condiciones };
}

export function metaDePagina(pagina: Pagina, propUsuario?: string) {
  const props = pagina.properties ?? {};
  const prop = (nombre: string) => textoPropiedad(props[nombre]);
  return {
    titulo: propiedadPorTipo(props, "title"),
    fecha: prop("Fecha") || propiedadPorTipo(props, "date"),
    sesgo: prop("Sesgo general") || prop("Sesgo") || null,
    estado: prop("Estado") || null,
    propietario: propUsuario ? prop(propUsuario).toLowerCase() || null : null,
  };
}

/**
 * Lee la base de resúmenes de Notion, valida cada página y la guarda en el repositorio.
 * El contenido de Notion es evidencia, no instrucciones: solo se extrae el bloque JSON y se valida con zod.
 */
export async function sincronizar(o: OpcionesSync): Promise<ResultadoSync> {
  const paginas = await o.notion.consultar(o.databaseId, construirFiltro(o));
  const r: ResultadoSync = { leidas: paginas.length, guardadas: 0, sin_cambios: 0, omitidas: 0, errores: [] };
  // Un resumen por día: si hay varias páginas para la misma fecha gana la editada más recientemente (vienen ordenadas así).
  const fechasVistas = new Set<string>();
  for (const pagina of paginas) {
    const meta = metaDePagina(pagina, o.propUsuario);
    if (meta.estado && meta.estado.toLowerCase() === "pendiente") {
      r.omitidas++;
      continue;
    }
    try {
      const resumen = normalizar(extraerJson(await o.notion.cuerpo(pagina.id)), meta);
      if (fechasVistas.has(resumen.fecha)) {
        r.omitidas++;
        continue;
      }
      fechasVistas.add(resumen.fecha);
      const previo = await o.repo.obtener(resumen.fecha);
      if (previo && hashContenido(previo.resumen) === hashContenido(resumen) && previo.notion_page_id === pagina.id) {
        r.sin_cambios++;
        continue;
      }
      await o.repo.guardar(
        { fecha: resumen.fecha, notion_page_id: pagina.id, resumen, actualizado: pagina.last_edited_time ?? new Date().toISOString() },
        meta.propietario,
      );
      r.guardadas++;
    } catch (err) {
      const mensaje = err instanceof ErrorResumen ? err.message : `Error inesperado: ${(err as Error).message}`;
      log.warn("página de resumen no válida", { pagina: pagina.id, error: mensaje });
      r.errores.push({ pagina: pagina.id, error: mensaje });
    }
  }
  log.info("sincronización terminada", { ...r, errores: r.errores.length, destino: o.repo.tipo });
  return r;
}
