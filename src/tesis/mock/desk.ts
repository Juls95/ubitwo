import { OsoNotionHit, OsoNotionSnapshot } from "../esquemas/oso";
import { DeskSnapshot } from "../esquemas/mercado";
import { summarize } from "../oso/notion/summarize";

/**
 * Notas de mesas de ejemplo. Los hechos de abajo se leyeron en las tres tablas de Notion del autor (TickersInfo, X Creative
 * Output, X Account Analyses) y están parafraseados: no se copia texto de ninguna publicación ni se conserva ningún campo privado.
 * Se etiquetan como «mesa» en todas partes porque son afirmaciones de cuentas públicas, no mediciones.
 */
export const DESK_ANCHORS = {
  nearPrint: { date: "2026-10-25", close: 4.45 },
  btcPrint: { date: "2026-11-01", close: 77_600 },
  nearPins: [{ date: "2026-10-15", close: 4.6 }, { date: "2026-10-25", close: 4.45 }],
  btcPins: [{ date: "2026-11-01", close: 77_600 }, { date: "2026-11-11", close: 71_500 }],
} as const;

const DESKS = ["CastilloTrading", "Nebraskangooner", "Zeneca", "arkham", "TradingLatino", "IncomeSharks", "MessariCrypto"] as const;

const FIGURES = [
  { id: "near_print_oct15", label: "Marca de precio de NEAR en TickersInfo (mediados de octubre)", value: 4.6, unit: "usd2", as_of: "2026-10-15", note: "Precio spot aproximado citado junto a un comentario de gráfica." },
  { id: "near_print_oct25", label: "Marca de precio de NEAR en TickersInfo (finales de octubre)", value: DESK_ANCHORS.nearPrint.close, unit: "usd2", as_of: DESK_ANCHORS.nearPrint.date },
  { id: "near_move_oct25_pct", label: "Movimiento de NEAR citado el día de la venta masiva", value: -5.4, unit: "pct", as_of: "2026-10-25" },
  { id: "btc_move_oct25_pct", label: "Movimiento de BTC citado el mismo día", value: -0.9, unit: "pct", as_of: "2026-10-25" },
  { id: "btc_dominance_oct25_pct", label: "Dominancia de BTC citada el mismo día", value: 60.13, unit: "pct", as_of: "2026-10-25" },
  { id: "omni_exploit_usd", label: "Monto de la vulneración del puente Omni reportado por una mesa", value: 3_800_000, unit: "usd", as_of: "2026-10-02", note: "Aproximado." },
  { id: "omni_networks_paused", label: "Redes con depósitos y retiros pausados", value: 11, unit: "count", as_of: "2026-10-02" },
  { id: "whale_long_sep_usd", label: "Largo de una ballena en NEAR reportado por Arkham (septiembre)", value: 29_700_000, unit: "usd", as_of: "2026-09-26" },
  { id: "whale_leverage", label: "Apalancamiento de ese largo", value: 10, unit: "count", as_of: "2026-09-26" },
  { id: "whale_pnl_sep_usd", label: "Ganancia no realizada de ese largo (septiembre)", value: 16_000_000, unit: "usd", as_of: "2026-09-26", note: "Aproximado." },
  { id: "whale_long_oct_usd", label: "Largo de una ballena en NEAR (finales de octubre, cota inferior)", value: 25_000_000, unit: "usd", as_of: "2026-10-26", note: "Reportado como «más de»." },
  { id: "whale_pnl_oct_usd", label: "Ganancia de ese largo (finales de octubre, cota inferior)", value: 10_000_000, unit: "usd", as_of: "2026-10-26", note: "Reportado como «más de»." },
  { id: "whale_btc_shorts_usd", label: "Cortos que la misma ballena mantiene en las monedas principales", value: 13_100_000, unit: "usd", as_of: "2026-10-26" },
  { id: "btc_oct25_low_usd", label: "Mínimo de BTC citado el día de la venta masiva", value: 79_220, unit: "usd", as_of: "2026-10-25" },
  { id: "btc_nov01_usd", label: "Nivel de BTC citado en el primer resumen de noviembre", value: DESK_ANCHORS.btcPrint.close, unit: "usd", as_of: DESK_ANCHORS.btcPrint.date, note: "Aproximado." },
  { id: "btc_nov11_usd", label: "Nivel de BTC citado en el segundo resumen de noviembre", value: 71_500, unit: "usd", as_of: "2026-11-11", note: "Aproximado; el resumen lo describe como soporte dentro de un rango." },
] as const;

