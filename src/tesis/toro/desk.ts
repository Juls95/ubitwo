import type { OsoNotionSnapshot } from "../esquemas/oso";
import type { DeskSnapshot } from "../esquemas/mercado";
import { pctChange } from "./stats";
import type { AddMetric } from "./technical";
import type { MetricUnit } from "./types";

const DESK_SOURCE = "Notas de mesas en Notion (parafraseadas, curadas)";
const NOTION_SOURCE = "Notion · filas de NEAR";

/** Cifras que pueden citar la plantilla de la tesis y las afirmaciones de las mesas. Las que faltan se muestran como «no disponible». */
const DESK_FIGURES: readonly (readonly [id: string, label: string, unit: MetricUnit])[] = [
  ["near_print_oct15", "Marca de precio de NEAR en TickersInfo (mediados de octubre)", "usd2"],
  ["near_print_oct25", "Marca de precio de NEAR en TickersInfo (finales de octubre)", "usd2"],
  ["near_move_oct25_pct", "Movimiento de NEAR citado por una mesa el día de la venta masiva de octubre", "pct"],
  ["btc_move_oct25_pct", "Movimiento de BTC citado el mismo día", "pct"],
  ["btc_dominance_oct25_pct", "Dominancia de BTC citada el mismo día", "pct"],
  ["omni_exploit_usd", "Monto de la vulneración del puente Omni reportado por una mesa", "usd"],
  ["omni_networks_paused", "Redes con depósitos y retiros pausados tras la vulneración", "count"],
  ["whale_long_sep_usd", "Largo de una ballena en NEAR reportado por Arkham (septiembre)", "usd"],
  ["whale_leverage", "Apalancamiento de ese largo", "count"],
  ["whale_pnl_sep_usd", "Ganancia no realizada de ese largo (septiembre)", "usd"],
  ["whale_long_oct_usd", "Largo de una ballena en NEAR reportado por Arkham (finales de octubre, cota inferior)", "usd"],
  ["whale_pnl_oct_usd", "Ganancia de ese largo (finales de octubre, cota inferior)", "usd"],
  ["whale_btc_shorts_usd", "Cortos que la misma ballena mantiene en las monedas principales", "usd"],
  ["btc_oct25_low_usd", "Mínimo de BTC citado por las mesas el día de la venta masiva de octubre", "usd"],
  ["btc_nov01_usd", "Nivel de BTC citado en el primer resumen de noviembre", "usd"],
  ["btc_nov11_usd", "Nivel de BTC citado en el segundo resumen de noviembre", "usd"],
];

const fig = (desk: DeskSnapshot | null, id: string): number | null => desk?.figures.find((f) => f.id === id)?.value ?? null;

export function registerDesk(desk: DeskSnapshot | null, notion: OsoNotionSnapshot | null, refs: Record<string, number>, add: AddMetric): {
  themes: { id: string; title: string; count: number }[];
} {
  for (const [id, label, unit] of DESK_FIGURES) add(`desk_${id}`, label, fig(desk, id), unit, DESK_SOURCE, undefined, "mesa");
  // Cualquier cifra extra que traiga un archivo curado también se expone, para que las afirmaciones puedan citarla.
  for (const f of desk?.figures ?? []) {
    if (!DESK_FIGURES.some(([id]) => id === f.id)) add(`desk_${f.id}`, f.label, f.value, f.unit, DESK_SOURCE, f.note, "mesa");
  }
  add("desk_near_print_change_pct", "Cambio entre las dos marcas de precio de NEAR", pctChange(fig(desk, "near_print_oct25"), fig(desk, "near_print_oct15")), "pct", DESK_SOURCE, undefined, "mesa");
  const near = fig(desk, "near_move_oct25_pct");
  const btc = fig(desk, "btc_move_oct25_pct");
  add("desk_alt_beta_ratio", "Cuántas veces más cayó NEAR que BTC el día de la venta masiva", near !== null && btc !== null && btc !== 0 ? near / btc : null, "ratio", DESK_SOURCE, undefined, "mesa");
  const tripwire = refs.ref_btc_tripwire_usd ?? null;
  add("desk_btc_vs_ref_tripwire_pct", "Nivel de BTC de la mesa frente al nivel de alarma de referencia", pctChange(fig(desk, "btc_nov11_usd"), tripwire), "pct", DESK_SOURCE, "Un nivel intradía comparado con una regla de cierre semanal: contexto, no un disparador.", "mesa");
  add("desk_count", "Mesas con filas de NEAR en Notion", desk ? desk.desks.length : null, "count", DESK_SOURCE, undefined, "mesa");
  add("desk_observations_count", "Observaciones de mesas curadas", desk ? desk.observations.length : null, "count", DESK_SOURCE, undefined, "mesa");

  const n = notion;
  const nm = (id: string, label: string, value: number | null) => add(id, label, value, "count", NOTION_SOURCE, undefined, "mesa");
  nm("notion_rows_total", "Filas de NEAR leídas en Notion", n ? n.hits.length : null);
  nm("notion_rows_tickers", "Filas de TickersInfo", n ? n.counts.tickers : null);
  nm("notion_rows_creative", "Filas de X Creative Output", n ? n.counts.creative : null);
  nm("notion_rows_analyses", "Filas de X Account Analyses", n ? n.counts.analyses : null);
  nm("notion_false_positives", "Coincidencias falsas de NEAR descartadas", n ? n.counts.discarded_false_positives : null);
  nm("notion_sent_positive", "Filas etiquetadas como positivas", n ? n.sentiment_tally.positive : null);
  nm("notion_sent_neutral", "Filas etiquetadas como neutrales", n ? n.sentiment_tally.neutral : null);
  nm("notion_sent_negative", "Filas etiquetadas como negativas", n ? n.sentiment_tally.negative : null);
  nm("notion_sent_mixed", "Filas etiquetadas como mixtas", n ? n.sentiment_tally.mixed : null);

  const themes = (n?.themes ?? []).map((t) => ({ id: t.id, title: t.title, count: t.evidence_count }));
  for (const t of themes) nm(`notion_theme_${t.id}`, `Filas en el tema: ${t.title}`, t.count);
  return { themes };
}
