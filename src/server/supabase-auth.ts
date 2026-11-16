import { z } from "zod";
import { requestJson } from "../lib/http";

export type ClienteAuth = {
  /** Envía el correo con el enlace mágico. `crearUsuario` solo es true para correos de la lista permitida. */
  enviarEnlace(email: string, redirigirA: string, crearUsuario: boolean): Promise<void>;
  /** Valida un access token de Supabase y devuelve el correo del usuario. */
  usuario(accessToken: string): Promise<{ email: string }>;
};

const Usuario = z.looseObject({ email: z.email() });

/** Supabase Auth por REST con la clave anon (pública). La service role nunca se usa aquí. */
export function crearClienteAuth(url: string, anonKey: string, fetchImpl?: typeof fetch): ClienteAuth {
  const base = `${url.replace(/\/$/, "")}/auth/v1`;
  return {
    async enviarEnlace(email, redirigirA, crearUsuario) {
      await requestJson({
        url: `${base}/otp?redirect_to=${encodeURIComponent(redirigirA)}`,
        method: "POST",
        headers: { apikey: anonKey },
        body: { email, create_user: crearUsuario },
        schema: z.unknown(),
        fetchImpl,
      });
    },
    async usuario(accessToken) {
      const u = await requestJson({ url: `${base}/user`, headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, schema: Usuario, fetchImpl });
      return { email: u.email.toLowerCase() };
    },
  };
}
