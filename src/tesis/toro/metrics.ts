import { addDays, weekStart } from "../../lib/dates";
import { PARAMS, SUCCESS_STATUS_PREFIX } from "./params";
import { laggedCorrelation, logDiff, mean, median, movingAverage, pctChange, sum } from "./stats";
import { registerDesk } from "./desk";
import { EXTERNAL_FIGURES, EXTERNAL_NOTE, EXTERNAL_REFERENCES, externalValues } from "./external";
import type { Inputs } from "./load";
import { computeTechnical, registerTechnical } from "./technical";
import type { Analysis, Divergence, LagPoint, Metric, Provenance, SpikeEvent } from "./types";

const W = PARAMS.window_days;
export const round = (n: number | null, d = 4) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);

/** Filas en [end - offset - W, end - offset). */
function windowRows<T extends { date: string }>(rows: readonly T[], end: string, offset = 0): T[] {
  const to = addDays(end, -offset);
  const from = addDays(to, -W);
  return rows.filter((r) => r.date >= from && r.date < to);
}

export function classifySpikes(inputs: Inputs): SpikeEvent[] {
  const daa = inputs.bisonte.daily_activity;
  const conc = new Map(inputs.bisonte.concentration.map((c) => [c.date, c]));
  const events: SpikeEvent[] = [];
  for (let i = W; i < daa.length; i++) {
    const row = daa[i];
    if (!row) continue;
    const baseline = median(daa.slice(i - W, i).map((r) => r.daily_active_accounts));
    if (!baseline) continue;
    const multiple = row.daily_active_accounts / baseline;
    if (multiple < PARAMS.spike_multiple) continue;
    const after = daa.slice(i + 1, i + 1 + PARAMS.spike_persistence_days).map((r) => r.daily_active_accounts);
    const afterMedian = median(after);
    const c = conc.get(row.date);
    const top10 = c && c.total_transactions > 0 ? (c.top10_transactions / c.total_transactions) * 100 : 0;
    const persisted = afterMedian !== null && after.length === PARAMS.spike_persistence_days && afterMedian >= baseline * PARAMS.spike_persistence_multiple;
    events.push({
      date: row.date,
      multiple: round(multiple, 2) as number,
      top10_share_pct: round(top10, 1) as number,
      classification: persisted && top10 < PARAMS.spike_concentration_pct ? "cambio estructural" : "pico",
    });
  }
  return events;
}

/** Análisis diario de rezagos sobre tasas de crecimiento de series suavizadas: ¿la actividad de 1Click se adelanta a las cuentas activas diarias? */
export function lagAnalysis(inputs: Inputs): LagPoint[] {
  const intents = new Map(inputs.bisonte.intents_daily.map((r) => [r.date, r.swaps]));
  const days = inputs.bisonte.daily_activity.filter((r) => intents.has(r.date));
  const s = PARAMS.lag_smoothing_days;
  const x = logDiff(movingAverage(days.map((d) => intents.get(d.date) ?? 0), s), s);
  const y = logDiff(movingAverage(days.map((d) => d.daily_active_accounts), s), s);
  const out: LagPoint[] = [];
  for (let lag = 0; lag <= PARAMS.lag_max_days; lag++) {
    const f = laggedCorrelation(x, y, lag);
    const r = laggedCorrelation(y, x, lag);
    out.push({ lag, forward: round(f.r, 3), reverse: round(r.r, 3), n: f.n });
  }
  return out;
}

