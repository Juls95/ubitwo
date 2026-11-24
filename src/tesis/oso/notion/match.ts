/** $NEAR al estilo ticker. */
const TICKER = /\$NEAR\b/;
/**
 * El token del ecosistema en MAYÚSCULAS. Rechaza las palabras inglesas "near" / "nearly" / "nearest".
 * Admite cuentas concatenadas como NEARProtocol / NEARIntents.
 */
const PROPER = /(^|[^A-Za-z])NEAR(Protocol|Intents)?(?![A-Za-z])/;

/** True cuando el texto habla del ecosistema NEAR, no del adverbio inglés. */
export function mentionsNear(text: string): boolean {
  if (!text) return false;
  return TICKER.test(text) || PROPER.test(text);
}

/** Título de TickersInfo: "NEAR" o cualquier cosa que empiece con "NEAR " (p. ej., NEAR Intents). */
export function isNearTicker(ticker: string): boolean {
  return /^NEAR(\s|$)/.test(ticker.trim());
}

export function mentionsNearFields(...fields: readonly (string | null | undefined)[]): boolean {
  return fields.some((f) => typeof f === "string" && mentionsNear(f));
}
