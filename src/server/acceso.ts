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
 * - abierto: datos de demostración, nada que proteger.
 * - sesion: datos reales y Supabase Auth configurado; hace falta iniciar sesión.
 * - abierto-local: datos reales sin acceso configurado, solo fuera de producción (se avisa en la UI).
 * - bloqueado: datos reales en producción sin acceso configurado; la API no responde datos.
 */
export type Politica = "abierto" | "sesion" | "abierto-local" | "bloqueado";

export function accesoConfigurado(env: Env): boolean {
  return hasSupabaseAuth(env) && Boolean(env.SESSION_SECRET);
}

export function politicaAcceso(env: Env, fuente: TipoRepositorio): Politica {
  if (fuente === "demo") return "abierto";
  if (accesoConfigurado(env)) return "sesion";
  return env.NODE_ENV === "production" ? "bloqueado" : "abierto-local";
}

export function emailPermitido(env: Env, email: string): boolean {
  return env.EMAILS_PERMITIDOS.length === 0 || env.EMAILS_PERMITIDOS.includes(email.toLowerCase());
}

/** A dónde vuelve el enlace mágico. En producción solo APP_URL: nunca se construye a partir de la cabecera Host. */
export function urlRetorno(env: Env): string {
  if (env.APP_URL) return new URL("/acceso", env.APP_URL).toString();
  if (env.NODE_ENV === "production") throw new ErrorHttp(503, "Falta APP_URL: configúrala con la URL pública del servicio.");
  return `http://localhost:${env.PORT}/acceso`;
}

/** Defensa CSRF para POST: el Origin debe ser el propio sitio (SameSite=Lax ya impide enviar la cookie desde otros sitios). */
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

const CuerpoEnlace = z.object({ email: z.email("Escribe un correo válido").max(254) });
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
    if (ctx.req.method === "POST" && !origenValido(ctx, env)) throw new ErrorHttp(403, "Origen no permitido");
    if (politica === "abierto" || politica === "abierto-local") return;
    if (politica === "bloqueado") {
      throw new ErrorHttp(503, "El acceso no está configurado. Define SUPABASE_URL, SUPABASE_ANON_KEY y SESSION_SECRET.");
    }
    if (!usuarioDeSesion(ctx, env)) throw new ErrorHttp(401, "Inicia sesión para ver las noticias.");
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
        if (!origenValido(ctx, env)) throw new ErrorHttp(403, "Origen no permitido");
        if (!auth || !accesoConfigurado(env)) throw new ErrorHttp(503, "El inicio de sesión no está configurado todavía.");
        if (!limitadorEnlaces.permitir(ctx.ip).ok) throw new ErrorHttp(429, "Demasiados intentos. Espera un minuto.");
        const { email } = parsear(CuerpoEnlace, await leerJson(ctx.req));
        const correo = email.toLowerCase();
        // Misma respuesta exista o no el correo, para no revelar quién tiene acceso.
        if (emailPermitido(env, correo)) {
          try {
            await auth.enviarEnlace(correo, urlRetorno(env), env.EMAILS_PERMITIDOS.includes(correo));
          } catch (err) {
            if (err instanceof ErrorHttp) throw err;
            log.warn("Supabase no envió el enlace", { error: (err as Error).message });
          }
        }
        enviarJson(ctx.res, 200, { ok: true, mensaje: "Si tu correo tiene acceso, en un momento recibirás un enlace para entrar." });
      },
      { publica: true },
    )
    .agregar(
      "POST",
      "/api/sesion/verificar",
      async (ctx) => {
        if (!origenValido(ctx, env)) throw new ErrorHttp(403, "Origen no permitido");
        if (!auth || !env.SESSION_SECRET) throw new ErrorHttp(503, "El inicio de sesión no está configurado todavía.");
        const { access_token } = parsear(CuerpoVerificar, await leerJson(ctx.req));
        let email: string;
        try {
          email = (await auth.usuario(access_token)).email;
        } catch {
          throw new ErrorHttp(401, "El enlace no es válido o ya caducó. Pide uno nuevo.");
        }
        if (!emailPermitido(env, email)) throw new ErrorHttp(403, "Tu correo no tiene acceso a este espacio.");
        enviarJson(ctx.res, 200, { ok: true, usuario: email }, { "Set-Cookie": cookieSesion(firmarSesion(email, env.SESSION_SECRET), seguro) });
      },
      { publica: true },
    )
    .agregar(
      "POST",
      "/api/sesion/salir",
      (ctx) => {
        if (!origenValido(ctx, env)) throw new ErrorHttp(403, "Origen no permitido");
        enviarJson(ctx.res, 200, { ok: true }, { "Set-Cookie": cookieBorrada(seguro) });
      },
      { publica: true },
    );
}
