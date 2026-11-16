import type { Postura, Sesgo, TipoActivo } from "../../../src/noticias/esquema";

const fechaLarga = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

/** "lunes, 16 de noviembre" a partir de AAAA-MM-DD (siempre en UTC: la fecha del resumen no depende de la zona del lector). */
export const formatoFechaLarga = (iso: string) => fechaLarga.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
export const formatoFechaCorta = (iso: string) => fechaCorta.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

export const ETIQUETA_POSTURA: Record<Postura, string> = { alcista: "Alcista", bajista: "Bajista", neutral: "Neutral", mixta: "Mixta" };
export const ETIQUETA_SESGO: Record<Sesgo, string> = { alcista: "Alcista", bajista: "Bajista", neutral: "Neutral", mixto: "Mixto", "sin datos": "Sin datos" };
export const ETIQUETA_TIPO: Record<TipoActivo, string> = { accion: "Acción", cripto: "Cripto", indice: "Índice", otro: "Otro" };
export const ICONO_POSTURA: Record<Postura, string> = { alcista: "▲", bajista: "▼", neutral: "■", mixta: "◆" };

/** Titular del inicio a partir del sesgo del día: nunca inventa cifras. */
export function titularDelDia(sesgo: Sesgo | null): string {
  switch (sesgo) {
    case "alcista": return "Hoy el ágora amanece alcista.";
    case "bajista": return "Hoy el ágora amanece bajista.";
    case "mixto": return "Hoy el ágora está dividida.";
    case "neutral": return "Hoy el ágora espera.";
    default: return "Todavía no hay resumen del día.";
  }
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
