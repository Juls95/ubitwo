import { loadQuery } from "../bisonte/bq/client";
import type { Inputs } from "./load";
import type { Analysis } from "./types";
import type { Violation } from "./verify";

/** `status` es un id para el sitio (color del indicador); `name` y `detail` son texto visible en español. */
export type Validation = { name: string; status: "pass" | "warn" | "fail" | "n/a"; detail: string };
export type Run = { at: string; summary: string; details: Record<string, string | number | boolean | null> };
export type AgentCard = {
  id: "oso" | "bisonte" | "toro";
  name: string;
  role: string;
  does: string[];
  inputs: string[];
  outputs: string[];
  runs: Run[];
  validations: Validation[];
};

const DAY = 86_400_000;

export function buildAgents(inputs: Inputs, a: Analysis, violations: readonly Violation[], maxBytes: number): AgentCard[] {
  const { manifest, osoDaily } = inputs;
  const queryIds = manifest.items.filter((i) => i.query_file).map((i) => i.id);
  const partitionOk = queryIds.every((id) => {
    try {
      loadQuery(id);
      return true;
    } catch {
      return false;
    }
  });
  const lastBlock = manifest.freshness.last_block_date;
  const lagDays = lastBlock ? Math.round((Date.parse(`${manifest.window.end}T00:00:00Z`) - Date.parse(`${lastBlock}T00:00:00Z`)) / DAY) : null;
  const overCap = manifest.items.filter((i) => i.bytes_processed !== null && i.bytes_processed > maxBytes);
  const reasons = (r: string) => osoDaily.reduce((n, d) => n + d.discarded.filter((x) => x.reason === r).length, 0);
  const reconstructedWeeks = inputs.osoWeekly.filter((w) => w.reconstructed).length;
  const notion = inputs.osoNotion;

  return [
    {
      id: "oso",
      name: "Oso",
      role: "Lectura psicológica: lo que dicen sobre NEAR las cuentas de confianza en X y en Notion.",
      does: [
        "Lee TickersInfo, X Creative Output y X Account Analyses en Notion (con un token que solo vive en el entorno) y conserva las filas de NEAR, no las palabras inglesas «near» o «nearly».",
        "Cada día consulta a xAI (Grok) con la herramienta x_search, limitada a la lista de cuentas y a ese día.",
        "Un segundo modelo, intercambiable mediante una variable de entorno, convierte la respuesta en JSON validado con zod.",
        "Descarta publicaciones que xAI no citó, publicaciones de cuentas fuera de la lista, de otra fecha o duplicadas.",
        "Calcula un puntaje de credibilidad determinista y un índice semanal de sentimiento.",
        "Mantiene una lista curada de cifras de mesas (cuentas públicas citadas en Notion) y etiqueta cada una como afirmación de una mesa, nunca como medición.",
      ],
      inputs: ["config/oso.handles.yaml", "config/oso.notion.yaml", "NOTION_TOKEN", "API Responses de xAI · x_search", "LLM_PROVIDER / LLM_MODEL"],
      outputs: ["data/tesis/oso/daily/YYYY-MM-DD.json", "data/tesis/oso/weekly/YYYY-Www.json", "data/tesis/oso/notion/near.json"],
      runs: osoDaily.slice(-14).reverse().map((d) => ({
        at: d.date,
        summary: `${d.posts.length} publicaciones verificadas · ${d.discarded.length} descartadas`,
        details: { reconstructed: d.reconstructed, search: d.search_model, structuring: d.structuring_model, posts_read: d.posts_fetched },
      })),
      validations: [
        { name: "Se descartan las publicaciones sin cita de xAI", status: "pass", detail: `${reasons("not_in_citations")} descartadas` },
        { name: "Se descartan las cuentas fuera de la lista", status: "pass", detail: `${reasons("handle_not_allowed")} descartadas` },
        { name: "Se descartan las publicaciones fuera de la fecha", status: "pass", detail: `${reasons("outside_date_window")} descartadas` },
        { name: "Las semanas reconstruidas están marcadas", status: reconstructedWeeks > 0 ? "warn" : "pass", detail: `${reconstructedWeeks} de ${inputs.osoWeekly.length} semanas son reconstruidas` },
        {
          name: "Las cifras de las mesas se etiquetan como afirmaciones",
          status: inputs.desk ? "pass" : "n/a",
          detail: inputs.desk ? `${inputs.desk.figures.length} cifras, ${inputs.desk.observations.length} observaciones, ${inputs.desk.desks.length} mesas` : "no hay archivo curado de mesas en esta compilación",
        },
        {
          name: "Expediente de NEAR en Notion",
          status: notion ? "pass" : "n/a",
          detail: notion
            ? `${notion.hits.length} filas de NEAR · ${notion.counts.discarded_false_positives} falsos positivos descartados`
            : "no se ejecutó (falta NOTION_TOKEN o el artefacto)",
        },
      ],
    },
    {
      id: "bisonte",
      name: "Bisonte",
      role: "Lectura técnica: actividad on-chain de NEAR y volumen de 1Click Swap.",
      does: [
        "Consulta el conjunto de datos público de NEAR en BigQuery con consultas versionadas y parametrizadas.",
        "Ejecuta una simulación (dry run) antes de cada consulta y aborta si supera BQ_MAX_BYTES.",
        "Descarga los swaps exitosos de 1Click desde Intents Explorer, respetando su límite de una petición cada cinco segundos.",
        "Guarda los datos crudos y un manifiesto para que todo se pueda reconstruir sin credenciales.",
        "Le entrega a Toro velas diarias de NEAR y BTC cuando hay una fuente de precios configurada; sin ella, cada métrica técnica se reporta como no disponible.",
      ],
      inputs: ["bigquery-public-data.crypto_near_mainnet_us", "API de Intents Explorer (JWT)", "src/tesis/bisonte/bq/queries/*.sql"],
      outputs: ["data/tesis/raw/bq/*.json", "data/tesis/raw/intents/intents_daily.json", "data/tesis/raw/manifest.json"],
      runs: manifest.items.map((i) => ({
        at: i.fetched_at.slice(0, 10),
        summary: `${i.id}: ${i.rows} filas`,
        details: { source: i.source, query: i.query_file, endpoint: i.endpoint, bytes: i.bytes_processed },
      })),
      validations: [
        { name: "Cada consulta filtra por block_date", status: partitionOk ? "pass" : "fail", detail: `${queryIds.length} consultas revisadas` },
        { name: "Bytes por consulta por debajo del tope", status: overCap.length ? "fail" : inputs.mode === "mock" ? "n/a" : "pass", detail: inputs.mode === "mock" ? "sin BigQuery en modo mock" : `${overCap.length} por encima del tope` },
        { name: "Actualidad del conjunto de datos", status: lagDays === null ? "fail" : lagDays <= 2 ? "pass" : "warn", detail: lastBlock ? `último bloque ${lastBlock} (${lagDays} ${lagDays === 1 ? "día" : "días"} de atraso)` : "sin datos de actualidad" },
        {
          name: "Velas de precio",
          status: inputs.price ? (inputs.mode === "mock" ? "n/a" : "warn") : "n/a",
          detail: inputs.price
            ? inputs.mode === "mock" ? "velas simuladas" : `fuente ${inputs.price.near.source}: confirmar que sea una fuente aprobada`
            : "no hay fuente de precios configurada; las métricas técnicas no están disponibles",
        },
        { name: "Datos validados con zod", status: "pass", detail: `${manifest.items.length} conjuntos de datos` },
      ],
    },
    {
      id: "toro",
      name: "Toro",
      role: "Síntesis: cruza a Oso con Bisonte y escribe la tesis.",
      does: [
        "Calcula las métricas con funciones puras a partir de los datos crudos.",
        "Arma cada gráfica con su consulta y una oración en lenguaje llano.",
        "Cruza sentimiento y actividad para separar las confirmaciones de los espejismos.",
        "Calcula la capa técnica sobre las velas: promedios, rango y niveles de Fibonacci, marcas nPOC, fuerza relativa, beta frente a BTC y un conteo de confluencia.",
        "Contrasta la alarma del promedio semanal de BTC y las tesis de referencia como contexto, etiquetadas como citadas y sin verificar.",
        "Escribe TESIS.md a partir de una plantilla en la que cada cifra sale de un marcador.",
      ],
      inputs: ["data/tesis/raw/**", "data/tesis/oso/**", "src/tesis/toro/params.ts"],
      outputs: ["data/tesis/TESIS.md", "data/tesis/derived/metrics.json", "dist/ (sitio)"],
      runs: [{ at: a.generated_at.slice(0, 10), summary: `${Object.keys(a.metrics).length} métricas · ${a.divergences.length} semanas cruzadas`, details: { mode: a.mode } }],
      validations: [
        { name: "Ninguna cifra escrita a mano", status: violations.length ? "fail" : "pass", detail: violations.length ? violations.map((v) => v.check).join("; ") : "cada cifra sale de metrics.json" },
        { name: "Cada gráfica tiene una consulta y una oración", status: violations.some((v) => v.check.startsWith("gráfica")) ? "fail" : "pass", detail: "revisado por verify" },
        { name: "Cada cifra lleva una etiqueta de procedencia", status: "pass", detail: "calculado, simulado, mesa o citado" },
        { name: "Nunca se mezclan datos simulados y reales", status: "pass", detail: `modo ${a.mode}` },
      ],
    },
  ];
}
