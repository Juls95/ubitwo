import type { z } from "zod";
import { createLogger } from "./logger";
import { redactDeep, redactHeaders, redactString } from "./redact";

const log = createLogger("http");

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | undefined,
    readonly body: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type HttpRequest<T> = {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  schema: z.ZodType<T>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Las credenciales viajan en cabeceras: solo por TLS, salvo un Supabase local en loopback. */
export function isSafeUrl(url: string): boolean {
  const u = new URL(url);
  return u.protocol === "https:" || (u.protocol === "http:" && LOOPBACK.has(u.hostname));
}

/** fetch tipado: valida la respuesta con zod y, si falla, registra la petición y la respuesta completas (redactadas). */
export async function requestJson<T>({
  url,
  method = "GET",
  headers = {},
  body,
  schema,
  fetchImpl = fetch,
  timeoutMs = 30_000,
}: HttpRequest<T>): Promise<T> {
  if (!isSafeUrl(url)) throw new Error(`Request rejected: must use https: ${redactString(url)}`);
  const allHeaders = { "Content-Type": "application/json", ...headers };
  const request = { method, url: redactString(url), headers: redactHeaders(allHeaders), body: redactDeep(body) };
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method,
      headers: allHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    log.error("request got no response", { request, error: String(err) });
    throw new HttpError(`${method} ${redactString(url)} -> no response`, 0, undefined, "");
  }
  const text = await res.text();
  const context = { request, response: { status: res.status, body: redactString(text.slice(0, 4000)) } };
  if (!res.ok) {
    log.error("request failed", context);
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new HttpError(
      `${method} ${redactString(url)} -> ${res.status}`,
      res.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
      text,
    );
  }
  let json: unknown = null;
  if (text.trim() !== "") {
    try {
      json = JSON.parse(text);
    } catch {
      log.error("response is not JSON", context);
      throw new HttpError(`${method} ${redactString(url)} -> invalid JSON`, res.status, undefined, text);
    }
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    log.error("response does not match schema", { ...context, issues: parsed.error.issues.slice(0, 10) });
    throw new HttpError(`${method} ${redactString(url)} -> schema mismatch`, res.status, undefined, text);
  }
  return parsed.data;
}
