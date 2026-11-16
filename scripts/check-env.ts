import { hasLlm, hasNotionNoticias, hasSupabase, hasSupabaseAuth, loadEnv, type Env } from "../src/config/env";
import { isMain } from "../src/lib/paths";

export type Revision = { nombre: string; listo: boolean; faltan: string[]; sin: string };

/** Qué funciones quedan activas con las variables actuales. Solo nombres de variables, nunca valores. */
export function revisar(env: Env): Revision[] {
  const faltan = (claves: (keyof Env)[]) => claves.filter((k) => env[k] === undefined || (Array.isArray(env[k]) && (env[k] as unknown[]).length === 0));
  const llm: (keyof Env)[] = env.LLM_PROVIDER === "xai" ? ["XAI_API_KEY"] : ["GEMINI_API_KEY", "LLM_MODEL"];
  return [
    { nombre: "Base de datos (Supabase)", listo: hasSupabase(env), faltan: faltan(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]), sin: "las noticias salen de data/noticias o de la demostración" },
    { nombre: "Noticias desde Notion", listo: hasNotionNoticias(env), faltan: faltan(["NOTION_TOKEN", "NOTION_DB_RESUMENES"]), sin: "pnpm noticias:sync no puede correr" },
    { nombre: "Inicio de sesión", listo: hasSupabaseAuth(env) && Boolean(env.SESSION_SECRET) && env.EMAILS_PERMITIDOS.length > 0, faltan: faltan(["SUPABASE_URL", "SUPABASE_ANON_KEY", "SESSION_SECRET", "EMAILS_PERMITIDOS"]), sin: "en producción, con datos reales, la API queda bloqueada" },
    { nombre: "Dirección pública", listo: Boolean(env.APP_URL), faltan: faltan(["APP_URL"]), sin: "el enlace mágico no puede volver al sitio en producción" },
    { nombre: `IA (${env.LLM_PROVIDER})`, listo: hasLlm(env), faltan: faltan(llm), sin: "«Pregunta» responde con fragmentos, sin IA" },
    { nombre: "Tesis en vivo (BigQuery)", listo: Boolean(env.GCP_PROJECT_ID && env.GOOGLE_APPLICATION_CREDENTIALS), faltan: faltan(["GCP_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS"]), sin: "la tesis usa el escenario simulado" },
  ];
}

function main() {
  let env: Env;
  try {
    env = loadEnv();
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`ubitwo · NODE_ENV=${env.NODE_ENV} · DATA_MODE=${env.DATA_MODE}\n\n`);
  for (const r of revisar(env)) {
    process.stdout.write(`${r.listo ? "✓" : "○"} ${r.nombre}${r.listo ? "" : ` — faltan: ${r.faltan.join(", ") || "revisar valores"} (sin esto, ${r.sin})`}\n`);
  }
  process.stdout.write("\nGuía: docs/conectar-render-notion-supabase.md\n");
}

if (isMain("scripts/check-env.ts")) main();
