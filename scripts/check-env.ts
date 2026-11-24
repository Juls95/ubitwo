import { hasLlm, hasNotionNoticias, hasSupabase, hasSupabaseAuth, loadEnv, type Env } from "../src/config/env";
import { isMain } from "../src/lib/paths";

export type Revision = { nombre: string; listo: boolean; faltan: string[]; sin: string };

/** Which features are active with the current variables. Variable names only, never values. */
export function revisar(env: Env): Revision[] {
  const faltan = (claves: (keyof Env)[]) => claves.filter((k) => env[k] === undefined || (Array.isArray(env[k]) && (env[k] as unknown[]).length === 0));
  const llm: (keyof Env)[] = env.LLM_PROVIDER === "xai" ? ["XAI_API_KEY"] : ["GEMINI_API_KEY", "LLM_MODEL"];
  return [
    { nombre: "Database (Supabase)", listo: hasSupabase(env), faltan: faltan(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]), sin: "news comes from data/noticias or the demo" },
    { nombre: "News from Notion", listo: hasNotionNoticias(env), faltan: faltan(["NOTION_TOKEN", "NOTION_DB_RESUMENES"]), sin: "pnpm noticias:sync cannot run" },
    { nombre: "Sign-in", listo: hasSupabaseAuth(env) && Boolean(env.SESSION_SECRET) && env.EMAILS_PERMITIDOS.length > 0, faltan: faltan(["SUPABASE_URL", "SUPABASE_ANON_KEY", "SESSION_SECRET", "EMAILS_PERMITIDOS"]), sin: "in production with real data, the API stays blocked" },
    { nombre: "Public URL", listo: Boolean(env.APP_URL), faltan: faltan(["APP_URL"]), sin: "the magic link cannot return to the site in production" },
    { nombre: `AI (${env.LLM_PROVIDER})`, listo: hasLlm(env), faltan: faltan(llm), sin: "Ask answers with fragments, without AI" },
    { nombre: "Live thesis (BigQuery)", listo: Boolean(env.GCP_PROJECT_ID && env.GOOGLE_APPLICATION_CREDENTIALS), faltan: faltan(["GCP_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS"]), sin: "the thesis uses the simulated scenario" },
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
    process.stdout.write(`${r.listo ? "✓" : "○"} ${r.nombre}${r.listo ? "" : ` — missing: ${r.faltan.join(", ") || "check values"} (without this, ${r.sin})`}\n`);
  }
  process.stdout.write("\nGuide: docs/conectar-render-notion-supabase.md\n");
}

if (isMain("scripts/check-env.ts")) main();