const OBSERVATIONS = [
  { id: "sep07_breakout", date: "2026-09-07", desk: "X Creative Output", topic: "setup", claim: "El resumen diario señala que NEAR rompe por encima de la resistencia." },
  { id: "sep18_base", date: "2026-09-18", desk: "Nebraskangooner", topic: "setup", claim: "Incluye a NEAR entre las gráficas constructivas; el resumen habla de una base semanal en formación." },
  { id: "sep22_bottoms", date: "2026-09-22", desk: "CastilloTrading", topic: "setup", claim: "Menciona a NEAR entre los posibles pisos, junto a varias otras altcoins grandes." },
  { id: "sep26_whale", date: "2026-09-26", desk: "arkham", topic: "positioning", claim: "Una billetera ballena rastreada por Arkham mantiene un largo en NEAR de {{metric:desk_whale_long_sep_usd}} con un apalancamiento de {{metric:desk_whale_leverage}} veces y cerca de {{metric:desk_whale_pnl_sep_usd}} de ganancia no realizada." },
  { id: "sep30_bottom", date: "2026-09-30", desk: "Nebraskangooner", topic: "setup", claim: "Llama a NEAR un piso gigante, con una vela mensual fuerte." },
  { id: "oct01_rs", date: "2026-10-01", desk: "Zeneca", topic: "setup", claim: "Incluye a NEAR entre los nombres que muestran fuerza relativa durante las correcciones." },
  { id: "oct02_exploit", date: "2026-10-02", desk: "TradingLatino", topic: "exploit", claim: "Reporta una vulneración del puente Omni de unos {{metric:desk_omni_exploit_usd}} en NEAR Intents; los depósitos y retiros se pausaron en {{metric:desk_omni_networks_paused}} redes y se prometieron reembolsos. Después se restableció el servicio y el incidente se acotó a una sola ruta de stablecoins. La mesa afirma que la cadena y el token de NEAR no se vieron afectados." },
  { id: "oct08_conviction", date: "2026-10-08", desk: "Zeneca", topic: "positioning", claim: "Incluye a NEAR en una lista de convicción de diez nombres para el ciclo." },
  { id: "oct16_brave", date: "2026-10-16", desk: "Zeneca", topic: "partnership", claim: "Reporta una alianza entre NEAR y Brave (con una muestra escasa de publicaciones)." },
  { id: "oct25_selloff", date: "2026-10-25", desk: "Nebraskangooner", topic: "macro", claim: "Las altcoins cayeron más que BTC: NEAR {{metric:desk_near_move_oct25_pct}} frente a BTC {{metric:desk_btc_move_oct25_pct}}, con la dominancia de BTC en {{metric:desk_btc_dominance_oct25_pct}}." },
  { id: "oct26_whale", date: "2026-10-26", desk: "arkham", topic: "positioning", claim: "La misma ballena reporta más de {{metric:desk_whale_pnl_oct_usd}} de ganancia en un largo en NEAR superior a {{metric:desk_whale_long_oct_usd}}, mientras mantiene {{metric:desk_whale_btc_shorts_usd}} en cortos sobre las monedas principales." },
  { id: "oct28_green", date: "2026-10-28", desk: "CastilloTrading", topic: "setup", claim: "Reporta que el pequeño largo en NEAR, que mantiene junto con ZRO, HYPE y ONDO, va en ganancia, y conserva un sesgo alcista de corto plazo ligado a un nivel nPOC de BTC." },
] as const;

export function mockDesk(generatedAt: string): DeskSnapshot {
  return DeskSnapshot.parse({
    mode: "mock", generated_at: generatedAt, source: "notion", desks: [...DESKS], figures: FIGURES, observations: OBSERVATIONS,
  });
}

