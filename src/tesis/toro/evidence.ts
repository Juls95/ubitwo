import type { DeskObservation } from "../esquemas/mercado";
import { PARAMS } from "./params";
import type { RenderContext } from "./render";
import type { Analysis, Metric } from "./types";

type Item = { stance: "for" | "against"; text: string };

const v = (a: Analysis, id: string) => a.metrics[id]?.value ?? null;

/** Texto visible de los temas de las mesas; el enum del esquema se conserva como id interno. */
const DESK_TOPIC: Record<DeskObservation["topic"], string> = {
  setup: "configuración técnica",
  positioning: "posicionamiento",
  exploit: "vulnerabilidad",
  partnership: "alianza",
  price: "precio",
  macro: "macro",
};

/** La evidencia se elige con reglas sobre las métricas calculadas; «en contra» nunca queda vacía, por diseño. */
export function selectEvidence(a: Analysis): Item[] {
  const items: Item[] = [];
  const share = v(a, "intents_call_share_change_pp");
  if (share !== null) {
    items.push(share > 0
      ? { stance: "for", text: "La participación del contrato de Intents en las llamadas a contratos cambió {{metric:intents_call_share_change_pp}} frente a los treinta días anteriores (ahora {{metric:intents_call_share_30d}})." }
      : { stance: "against", text: "La participación del contrato de Intents en las llamadas a contratos no está subiendo: {{metric:intents_call_share_change_pp}} frente a los treinta días anteriores." });
  }
  const gap = v(a, "growth_gap_pp");
  if (gap !== null) {
    items.push(gap > 0
      ? { stance: "for", text: "El volumen de 1Click creció {{metric:intents_volume_30d_change_pct}} mientras las cuentas activas cambiaron {{metric:daa_30d_change_pct}}: la ejecución entre cadenas crece más rápido que la base." }
      : { stance: "against", text: "El volumen de 1Click ({{metric:intents_volume_30d_change_pct}}) no crece más rápido que las cuentas activas ({{metric:daa_30d_change_pct}})." });
  }
  if (a.labels.lead_status?.value === "observado") {
    items.push({ stance: "for", text: "El crecimiento de swaps de 1Click se adelanta al de cuentas activas: la correlación máxima es {{metric:lag_best_r}} con un rezago de {{metric:lag_best_days}}, mayor que en la dirección inversa ({{metric:lag_reverse_best_r}})." });
  } else {
    items.push({ stance: "against", text: "No hay un adelanto claro: la mejor correlación con rezago es {{metric:lag_best_r}} y la inversa es {{metric:lag_reverse_best_r}} (umbral prerregistrado: {{param:lag_min_r}})." });
  }
  const regime = a.labels.regime?.value;
  if (regime === "expansión") items.push({ stance: "for", text: "El régimen de adopción es de expansión: la mediana de treinta días de cuentas activas está {{metric:daa_30d_vs_90d_pct}} por encima de la mediana de noventa días." });
  else if (regime) items.push({ stance: "against", text: "El régimen de adopción no es de expansión ({{label:regime}}): la mediana de treinta días de cuentas activas está en {{metric:daa_30d_vs_90d_pct}} frente a la mediana de noventa días." });

  const bias = a.labels.technical_bias?.value;
  const score = v(a, "confluence_score");
  if (score !== null && bias === "constructivo") {
    items.push({ stance: "for", text: "El sesgo técnico es constructivo: se cumplen {{metric:confluence_score}} de {{metric:confluence_total}} criterios (umbral: {{param:confluence_constructive_min}})." });
  } else if (score !== null && bias) {
    items.push({ stance: "against", text: "El sesgo técnico es {{label:technical_bias}}: solo se cumplen {{metric:confluence_score}} de {{metric:confluence_total}} criterios (para ser constructivo se necesitan {{param:confluence_constructive_min}})." });
  }
  const rs = v(a, "rs_vs_btc_30d_pp");
  if (rs !== null) {
    items.push(rs >= 0
      ? { stance: "for", text: "NEAR superó a BTC por {{metric:rs_vs_btc_30d_pp}} en {{param:rs_lookback_days}} días." }
      : { stance: "against", text: "NEAR quedó por detrás de BTC por {{metric:rs_vs_btc_30d_pp}} en {{param:rs_lookback_days}} días." });
  }
  const slow = v(a, "near_vs_sma_slow_pct");
  if (slow !== null && slow < 0) items.push({ stance: "against", text: "NEAR cierra a {{metric:near_vs_sma_slow_pct}} de su promedio diario lento, así que la tendencia de largo plazo no ha girado." });
  if (v(a, "near_beta_90d") !== null) {
    items.push({ stance: "against", text: "NEAR se mueve {{metric:near_beta_90d}} veces lo que se mueve BTC (beta), así que una ruptura a la baja de BTC lo golpearía con más fuerza." });
  }
  const tripwire = a.labels.btc_tripwire?.value;
  if (tripwire && tripwire !== "intacto" && tripwire !== "sin datos") {
    items.push({ stance: "against", text: "La alarma del promedio semanal de BTC está en estado {{label:btc_tripwire}}: {{metric:btc_weeks_below_wma}} cierres semanales por debajo del promedio (la ventana de recuperación es de {{param:tripwire_regain_weeks}} semanas)." });
  }
  if (v(a, "desk_whale_pnl_oct_usd") !== null) {
    items.push({ stance: "for", text: "Afirmación de una mesa: una billetera grande mantiene un largo apalancado en NEAR con más de {{metric:desk_whale_pnl_oct_usd}} de ganancia. Es el posicionamiento de un solo actor, no uso." });
  }
  if (v(a, "desk_omni_exploit_usd") !== null) {
    items.push({ stance: "against", text: "Seguridad: una mesa reporta una vulneración del puente Omni de unos {{metric:desk_omni_exploit_usd}} en NEAR Intents. La misma mesa dice que la cadena y el token no se vieron afectados, pero Intents es el pilar en el que se apoya esta tesis." });
  }
  if (v(a, "desk_alt_beta_ratio") !== null) {
    items.push({ stance: "against", text: "El día de la venta masiva de octubre, NEAR cayó {{metric:desk_near_move_oct25_pct}} frente a {{metric:desk_btc_move_oct25_pct}} de BTC, unas {{metric:desk_alt_beta_ratio}} veces más fuerte (cifras de mesas)." });
  }

  const conc = v(a, "top10_share_median_30d");
  if (conc !== null && conc >= PARAMS.spike_concentration_pct) {
    items.push({ stance: "against", text: "La actividad está concentrada: los diez firmantes más activos generan {{metric:top10_share_median_30d}} de las transacciones (mediana de treinta días)." });
  }
  if ((v(a, "spikes_nonstructural") ?? 0) > 0) {
    items.push({ stance: "against", text: "Saltos de cuentas activas clasificados como picos (no persisten o están concentrados): {{metric:spikes_nonstructural}}. No se cuentan como adopción." });
  }
  if ((v(a, "mirage_weeks") ?? 0) > 0) {
    items.push({ stance: "against", text: "Semanas de espejismo detectadas (el sentimiento subió sin que la actividad on-chain acompañara): {{metric:mirage_weeks}}." });
  }
  if ((v(a, "intents_missing_usd_30d") ?? 0) > 0) {
    items.push({ stance: "against", text: "{{metric:intents_missing_usd_30d}} swaps de los últimos treinta días no reportan valor en USD; el volumen queda subestimado en esa medida." });
  }
  items.push(
    { stance: "against", text: "1Click Swap es solo una parte de NEAR Intents; el volumen total de Intents no se puede medir con estas fuentes." },
    { stance: "against", text: "La correlación usa {{metric:lag_best_n}} pares de días; una correlación con rezago no demuestra causalidad." },
  );
  if ((v(a, "oso_weeks_reconstructed") ?? 0) > 0) {
    items.push({ stance: "against", text: "{{metric:oso_weeks_reconstructed}} de {{metric:oso_weeks}} semanas de Oso se reconstruyeron con búsqueda histórica, no se ejecutaron en vivo." });
  }
  return items;
}

