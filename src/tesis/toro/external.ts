import type { MetricUnit } from "./types";

/**
 * Tesis de referencia externas, usadas solo como lentes de análisis y como contexto citado. Todo aquí está
 * parafraseado y atribuido; no se copia texto (la alerta de investigación prohíbe su redistribución).
 * Las cifras las transmite el autor y NO se han verificado de forma independiente, cosa que dice cada salida.
 */
export type ExternalReference = {
  id: "company_thesis" | "btc_alert";
  title: string;
  publisher: string;
  date: string | null;
  use: string;
};

export const EXTERNAL_REFERENCES: readonly ExternalReference[] = [
  {
    id: "company_thesis",
    title: "Tesis de estilo corporativo sobre una app de consumo para aprender idiomas",
    publisher: "Boletín de Substack, según lo transmitió el autor",
    date: null,
    use: "Lente: interacción, monetización, foso competitivo, amenazas, casos alcista y bajista.",
  },
  {
    id: "btc_alert",
    title: "Alerta de investigación sobre Bitcoin (técnico, posicionamiento, fundamentales, sentimiento, riesgos, qué cambiaría la visión)",
    publisher: "Mesa de investigación de Galaxy, según lo transmitió el autor",
    date: "2026-10-22",
    use: "Lente y contraste de la alarma. No se reproduce: el original prohíbe su redistribución.",
  },
];

export const EXTERNAL_FIGURES: readonly { id: string; label: string; value: number; unit: MetricUnit }[] = [
  { id: "ref_duol_paid_share_pct", label: "Empresa de referencia: proporción de usuarios que pagan (transmitida)", value: 9, unit: "pct" },
  { id: "ref_duol_dau_growth_pct", label: "Empresa de referencia: crecimiento de usuarios activos diarios (transmitido)", value: 51, unit: "pct" },
  { id: "ref_duol_gross_margin_pct", label: "Empresa de referencia: margen bruto (transmitido)", value: 73, unit: "pct" },
  { id: "ref_btc_tripwire_usd", label: "Tesis de referencia de BTC: nivel de alarma sobre el promedio semanal (transmitido)", value: 76540, unit: "usd" },
  { id: "ref_btc_cycle_day", label: "Tesis de referencia de BTC: día del ciclo posterior al halving (transmitido)", value: 916, unit: "count" },
  { id: "ref_us_debt_trn", label: "Tesis de referencia de BTC: deuda federal de EE. UU. en billones de dólares (transmitida)", value: 40.44, unit: "ratio" },
  { id: "ref_us_10y_pct", label: "Tesis de referencia de BTC: rendimiento del bono del Tesoro a diez años (transmitido)", value: 5.31, unit: "pct" },
];

export const EXTERNAL_NOTE = "Transmitido por el autor desde un documento externo; sin verificación independiente. Se usa como lente, nunca como evidencia sobre NEAR.";

export function externalValues(): Record<string, number> {
  return Object.fromEntries(EXTERNAL_FIGURES.map((f) => [f.id, f.value]));
}
