import type { IncomingMessage, ServerResponse } from "node:http";
import { SECURITY_HEADERS } from "../config/security-headers";

export class ErrorHttp extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ErrorHttp";
  }
}

export function aplicarCabeceras(res: ServerResponse): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
}

export function enviarJson(res: ServerResponse, status: number, data: unknown, extra: Record<string, string | string[]> = {}): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    ...extra,
  });
  res.end(body);
}

/** Lee un cuerpo JSON con límite de tamaño; rechaza otros tipos de contenido. */
export async function leerJson(req: IncomingMessage, maxBytes = 16_384): Promise<unknown> {
  const tipo = String(req.headers["content-type"] ?? "");
  if (!tipo.toLowerCase().startsWith("application/json")) throw new ErrorHttp(415, "Se esperaba Content-Type: application/json");
  const partes: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const b = chunk as Buffer;
    total += b.length;
    if (total > maxBytes) throw new ErrorHttp(413, "El cuerpo de la petición es demasiado grande");
    partes.push(b);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8") || "null") as unknown;
  } catch {
    throw new ErrorHttp(400, "El cuerpo no es JSON válido");
  }
}

/** IP del cliente. Detrás del proxy de Render se confía en el primer valor de X-Forwarded-For. */
export function ipCliente(req: IncomingMessage, confiarEnProxy: boolean): string {
  const fwd = req.headers["x-forwarded-for"];
  if (confiarEnProxy && typeof fwd === "string" && fwd) return fwd.split(",")[0]?.trim() || "desconocida";
  return req.socket.remoteAddress ?? "desconocida";
}

/** Ventana fija por minuto y por clave (IP). Suficiente para una sola instancia; en memoria a propósito. */
export function crearLimitador(porMinuto: number, ahora: () => number = Date.now) {
  const ventanas = new Map<string, { inicio: number; n: number }>();
  return {
    permitir(clave: string): { ok: boolean; reintentarEn: number } {
      const t = ahora();
      const v = ventanas.get(clave);
      if (!v || t - v.inicio >= 60_000) {
        ventanas.set(clave, { inicio: t, n: 1 });
        if (ventanas.size > 10_000) for (const [k, w] of ventanas) if (t - w.inicio >= 60_000) ventanas.delete(k);
        return { ok: true, reintentarEn: 0 };
      }
      v.n++;
      return v.n <= porMinuto ? { ok: true, reintentarEn: 0 } : { ok: false, reintentarEn: Math.ceil((60_000 - (t - v.inicio)) / 1000) };
    },
  };
}

export function leerCookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const parte of String(req.headers.cookie ?? "").split(";")) {
    const i = parte.indexOf("=");
    if (i <= 0) continue;
    const k = parte.slice(0, i).trim();
    try {
      out[k] = decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      // Una cookie mal codificada se ignora.
    }
  }
  return out;
}
