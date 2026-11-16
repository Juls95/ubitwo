import { PARAMS, type ParamId } from "./params";
import type { Metric } from "./types";

export type RenderContext = {
  metrics: Record<string, Metric>;
  labels: Record<string, { value: string }>;
  blocks: Record<string, string>;
};

const PLACEHOLDER = /\{\{(metric|param|label|block|prov):([a-zA-Z0-9_]+)\}\}/g;
export const SENTINEL = "§";

const LOCALE = "es-MX";
const intFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const dec2 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const usdFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2Fmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const signed = (s: string, n: number) => (n > 0 ? `+${s}` : s);

export function formatMetric(m: Metric): string {
  const v = m.value;
  if (v === null) return "no disponible";
  switch (m.unit) {
    case "count": return intFmt.format(v);
    case "pct": return `${dec1.format(v)}%`;
    case "pp": return `${signed(dec1.format(v), v)} pp`;
    case "usd": return usdFmt.format(v);
    case "usd2": return usd2Fmt.format(v);
    case "corr": return dec2.format(v);
    case "days": return `${intFmt.format(v)} ${v === 1 ? "día" : "días"}`;
    case "index": return signed(dec2.format(v), v);
    case "ratio": return dec2.format(v);
  }
}

export class MissingPlaceholderError extends Error {}

/**
 * Renderiza {{metric|param|label|block|prov:id}} (prov = la palabra de procedencia de una métrica). En modo centinela cada valor
 * se vuelve «§», lo que le permite a `verify` demostrar que ningún dígito de la salida vino de texto escrito a mano.
 */
export function render(template: string, ctx: RenderContext, sentinel = false): string {
  return template.replace(PLACEHOLDER, (_all, kind: string, id: string) => {
    if (kind === "block") {
      const block = ctx.blocks[id];
      if (block === undefined) throw new MissingPlaceholderError(`Bloque desconocido: ${id}`);
      return render(block, ctx, sentinel);
    }
    if (kind === "metric") {
      const m = ctx.metrics[id];
      if (!m) throw new MissingPlaceholderError(`Métrica desconocida: ${id}`);
      return sentinel ? SENTINEL : formatMetric(m);
    }
    if (kind === "prov") {
      const m = ctx.metrics[id];
      if (!m) throw new MissingPlaceholderError(`Métrica desconocida para la procedencia: ${id}`);
      return sentinel ? SENTINEL : (m.provenance ?? "calculado");
    }
    if (kind === "param") {
      if (!(id in PARAMS)) throw new MissingPlaceholderError(`Parámetro desconocido: ${id}`);
      return sentinel ? SENTINEL : String(PARAMS[id as ParamId]);
    }
    const l = ctx.labels[id];
    if (!l) throw new MissingPlaceholderError(`Etiqueta desconocida: ${id}`);
    return sentinel ? SENTINEL : l.value;
  });
}

/** Dígitos permitidos en texto literal: el nombre de producto «1Click» y la numeración de secciones en markdown. */
export function strayDigits(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^(#{1,6}\s+)\d+\.\s/, "$1").replace(/1Click/g, ""))
    .flatMap((line, i) => (/\d/.test(line) ? [`línea ${i + 1}: ${line.trim().slice(0, 120)}`] : []));
}
