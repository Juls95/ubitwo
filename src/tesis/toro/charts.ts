import { PARAMS } from "./params";
import { movingAverage } from "./stats";
import type { Inputs } from "./load";
import type { Analysis } from "./types";

export type ChartDef = {
  id: string;
  title: string;
  agent: "bisonte" | "oso" | "toro";
  query_file: string | null;
  endpoint: string | null;
  /** Oración en lenguaje llano con marcadores; la renderiza y la revisa `verify`. */
  sentence: string;
  spec: Record<string, unknown>;
};

const SCHEMA = "https://vega.github.io/schema/vega-lite/v6.json";
const base = { $schema: SCHEMA, width: "container", height: 240, config: { axis: { labelFontSize: 11 }, legend: { orient: "bottom" } } };
const Q = (id: string) => `src/tesis/bisonte/bq/queries/${id}.sql`;

export function buildCharts(inputs: Inputs, a: Analysis): ChartDef[] {
  const { bisonte } = inputs;
  const daa = bisonte.daily_activity;
  const ma = movingAverage(daa.map((d) => d.daily_active_accounts), 7);

  return [
    {
      id: "daa", title: "Cuentas activas diarias", agent: "bisonte", query_file: Q("daily_activity"), endpoint: null,
      sentence: "La mediana de treinta días de cuentas activas está a {{metric:daa_30d_vs_90d_pct}} de la mediana de noventa días; régimen: {{label:regime}}.",
      spec: {
        ...base,
        data: { values: daa.map((d, i) => ({ date: d.date, value: d.daily_active_accounts, avg7: ma[i] })) },
        layer: [
          { mark: { type: "line", opacity: 0.35 }, encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "value", type: "quantitative", title: "Cuentas" } } },
          { mark: { type: "line", strokeWidth: 2 }, encoding: { x: { field: "date", type: "temporal" }, y: { field: "avg7", type: "quantitative" } } },
        ],
      },
    },
    {
      id: "transactions", title: "Transacciones diarias", agent: "bisonte", query_file: Q("daily_activity"), endpoint: null,
      sentence: "La mediana de transacciones diarias cambió {{metric:tx_30d_change_pct}} frente a los treinta días anteriores.",
      spec: { ...base, data: { values: daa.map((d) => ({ date: d.date, value: d.transactions })) }, mark: "area",
        encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "value", type: "quantitative", title: "Transacciones" } } },
    },
    {
      id: "new_accounts", title: "Cuentas creadas por día", agent: "bisonte", query_file: Q("new_accounts"), endpoint: null,
      sentence: "Se crearon {{metric:new_accounts_30d}} cuentas en los últimos treinta días ({{metric:new_accounts_30d_change_pct}} frente a la ventana anterior).",
      spec: { ...base, data: { values: bisonte.new_accounts.map((d) => ({ date: d.date, value: d.new_accounts })) }, mark: "bar",
        encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "value", type: "quantitative", title: "Cuentas nuevas" } } },
    },
    {
      id: "intents_share", title: "Participación del contrato de Intents en las llamadas", agent: "bisonte", query_file: Q("contract_activity"), endpoint: null,
      sentence: "El contrato de Intents recibe {{metric:intents_call_share_30d}} de las llamadas a contratos, {{metric:intents_call_share_change_pp}} frente a la ventana anterior.",
      spec: { ...base, data: { values: bisonte.contract_activity.map((d) => ({ date: d.date, pct: d.function_calls ? (d.intents_calls / d.function_calls) * 100 : null })) },
        mark: "line", encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "pct", type: "quantitative", title: "% de las llamadas" } } },
    },
    {
      id: "top_contracts", title: "Contratos más llamados (últimos treinta días)", agent: "bisonte", query_file: Q("contract_usage"), endpoint: null,
      sentence: "En treinta días, la mediana fue de {{metric:active_contracts_median_30d}} contratos activos por día, con {{metric:deploys_30d}} despliegues.",
      spec: { ...base, height: 200,
        data: { values: topContracts(inputs) },
        mark: "bar", encoding: { y: { field: "contract", type: "nominal", sort: "-x", title: null }, x: { field: "calls", type: "quantitative", title: "Llamadas" } } },
    },
    {
      id: "concentration", title: "Participación de los diez firmantes más activos", agent: "bisonte", query_file: Q("concentration"), endpoint: null,
      sentence: "La mediana de treinta días es {{metric:top10_share_median_30d}}. Saltos clasificados como picos, no como adopción: {{metric:spikes_nonstructural}}.",
      spec: { ...base, data: { values: bisonte.concentration.map((d) => ({ date: d.date, pct: d.total_transactions ? (d.top10_transactions / d.total_transactions) * 100 : null })) },
        mark: "line", encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "pct", type: "quantitative", title: "% de las transacciones" } } },
    },
    {
      id: "meta_tx", title: "Metatransacciones (acciones delegadas)", agent: "bisonte", query_file: Q("meta_tx"), endpoint: null,
      sentence: "Las acciones delegadas son {{metric:meta_tx_share_30d}} del total; una mediana de {{metric:delegating_accounts_median_30d}} cuentas por día las usa.",
      spec: { ...base, data: { values: bisonte.meta_tx.map((d) => ({ date: d.date, pct: d.total_actions ? (d.delegate_actions / d.total_actions) * 100 : null })) },
        mark: "line", encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "pct", type: "quantitative", title: "% de las acciones" } } },
    },
    {
      id: "intents_volume", title: "Volumen diario de 1Click Swap (USD)", agent: "bisonte", query_file: null,
      endpoint: "GET https://explorer.near-intents.org/api/v0/transactions?statuses=SUCCESS",
      sentence: "El volumen de 1Click en treinta días fue de {{metric:intents_volume_30d_usd}} ({{metric:intents_volume_30d_change_pct}} frente a la ventana anterior).",
      spec: { ...base, data: { values: bisonte.intents_daily.map((d) => ({ date: d.date, usd: d.volume_usd })) }, mark: "bar",
        encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "usd", type: "quantitative", title: "USD" } } },
    },
    {
      id: "lag", title: "Correlación con rezago: 1Click frente a cuentas activas", agent: "toro", query_file: Q("daily_activity"),
      endpoint: "GET https://explorer.near-intents.org/api/v0/transactions?statuses=SUCCESS",
      sentence: "La correlación máxima es {{metric:lag_best_r}} con un rezago de {{metric:lag_best_days}}; en la dirección inversa llega a {{metric:lag_reverse_best_r}}.",
      spec: { ...base,
        data: { values: a.lag.flatMap((p) => [{ lag: p.lag, direction: "1Click → cuentas", r: p.forward }, { lag: p.lag, direction: "cuentas → 1Click", r: p.reverse }]) },
        mark: "line", encoding: { x: { field: "lag", type: "ordinal", title: "Rezago (días)" }, y: { field: "r", type: "quantitative", title: "r", scale: { domain: [-1, 1] } }, color: { field: "direction", type: "nominal", title: null } } },
    },
    {
      id: "sentiment", title: "Sentimiento semanal ponderado por credibilidad", agent: "oso", query_file: null,
      endpoint: "POST https://api.x.ai/v1/responses (tool: x_search)",
      sentence: "El índice de la última semana es {{metric:sentiment_index_last_week}} frente a {{metric:sentiment_index_prev_week}} la semana anterior. Semanas de espejismo: {{metric:mirage_weeks}}.",
      spec: { ...base,
        data: { values: a.divergences.map((d) => ({ week: d.week, sentiment: d.sentiment_index, kind: d.reconstructed ? "reconstruida" : "en vivo" })) },
        mark: { type: "bar" }, encoding: { x: { field: "week", type: "ordinal", title: null }, y: { field: "sentiment", type: "quantitative", title: "Índice", scale: { domain: [-1, 1] } }, color: { field: "kind", type: "nominal", title: null } } },
    },
    ...priceCharts(inputs, a),
  ];
}