const hit = (h: Omit<OsoNotionHit, "url" | "page_id"> & { n: number }): OsoNotionHit => {
  const { n, ...rest } = h;
  return OsoNotionHit.parse({ ...rest, page_id: `sample-${String(n).padStart(2, "0")}`, url: null });
};

/** El expediente de Notion de la muestra: una fila por observación curada, con las etiquetas de sentimiento que traen las filas. */
export function mockNotion(generatedAt: string): OsoNotionSnapshot {
  const hits = [
    hit({ n: 1, source: "tickers_info", title: "NEAR", date: "2026-10-25", sentiment: null, account: null, topic: "Capa 1", excerpt: "Marca de precio de 4.45 el 25 de octubre y cerca de 4.60 el 15 de octubre. Las mesas señalan la venta masiva (NEAR -5.4% frente a BTC -0.9%) y un pequeño largo en NEAR junto con ZRO, HYPE y ONDO." }),
    hit({ n: 2, source: "tickers_info", title: "NEAR Intents", date: "2026-10-02", sentiment: null, account: null, topic: "Intents", excerpt: "Vulneración del puente Omni por unos 3.8M el 2 de octubre; operaciones pausadas y luego restablecidas en parte, con reembolsos prometidos." }),
    hit({ n: 3, source: "x_creative_output", title: "Resumen diario · 7 de septiembre", date: "2026-09-07", sentiment: null, account: null, topic: "Setup", excerpt: "NEAR rompe por encima de la resistencia." }),
    hit({ n: 4, source: "x_creative_output", title: "Resumen diario · 25 de octubre", date: "2026-10-25", sentiment: null, account: null, topic: "Macro", excerpt: "Las alts cayeron más que BTC; dominancia de BTC en 60.13%." }),
    hit({ n: 5, source: "x_account_analyses", title: "@arkham", date: "2026-09-26", sentiment: "positive", account: "arkham", topic: "Posicionamiento", excerpt: "Ballena Mk4 con un largo en NEAR de 29.7M con apalancamiento de 10x y cerca de 16M de ganancia no realizada." }),
    hit({ n: 6, source: "x_account_analyses", title: "@TradingLatino", date: "2026-10-02", sentiment: "mixed", account: "TradingLatino", topic: "Vulnerabilidad", excerpt: "Vulneración de Omni en NEAR Intents; se afirma que la cadena y el token no se vieron afectados." }),
    hit({ n: 7, source: "x_account_analyses", title: "@Nebraskangooner", date: "2026-10-25", sentiment: "negative", account: "Nebraskangooner", topic: "Macro", excerpt: "Barrida de fin de semana; NEAR entre las alts que más cayeron." }),
    hit({ n: 8, source: "x_account_analyses", title: "@arkham", date: "2026-10-26", sentiment: "neutral", account: "arkham", topic: "Posicionamiento", excerpt: "La misma ballena: más de 10M de ganancia en un largo en NEAR superior a 25M, con 13.1M en cortos sobre las principales." }),
    hit({ n: 9, source: "x_account_analyses", title: "@CastilloTrading", date: "2026-10-28", sentiment: "positive", account: "CastilloTrading", topic: "Setup", excerpt: "Pequeño largo en NEAR en ganancia; sesgo alcista de corto plazo ligado a un nPOC de BTC." }),
    hit({ n: 10, source: "x_account_analyses", title: "@Zeneca", date: "2026-10-16", sentiment: null, account: "Zeneca", topic: "Asociación", excerpt: "Reporta una asociación entre NEAR y Brave (muestra escasa)." }),
  ];
  return summarize({
    mode: "mock", generated_at: generatedAt,
    databases: {
      tickers_info: "99687de2-cbd0-4b2e-9e1c-0dd0a3211357",
      x_creative_output: "460be6fc-c001-4330-9832-c55f647c5c23",
      x_account_analyses: "bbaf87b8-dfa1-4cce-acb3-f4f69a0c383d",
    },
    scanned_pages: hits.length, discarded_false_positives: 0, hits,
  });
}
