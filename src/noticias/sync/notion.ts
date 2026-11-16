import { z } from "zod";
import { requestJson } from "../../lib/http";

export const NOTION_API = "https://api.notion.com/v1";
/** Notion admite unas tres peticiones por segundo; nos quedamos por debajo. */
export const INTERVALO_MS = 350;

const Pagina = z.looseObject({
  id: z.string(),
  last_edited_time: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});
export type Pagina = z.infer<typeof Pagina>;

const Lista = <T extends z.ZodType>(item: T) => z.object({ results: z.array(item), has_more: z.boolean(), next_cursor: z.string().nullable() });

const Bloque = z.looseObject({ id: z.string(), type: z.string() });

export type ClienteNotion = {
  consultar(databaseId: string, filtro?: Record<string, unknown>, maxPaginas?: number): Promise<Pagina[]>;
  cuerpo(pageId: string): Promise<string>;
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function textos(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return items.map((t) => (t && typeof t === "object" && "plain_text" in t ? String((t as { plain_text: unknown }).plain_text) : "")).join("");
}

/** Una propiedad de Notion como texto plano. Los tipos desconocidos quedan en "". */
export function textoPropiedad(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as Record<string, unknown>;
  const nombre = (v: unknown) => (v && typeof v === "object" && "name" in v ? String((v as { name: unknown }).name ?? "") : "");
  switch (p.type) {
    case "title":
      return textos(p.title);
    case "rich_text":
      return textos(p.rich_text);
    case "select":
      return nombre(p.select);
    case "status":
      return nombre(p.status);
    case "multi_select":
      return Array.isArray(p.multi_select) ? p.multi_select.map(nombre).filter(Boolean).join(", ") : "";
    case "email":
      return typeof p.email === "string" ? p.email : "";
    case "number":
      return typeof p.number === "number" ? String(p.number) : "";
    case "date":
      return p.date && typeof p.date === "object" && typeof (p.date as { start?: unknown }).start === "string" ? String((p.date as { start: string }).start).slice(0, 10) : "";
    case "people":
      return Array.isArray(p.people)
        ? p.people.map((x) => (x && typeof x === "object" && "person" in x ? String((x as { person?: { email?: string } }).person?.email ?? "") : "")).filter(Boolean).join(", ")
        : "";
    default:
      return "";
  }
}

/** El valor de la primera propiedad de un tipo dado (p. ej. el título, sin depender de cómo se llame la columna). */
export function propiedadPorTipo(props: Record<string, unknown>, tipo: string): string {
  const p = Object.values(props).find((v) => v && typeof v === "object" && (v as { type?: unknown }).type === tipo);
  return textoPropiedad(p);
}

/** Texto de un bloque. Los bloques de código se reconstruyen como ```lenguaje para que `extraerJson` los encuentre. */
export function textoBloque(bloque: z.infer<typeof Bloque>): string {
  const datos = (bloque as Record<string, unknown>)[bloque.type];
  if (!datos || typeof datos !== "object") return "";
  const texto = textos((datos as { rich_text?: unknown }).rich_text);
  if (bloque.type === "code") {
    const lenguaje = String((datos as { language?: unknown }).language ?? "");
    return `\`\`\`${lenguaje === "json" ? "json" : ""}\n${texto}\n\`\`\``;
  }
  return texto;
}

export function crearClienteNotion(token: string, version: string, fetchImpl?: typeof fetch, sleep = dormir): ClienteNotion {
  const headers = { Authorization: `Bearer ${token}`, "Notion-Version": version };
  return {
    async consultar(databaseId, filtro, maxPaginas = 20) {
      const out: Pagina[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < maxPaginas; i++) {
        const body: Record<string, unknown> = { page_size: 100, sorts: [{ timestamp: "last_edited_time", direction: "descending" }] };
        if (filtro) body.filter = filtro;
        if (cursor) body.start_cursor = cursor;
        const lote = await requestJson({ url: `${NOTION_API}/databases/${encodeURIComponent(databaseId)}/query`, method: "POST", headers, body, schema: Lista(Pagina), fetchImpl });
        out.push(...lote.results);
        if (!lote.has_more || !lote.next_cursor) break;
        cursor = lote.next_cursor;
        await sleep(INTERVALO_MS);
      }
      return out;
    },
    async cuerpo(pageId) {
      const partes: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 10; i++) {
        const q = `page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ""}`;
        const lote = await requestJson({ url: `${NOTION_API}/blocks/${encodeURIComponent(pageId)}/children?${q}`, headers, schema: Lista(Bloque), fetchImpl });
        partes.push(...lote.results.map(textoBloque));
        if (!lote.has_more || !lote.next_cursor) break;
        cursor = lote.next_cursor;
        await sleep(INTERVALO_MS);
      }
      return partes.filter(Boolean).join("\n");
    },
  };
}