export function divergences(inputs: Inputs): Divergence[] {
  const daaByWeek = new Map<string, number[]>();
  for (const r of inputs.bisonte.daily_activity) {
    const wk = weekStart(r.date);
    daaByWeek.set(wk, [...(daaByWeek.get(wk) ?? []), r.daily_active_accounts]);
  }
  const weeks = [...inputs.osoWeekly].sort((a, b) => a.from.localeCompare(b.from));
  return weeks.map((w, i) => {
    const prev = weeks[i - 1];
    const cur = daaByWeek.get(w.from) ?? [];
    const before = daaByWeek.get(addDays(w.from, -7)) ?? [];
    const onchain = cur.length === 7 && before.length === 7 ? pctChange(mean(cur), mean(before)) : null;
    const sDelta = w.sentiment_index !== null && prev?.sentiment_index != null ? w.sentiment_index - prev.sentiment_index : null;
    let quadrant: Divergence["quadrant"] = "sin datos";
    if (onchain !== null && sDelta !== null) {
      const up = onchain > PARAMS.divergence_onchain_band_pct;
      const down = onchain < -PARAMS.divergence_onchain_band_pct;
      const sUp = sDelta > PARAMS.divergence_sentiment_band;
      const sDown = sDelta < -PARAMS.divergence_sentiment_band;
      if (sUp && up) quadrant = "confirmación";
      else if (sUp) quadrant = "espejismo";
      else if (sDown && up) quadrant = "oportunidad no narrada";
      else if (sDown && down) quadrant = "deterioro confirmado";
      else quadrant = "neutral";
    }
    return {
      week: w.week, from: w.from, reconstructed: w.reconstructed, sentiment_index: w.sentiment_index,
      sentiment_delta: round(sDelta, 3), onchain_change_pct: round(onchain, 2), quadrant,
    };
  });
}

/** Reúne métricas con una regla de procedencia común: los insumos simulados del pipeline nunca se etiquetan como «calculado». */
export function metricAdder(store: Record<string, Metric>, mode: Inputs["mode"]) {
  return (id: string, label: string, value: number | null, unit: Metric["unit"], source: string, note?: string, provenance?: Provenance) => {
    store[id] = {
      id, label, value: round(value), unit, source,
      provenance: provenance ?? (mode === "mock" ? "simulado" : "calculado"),
      ...(note ? { note } : {}),
    };
  };
}