const PRICE_ENDPOINT = "data/tesis/raw/price/near.json y data/tesis/raw/price/btc.json (velas diarias; la fuente de precios se configura fuera de este repositorio)";

/** Las gráficas técnicas solo existen cuando hay velas de precio; si no, la tesis dice que las métricas no están disponibles. */
function priceCharts(inputs: Inputs, a: Analysis): ChartDef[] {
  if (!inputs.price) return [];
  const near = inputs.price.near.bars;
  const closes = near.map((b) => b.close);
  const fast = movingAverage(closes, PARAMS.sma_fast_days);
  const slow = movingAverage(closes, PARAMS.sma_slow_days);
  const shown = 260;
  const from = Math.max(0, near.length - shown);
  const m = (id: string) => a.metrics[id]?.value ?? null;
  const rules = [
    { level: m("range_high"), kind: "máximo del rango" },
    { level: m("range_median"), kind: "mediana del rango" },
    { level: m("range_low"), kind: "mínimo del rango" },
    ...a.npocs.map((n) => ({ level: n.level, kind: `nPOC abierto (${n.side === "lower" ? "inferior" : "superior"})` })),
  ].filter((r) => r.level !== null);
  const btc = inputs.price.btc.bars;
  const span = 120;
  const nearTail = near.slice(-span);
  const btcTail = btc.slice(-span);
  const index = (bars: typeof near) => bars.map((b) => ({ date: b.date, value: (b.close / (bars[0]?.close ?? b.close)) * 100 }));
  return [
    {
      id: "price_technical", title: "Precio de NEAR con promedios, rango y niveles nPOC abiertos", agent: "bisonte", query_file: null, endpoint: PRICE_ENDPOINT,
      sentence: "NEAR cierra a {{metric:near_vs_sma_slow_pct}} de su promedio lento, se ubica en el {{metric:range_position_pct}} de su rango y tiene {{metric:npoc_open_total}} niveles nPOC abiertos.",
      spec: {
        ...base,
        height: 280,
        layer: [
          { data: { values: near.slice(from).map((b, i) => ({ date: b.date, cierre: b.close, "rápido": fast[from + i], lento: slow[from + i] })) },
            transform: [{ fold: ["cierre", "rápido", "lento"], as: ["series", "price"] }],
            mark: { type: "line", strokeWidth: 1.6 },
            encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "price", type: "quantitative", title: "USD", scale: { zero: false } }, color: { field: "series", type: "nominal", title: null } } },
          { data: { values: rules }, mark: { type: "rule", strokeDash: [4, 4], opacity: 0.7 },
            encoding: { y: { field: "level", type: "quantitative" }, color: { field: "kind", type: "nominal", title: null } } },
        ],
      },
    },
    {
      id: "near_vs_btc", title: "NEAR frente a BTC, indexados al inicio de la ventana", agent: "toro", query_file: null, endpoint: PRICE_ENDPOINT,
      sentence: "En {{param:rs_lookback_days}} días NEAR rindió {{metric:near_return_30d_pct}} y BTC {{metric:btc_return_30d_pct}}; la beta de NEAR frente a BTC es {{metric:near_beta_90d}}.",
      spec: {
        ...base,
        data: { values: [...index(nearTail).map((d) => ({ ...d, series: "NEAR" })), ...index(btcTail).map((d) => ({ ...d, series: "BTC" }))] },
        mark: "line",
        encoding: { x: { field: "date", type: "temporal", title: null }, y: { field: "value", type: "quantitative", title: "Índice", scale: { zero: false } }, color: { field: "series", type: "nominal", title: null } },
      },
    },
  ];
}

function topContracts(inputs: Inputs) {
  const end = inputs.manifest.window.end;
  const from = new Date(new Date(`${end}T00:00:00Z`).getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const totals = new Map<string, number>();
  for (const r of inputs.bisonte.contract_usage) if (r.date >= from) totals.set(r.contract, (totals.get(r.contract) ?? 0) + r.calls);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([contract, calls]) => ({ contract, calls }));
}
