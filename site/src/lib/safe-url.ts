/** Returns the URL only if it is https; anything else (javascript:, data:, odd paths) is dropped so it never reaches an href. */
export function safeHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}