export function analyze(inputs: Inputs, generatedAt: string): Analysis {
  const { bisonte, manifest } = inputs;
  const end = manifest.window.end;
  const m: Record<string, Metric> = {};
  const add = metricAdder(m, inputs.mode);
  const BQ = "BigQuery crypto_near_mainnet_us";
  const IE = "Intents Explorer (1Click Swap)";

  const daa = (o: number) => windowRows(bisonte.daily_activity, end, o).map((r) => r.daily_active_accounts);
  const daa30 = median(daa(0));
  const daaPrev = median(daa(W));
  const daa90 = median(bisonte.daily_activity.filter((r) => r.date >= addDays(end, -90)).map((r) => r.daily_active_accounts));
  add("daa_median_30d", "Mediana de cuentas activas diarias (últimos 30 días)", daa30, "count", `${BQ} · transactions`);
  add("daa_median_prev_30d", "Mediana de cuentas activas diarias (30 días anteriores)", daaPrev, "count", `${BQ} · transactions`);
  add("daa_median_90d", "Mediana de cuentas activas diarias (90 días)", daa90, "count", `${BQ} · transactions`);
  add("daa_30d_change_pct", "Cambio en la mediana de cuentas activas frente a los 30 días anteriores", pctChange(daa30, daaPrev), "pct", `${BQ} · transactions`);
  const regimeGap = pctChange(daa30, daa90);
  add("daa_30d_vs_90d_pct", "Mediana de 30 días frente a la mediana de 90 días", regimeGap, "pct", `${BQ} · transactions`);

  const tx = (o: number) => windowRows(bisonte.daily_activity, end, o).map((r) => r.transactions);
  add("tx_median_30d", "Mediana de transacciones diarias (30 días)", median(tx(0)), "count", `${BQ} · transactions`);
  add("tx_30d_change_pct", "Cambio en la mediana de transacciones frente a los 30 días anteriores", pctChange(median(tx(0)), median(tx(W))), "pct", `${BQ} · transactions`);

  const status = windowRows(bisonte.tx_status, end);
  const ok = sum(status.filter((s) => s.status.toUpperCase().startsWith(SUCCESS_STATUS_PREFIX)).map((s) => s.transactions));
  const all = sum(status.map((s) => s.transactions));
  add("success_rate_30d", "Transacciones exitosas (30 días)", all ? (ok / all) * 100 : null, "pct", `${BQ} · transactions.status`,
    "La correspondencia entre status y éxito debe revisarse contra los valores reales de status.");

  const acc = (o: number) => sum(windowRows(bisonte.new_accounts, end, o).map((r) => r.new_accounts));
  add("new_accounts_30d", "Cuentas creadas (30 días)", acc(0), "count", `${BQ} · receipt_actions`);
  add("new_accounts_30d_change_pct", "Cambio en las cuentas creadas frente a los 30 días anteriores", pctChange(acc(0), acc(W)), "pct", `${BQ} · receipt_actions`);

  const ca = (o: number) => windowRows(bisonte.contract_activity, end, o);
  const share = (rows: ReturnType<typeof ca>) => {
    const calls = sum(rows.map((r) => r.function_calls));
    return calls ? (sum(rows.map((r) => r.intents_calls)) / calls) * 100 : null;
  };
  const share30 = share(ca(0));
  const sharePrev = share(ca(W));
  add("active_contracts_median_30d", "Mediana de contratos activos por día (30 días)", median(ca(0).map((r) => r.active_contracts)), "count", `${BQ} · receipt_actions`);
  add("deploys_30d", "Contratos desplegados (30 días)", sum(ca(0).map((r) => r.deploys)), "count", `${BQ} · receipt_actions`);
  add("intents_call_share_30d", "Participación del contrato de Intents en todas las llamadas a contratos (30 días)", share30, "pct", `${BQ} · receipt_actions`);
  add("intents_call_share_change_pp", "Cambio en esa participación frente a los 30 días anteriores", share30 !== null && sharePrev !== null ? share30 - sharePrev : null, "pp", `${BQ} · receipt_actions`);

  const conc = windowRows(bisonte.concentration, end).map((c) => (c.total_transactions ? (c.top10_transactions / c.total_transactions) * 100 : 0));
  add("top10_share_median_30d", "Mediana de la participación de las transacciones de los diez firmantes más activos (30 días)", median(conc), "pct", `${BQ} · transactions`);

  const meta = windowRows(bisonte.meta_tx, end);
  const metaActions = sum(meta.map((r) => r.total_actions));
  add("meta_tx_share_30d", "Participación de las acciones delegadas (metatransacciones) en todas las acciones (30 días)", metaActions ? (sum(meta.map((r) => r.delegate_actions)) / metaActions) * 100 : null, "pct", `${BQ} · receipt_actions`);
  add("delegating_accounts_median_30d", "Mediana de cuentas que usan metatransacciones por día", median(meta.map((r) => r.delegating_accounts)), "count", `${BQ} · receipt_actions`);

  const ie = (o: number) => windowRows(bisonte.intents_daily, end, o);
  const vol30 = sum(ie(0).map((r) => r.volume_usd));
  const volPrev = sum(ie(W).map((r) => r.volume_usd));
  const swaps30 = sum(ie(0).map((r) => r.swaps));
  add("intents_volume_30d_usd", "Volumen de 1Click Swap (30 días)", ie(0).length ? vol30 : null, "usd", IE);
  add("intents_volume_30d_change_pct", "Cambio en el volumen de 1Click frente a los 30 días anteriores", ie(W).length ? pctChange(vol30, volPrev) : null, "pct", IE);
  add("intents_swaps_30d", "Swaps de 1Click (30 días)", ie(0).length ? swaps30 : null, "count", IE);
  add("intents_cross_chain_share_30d", "Swaps entre cadenas distintas (30 días, heurística sobre el id del activo)", swaps30 ? (sum(ie(0).map((r) => r.cross_chain_swaps)) / swaps30) * 100 : null, "pct", IE);
  add("intents_missing_usd_30d", "Swaps sin valor reportado en USD (30 días)", ie(0).length ? sum(ie(0).map((r) => r.swaps_missing_usd)) : null, "count", IE);

  const swapsPer1k = daa30 && ie(0).length ? (swaps30 / (daa30 * W)) * 1000 : null;
  add("swaps_per_1k_daa", "Swaps de 1Click por cada mil cuentas activas diarias (30 días)", swapsPer1k, "ratio", `${IE} + ${BQ}`,
    "Un cociente entre interacción y actividad, no una tasa de conversión: las direcciones no se cruzan.");

  const volChange = m.intents_volume_30d_change_pct?.value ?? null;
  const daaChange = m.daa_30d_change_pct?.value ?? null;
  add("growth_gap_pp", "Crecimiento del volumen de 1Click menos crecimiento de cuentas activas", volChange !== null && daaChange !== null ? volChange - daaChange : null, "pp", `${IE} + ${BQ}`);

  const lag = lagAnalysis(inputs);
  const best = lag.filter((p) => p.lag > 0 && p.forward !== null).sort((a, b) => (b.forward ?? 0) - (a.forward ?? 0))[0];
  const bestReverse = lag.filter((p) => p.lag > 0 && p.reverse !== null).sort((a, b) => (b.reverse ?? 0) - (a.reverse ?? 0))[0];
  add("lag_best_days", "Rezago con la correlación más alta (de 1Click a cuentas activas)", best?.lag ?? null, "days", `${IE} + ${BQ}`);
  add("lag_best_r", "Correlación en ese rezago", best?.forward ?? null, "corr", `${IE} + ${BQ}`);
  add("lag_best_n", "Pares de días usados en la correlación", best?.n ?? null, "count", `${IE} + ${BQ}`);
  add("lag_reverse_best_r", "Mejor correlación inversa (de cuentas activas a 1Click)", bestReverse?.reverse ?? null, "corr", `${IE} + ${BQ}`);
  add("lag_zero_r", "Correlación sin rezago", lag[0]?.forward ?? null, "corr", `${IE} + ${BQ}`);

  const spikes = classifySpikes(inputs);
  add("spikes_total", "Días con un salto de cuentas activas por encima del umbral", spikes.length, "count", `${BQ} · transactions`);
  add("spikes_nonstructural", "Saltos clasificados como picos (no estructurales)", spikes.filter((s) => s.classification === "pico").length, "count", `${BQ} · transactions`);

  const weeks = [...inputs.osoWeekly].sort((a, b) => a.from.localeCompare(b.from));
  const last = weeks.at(-1);
  const prev = weeks.at(-2);
  add("sentiment_index_last_week", "Índice de sentimiento ponderado por credibilidad (última semana)", last?.sentiment_index ?? null, "index", "Oso · xAI x_search");
  add("sentiment_index_prev_week", "Índice de sentimiento (semana anterior)", prev?.sentiment_index ?? null, "index", "Oso · xAI x_search");
  add("oso_posts_last_week", "Publicaciones verificadas (última semana)", last?.post_count ?? null, "count", "Oso · xAI x_search");
  const kept = sum(inputs.osoDaily.map((d) => d.posts.length));
  const dropped = sum(inputs.osoDaily.map((d) => d.discarded.length));
  add("oso_discard_share", "Publicaciones descartadas por los controles de cita, cuenta o fecha", kept + dropped ? (dropped / (kept + dropped)) * 100 : null, "pct", "Oso · verificación");
  add("oso_weeks", "Semanas analizadas por Oso", weeks.length, "count", "Oso");
  add("oso_weeks_reconstructed", "Semanas reconstruidas (no ejecutadas en vivo)", weeks.filter((w) => w.reconstructed).length, "count", "Oso");

  const div = divergences(inputs);
  add("mirage_weeks", "Semanas marcadas como espejismo", div.filter((d) => d.quadrant === "espejismo").length, "count", "Toro · divergencias");

  const regime =
    regimeGap === null ? "sin datos" : regimeGap > PARAMS.regime_band_pct ? "expansión" : regimeGap < -PARAMS.regime_band_pct ? "contracción" : "lateral";
  const shift = (m.intents_call_share_change_pp?.value ?? 0) > 0 && (m.growth_gap_pp?.value ?? 0) > 0;
  const leads = best !== undefined && (best.forward ?? 0) >= PARAMS.lag_min_r && (best.forward ?? 0) > (bestReverse?.reverse ?? 0);
  const verdict = shift && leads ? "respaldada por los datos actuales" : shift || leads ? "parcialmente respaldada" : "no respaldada por los datos actuales";
  const strength = (r: number | null) => (r === null ? "sin datos" : Math.abs(r) < 0.3 ? "débil" : Math.abs(r) < 0.6 ? "moderada" : "fuerte");

  const technical = computeTechnical(inputs.price, regime);
  registerTechnical(technical, add, inputs.mode);
  const desk = registerDesk(inputs.desk, inputs.osoNotion, externalValues(), add);
  for (const f of EXTERNAL_FIGURES) add(f.id, f.label, f.value, f.unit, "Tesis de referencia externa (transmitida)", EXTERNAL_NOTE, "citado");

  const bias = technical.labels.technical_bias ?? "sin datos";
  const stance =
    verdict === "no respaldada por los datos actuales"
      ? "sin ventaja: la tesis on-chain no está respaldada"
      : verdict === "parcialmente respaldada"
        ? "sin demostrar: vigilar las alarmas"
        : bias === "constructivo"
          ? "constructiva: dirección y momento se alinean"
          : bias === "sin datos"
            ? "constructiva en la dirección; el momento no se puede leer sin datos de precio"
            : "constructiva en la dirección; el momento no está confirmado";
  const sim = inputs.mode === "mock";
  const provenanceLabels: [string, string][] = [
    ["src_chain", sim ? "simulado" : "real (en vivo)"],
    ["src_price", inputs.price ? (sim ? "simulado, escalado a marcas de precio de las mesas" : `real (${technical.source})`) : "no disponible"],
    ["src_notion", inputs.osoNotion ? (sim ? "filas reales, muestra parafraseada" : "real (en vivo)") : "no disponible"],
    ["src_desk", inputs.desk ? (sim ? "notas reales, muestra curada" : "real, curado") : "no disponible"],
    ["src_x", sim ? "simulado" : "real (las semanas reconstruidas están marcadas)"],
    ["ref_btc_date", EXTERNAL_REFERENCES.find((r) => r.id === "btc_alert")?.date ?? "desconocida"],
  ];

  const labels = Object.fromEntries(
    [
      ...Object.entries(technical.labels),
      ...provenanceLabels,
      ["stance", stance],
      ["mode", inputs.mode === "mock" ? "SIMULADO (mock)" : "datos reales (en vivo)"],
      ["generated_at", generatedAt.slice(0, 10)],
      ["last_block_date", manifest.freshness.last_block_date ?? "desconocida"],
      ["window_start", manifest.window.start],
      ["window_end", manifest.window.end],
      ["regime", regime],
      ["hypothesis_verdict", verdict],
      ["shift_status", shift ? "observado" : "no observado"],
      ["lead_status", leads ? "observado" : "no observado"],
      ["lag_strength", strength(best?.forward ?? null)],
    ].map(([id, value]) => [id, { id: id as string, value: value as string }]),
  );

  return {
    mode: inputs.mode,
    generated_at: generatedAt,
    last_block_date: manifest.freshness.last_block_date,
    window: manifest.window,
    metrics: m,
    labels,
    spikes,
    divergences: div,
    lag,
    confluence: technical.confluence,
    npocs: technical.npocs,
    notion_themes: desk.themes,
    desk_observations: inputs.desk?.observations ?? [],
  };
}
