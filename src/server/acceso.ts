import { z } from "zod";
import { hasSupabaseAuth, type Env } from "../config/env";
import { createLogger } from "../lib/logger";
import type { TipoRepositorio } from "../noticias/repositorio";
import { parsear, type Contexto, type Enrutador, type Guardia } from "./app";
import { cookieBorrada, cookieSesion, COOKIE_SESION, firmarSesion, verificarSesion } from "./sesion";
import type { ClienteAuth } from "./supabase-auth";
import { crearLimitador, enviarJson, ErrorHttp, leerCookies, leerJson } from "./utilidades";

const log = createLogger("acceso");

/**
 * - abierto: demo data, nothing to protect.
 * - sesion: real data and Supabase Auth configured; sign-in required.
 * - abierto-local: real data without access configured, only outside production (UI warns).
 * - bloqueado: real data in production without access configured; API does not return data.
 */
export type Politica = "abierto" | "sesion" | "abierto-local" | "bloqueado";

/** No allowlist means no access: Supabase allows public signup with the anon key, so "any user" would be anyone. */
export function accesoConfigurado(env: Env): boolean {
  return hasSupabaseAuth(env) && Boolean(env.SESSION_SECRET) && env.EMAILS_PERMITIDOS.length > 0;
}

export function politicaAcceso(env: Env, fuente: TipoRepositorio): Politica {
  if (fuente === "demo") return "abierto";
  if (accesoConfigurado(env)) return "sesion";
  return env.NODE_ENV === "production" ? "bloqueado" : "abierto-local";
}

export function emailPermitido(env: Env, email: string): boolean {
  return env.EMAILS_PERMITIDOS.includes(email.toLowerCase());
}

/** Where the magic link returns. In production only APP_URL: never built from the Host header. */
export function urlRetorno(env: Env): string {
  if (env.APP_URL) return new URL("/login", env.APP_URL).toString();
  if (env.NODE_ENV === "production") throw new ErrorHttp(503, "APP_URL is missing: set it to the public URL of the service.");
  return `http://localhost:${env.PORT}/login`;
}

/** CSRF defense for POST: Origin must be this site (SameSite=Lax already stops the cookie from other sites). */
export function origenValido(ctx: Contexto, env: Env): boolean {
  const origin = ctx.req.headers.origin;
  if (!origin) return true;
  const permitidos = new Set<string>();
  if (env.APP_URL) permitidos.add(new URL(env.APP_URL).origin);
  const host = ctx.req.headers.host;
  if (host && env.NODE_ENV !== "production") permitidos.add(`http://${host}`);
  if (host) permitidos.add(`https://${host}`);
  return permitidos.has(origin);
}

const CuerpoEnlace = z.object({ email: z.email("Enter a valid email").max(254) });
const CuerpoVerificar = z.object({ access_token: z.string().min(20).max(4096) });

export type OpcionesAcceso = { env: Env; fuente: TipoRepositorio; auth: ClienteAuth | null };

export function usuarioDeSesion(ctx: Contexto, env: Env): string | null {
  if (!env.SESSION_SECRET) return null;
  const carga = verificarSesion(leerCookies(ctx.req)[COOKIE_SESION], env.SESSION_SECRET);
  return carga && emailPermitido(env, carga.email) ? carga.email : null;
}

export function crearGuardia({ env, fuente }: OpcionesAcceso): Guardia {
  const politica = politicaAcceso(env, fuente);
  return async (ctx) => {
    if (ctx.req.method === "POST" && !origenValido(ctx, env)) throw new ErrorHttp(403, "Origin not allowed");
    if (politica === "abierto" || politica === "abierto-local") return;
    if (politica === "bloqueado") {
      throw new ErrorHttp(503, "Access is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, SESSION_SECRET, and EMAILS_PERMITIDOS.");
    }
    if (!usuarioDeSesion(ctx, env)) throw new ErrorHttp(401, "Sign in to view the news.");
  };
}

export function rutasAcceso(enrutador: Enrutador, o: OpcionesAcceso): Enrutador {
  const { env, auth } = o;
  const politica = politicaAcceso(env, o.fuente);
  const seguro = env.NODE_ENV === "production";
  const limitadorEnlaces = crearLimitador(5);
  return enrutador
    .agregar(
      "GET",
      "/api/sesion",
      (ctx) => enviarJson(ctx.res, 200, { politica, usuario: usuarioDeSesion(ctx, env), acceso_configurado: accesoConfigurado(env) }),
      { publica: true },
    )
    .agregar(
      "POST",
      "/api/sesion/enlace",
      async (ctx) => {
        if (!origenValido(ctx, env)) throw new ErrorHttp(403, "Origin not allowed");
        if (!auth || !accesoConfigurado(env)) throw new ErrorHttp(503, "Sign-in is not configured yet.");
        if (!limitadorEnlaces.permitir(ctx.ip).ok) throw new ErrorHttp(429, "Too many attempts. Wait a minute.");
        const { email } = parsear(CuerpoEnlace, await leerJson(ctx.req));
        const correo = email.toLowerCase();
        // Same response whether or not the email is allowed, so we do not reveal who has access.
        if (emailPermitido(env, correo)) {
          try {
            await auth.enviarEnlace(correo, urlRetorno(env), true);
          } catch (err) {
            if (err instanceof ErrorHttp) throw err;
            log.warn("Supabase did not send the link", { error: (err as Error).message });
          }
        }
        enviarJson(ctx.res, 200, { ok: true, mensaje: "If your email has access, you will receive a sign-in link shortly." });
      },
      { publica: true },
    )
    .agregar(
      "POST",
      "/api/sesion/verificar",
      async (ctx) => {
        if (!origenValido(ctx, env)) throw new ErrorHttp(403, "Origin not allowed");
        if (!auth || !env.SESSION_SECRET || !accesoConfigurado(env)) throw new ErrorHttp(503, "Sign-in is not configured yet.");
        const { access_token } = parsear(CuerpoVerificar, await leerJson(ctx.req));
        let email: string;
        try {
          email = (await auth.usuario(access_token)).email;
        } catch {
          throw new ErrorHttp(401, "The link is invalid or has expired. Request a new one.");
        }
        if (!emailPermitido(env, email)) throw new ErrorHttp(403, "Your email does not have access to this space.");
        enviarJson(ctx.res, 200, { ok: true, usuario: email }, { "Set-Cookie": cookieSesion(firmarSesion(email, env.SESSION_SECRET), seguro) });
      },
      { publica: true },
    )
    .agregar(
      "POST",
      "/api/sesion/salir",
      (ctx) => {
        if (!origenValido(ctx, env)) throw new ErrorHttp(403, "Origin not allowed");
        enviarJson(ctx.res, 200, { ok: true }, { "Set-Cookie": cookieBorrada(seguro) });
      },
      { publica: true },
    );
}
