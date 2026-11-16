/** Devuelve la URL solo si es https; cualquier otra cosa (javascript:, data:, rutas raras) se descarta para que nunca llegue a un href. */
export function safeHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}