/** Los valores de cada fila se vuelven métricas o etiquetas, así que hasta las tablas cumplen la regla de «números solo desde datos». */
export function buildContext(a: Analysis): RenderContext {
  const metrics: Record<string, Metric> = { ...a.metrics };
  const labels: Record<string, { value: string }> = { ...a.labels };
  const items = selectEvidence(a);
  const bullets = (stance: Item["stance"]) => items.filter((i) => i.stance === stance).map((i) => `- ${i.text}`).join("\n") || "- Ninguna con los datos actuales.";

  const divRows = a.divergences.map((d, i) => {
    labels[`div_${i}_week`] = { value: d.week };
    labels[`div_${i}_kind`] = { value: d.reconstructed ? "reconstruida" : "en vivo" };
    labels[`div_${i}_quadrant`] = { value: d.quadrant };
    metrics[`div_${i}_sent`] = { id: `div_${i}_sent`, label: "Sentimiento", value: d.sentiment_index, unit: "index", source: "Oso" };
    metrics[`div_${i}_chain`] = { id: `div_${i}_chain`, label: "Cambio semanal de cuentas activas", value: d.onchain_change_pct, unit: "pct", source: "Bisonte" };
    return `| {{label:div_${i}_week}} | {{label:div_${i}_kind}} | {{metric:div_${i}_sent}} | {{metric:div_${i}_chain}} | {{label:div_${i}_quadrant}} |`;
  });
  const divTable = divRows.length
    ? ["| Semana | Tipo | Sentimiento (Oso) | Cuentas activas, semana contra semana (Bisonte) | Lectura de Toro |", "| --- | --- | --- | --- | --- |", ...divRows].join("\n")
    : "Todavía no hay semanas de Oso.";

  const spikeRows = a.spikes.map((s, i) => {
    labels[`spike_${i}_date`] = { value: s.date };
    labels[`spike_${i}_class`] = { value: s.classification === "pico" ? "pico (no estructural)" : "cambio estructural" };
    metrics[`spike_${i}_top10`] = { id: `spike_${i}_top10`, label: "Diez firmantes principales", value: s.top10_share_pct, unit: "pct", source: "Bisonte" };
    return `- {{label:spike_${i}_date}}: {{label:spike_${i}_class}}; los diez firmantes más activos produjeron {{metric:spike_${i}_top10}} de las transacciones.`;
  });

  const confRows = a.confluence.map((c, i) => {
    labels[`conf_${i}_met`] = { value: c.met === null ? "sin datos" : c.met ? "sí" : "no" };
    return `| ${c.text} | {{label:conf_${i}_met}} |`;
  });
  const confTable = ["| Criterio | Se cumple |", "| --- | --- |", ...confRows].join("\n");

  const deskRows = a.desk_observations.map((o, i) => {
    labels[`obs_${i}_date`] = { value: o.date ?? "sin fecha" };
    labels[`obs_${i}_desk`] = { value: o.desk };
    labels[`obs_${i}_topic`] = { value: DESK_TOPIC[o.topic] };
    return `| {{label:obs_${i}_date}} | {{label:obs_${i}_desk}} | {{label:obs_${i}_topic}} | ${o.claim} |`;
  });
  const deskTable = deskRows.length
    ? ["| Fecha | Mesa | Tema | Afirmación (parafraseada) |", "| --- | --- | --- | --- |", ...deskRows].join("\n")
    : "No hay observaciones de mesas disponibles en esta compilación.";

  const themeRows = a.notion_themes.map((t, i) => {
    labels[`theme_${i}_title`] = { value: t.title };
    return `- {{label:theme_${i}_title}} (filas que coinciden: {{metric:notion_theme_${t.id}}})`;
  });

  return {
    metrics,
    labels,
    blocks: {
      confluence: confTable,
      desk_observations: deskTable,
      notion_themes: themeRows.join("\n") || "- No hay temas de Notion en esta compilación.",
      evidence_for: bullets("for"),
      evidence_against: bullets("against"),
      divergences: divTable,
      spikes: spikeRows.join("\n") || "- No hubo saltos por encima del umbral en la ventana.",
    },
  };
}
