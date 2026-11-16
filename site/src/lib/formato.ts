import type { Postura, Sesgo, TipoActivo } from "../../../src/noticias/esquema";

const fechaLarga = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fechaCorta = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Monday, November 16" from YYYY-MM-DD (always UTC: the digest date does not depend on the reader's timezone). */
export const formatoFechaLarga = (iso: string) => fechaLarga.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
export const formatoFechaCorta = (iso: string) => fechaCorta.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

export const ETIQUETA_POSTURA: Record<Postura, string> = { alcista: "Bullish", bajista: "Bearish", neutral: "Neutral", mixta: "Mixed" };
export const ETIQUETA_SESGO: Record<Sesgo, string> = { alcista: "Bullish", bajista: "Bearish", neutral: "Neutral", mixto: "Mixed", "sin datos": "No data" };
export const ETIQUETA_TIPO: Record<TipoActivo, string> = { accion: "Stock", cripto: "Crypto", indice: "Index", otro: "Other" };
export const ICONO_POSTURA: Record<Postura, string> = { alcista: "▲", bajista: "▼", neutral: "■", mixta: "◆" };

/** Stable agent ids stay Spanish; display names are English. */
export const NOMBRE_AGENTE: Record<"oso" | "bisonte" | "toro", string> = {
  oso: "Bear",
  bisonte: "Bison",
  toro: "Bull",
};

/** Home headline from the day's bias: never invents figures. */
export function titularDelDia(sesgo: Sesgo | null): string {
  switch (sesgo) {
    case "alcista": return "Today the agora opens bullish.";
    case "bajista": return "Today the agora opens bearish.";
    case "mixto": return "Today the agora is divided.";
    case "neutral": return "Today the agora waits.";
    default: return "No daily digest yet.";
  }
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
