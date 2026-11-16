const SECRET_HEADER = /^(authorization|x-api-key|x-goog-api-key|apikey|cookie|set-cookie|notion-token)$/i;
const SECRET_KEY = /(token|secret|password|api[_-]?key|apikey|jwt|authorization|credential|service[_-]?role|cookie)/i;
const JWT_LIKE = /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g;
const BEARER = /(Bearer\s+)[^\s"']+/gi;
const NOTION_TOKEN = /\b(ntn|secret)_[A-Za-z0-9]{20,}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const QUERY_KEY = /([?&](?:key|api_key|apikey|token|access_token)=)[^&\s"']+/gi;

export const REDACTED = "[REDACTADO]";
export const EMAIL_PLACEHOLDER = "[correo]";

/** Quita correos de texto que se publica (extractos de Notion): las notas privadas a veces los contienen. */
export function scrubPii(value: string): string {
  return value.replace(EMAIL, EMAIL_PLACEHOLDER);
}

export function redactString(value: string): string {
  return scrubPii(
    value
      .replace(BEARER, `$1${REDACTED}`)
      .replace(JWT_LIKE, REDACTED)
      .replace(NOTION_TOKEN, REDACTED)
      .replace(QUERY_KEY, `$1${REDACTED}`),
  );
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k, SECRET_HEADER.test(k) ? REDACTED : redactString(v)]),
  );
}

export function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? REDACTED : redactDeep(v)]),
    );
  }
  return value;
}
