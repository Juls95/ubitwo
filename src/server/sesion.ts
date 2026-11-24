import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const COOKIE_SESION = "ubitwo_sesion";
export const DURACION_SESION_S = 7 * 24 * 3600;

const Carga = z.object({ email: z.email(), exp: z.number().int() });
export type Carga = z.infer<typeof Carga>;

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const firma = (datos: string, secreto: string) => createHmac("sha256", secreto).update(datos).digest("base64url");

/** Own session token: base64url payload + HMAC-SHA256. Does not contain Supabase tokens. */
export function firmarSesion(email: string, secreto: string, ahora = Date.now()): string {
  const datos = b64(JSON.stringify({ email: email.toLowerCase(), exp: Math.floor(ahora / 1000) + DURACION_SESION_S }));
  return `${datos}.${firma(datos, secreto)}`;
}

export function verificarSesion(token: string | undefined, secreto: string, ahora = Date.now()): Carga | null {
  if (!token) return null;
  const [datos, f, sobra] = token.split(".");
  if (!datos || !f || sobra !== undefined) return null;
  const esperada = Buffer.from(firma(datos, secreto));
  const recibida = Buffer.from(f);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  let carga: unknown;
  try {
    carga = JSON.parse(Buffer.from(datos, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const r = Carga.safeParse(carga);
  if (!r.success || r.data.exp * 1000 <= ahora) return null;
  return r.data;
}

export function cookieSesion(valor: string, seguro: boolean, maxAge = DURACION_SESION_S): string {
  return [`${COOKIE_SESION}=${encodeURIComponent(valor)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`, ...(seguro ? ["Secure"] : [])].join("; ");
}

export const cookieBorrada = (seguro: boolean) => cookieSesion("", seguro, 0);
