import { existsSync } from "node:fs";
import { z } from "zod";

/** Una variable vacía (frecuente en paneles como Render) cuenta como no definida. */
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const withDefault = <T extends z.ZodType>(schema: T, value: z.input<T>) =>
  z.preprocess((v) => (v === "" || v === undefined ? value : v), schema);

const EmailList = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [],
  z.array(z.email()),
);

const EnvSchema = z.object({
  NODE_ENV: withDefault(z.enum(["development", "production", "test"]), "development"),

  // Tesis: mock | live. "mock" escribe en data/mock/tesis; "live" en data/tesis.
  DATA_MODE: withDefault(z.enum(["mock", "live"]), "live"),

  // Capa LLM: cambiar de modelo es cambiar una variable.
  LLM_PROVIDER: withDefault(z.enum(["gemini", "xai"]), "gemini"),
  LLM_MODEL: optional(z.string().min(1)),
  GEMINI_API_KEY: optional(z.string().min(1)),
  XAI_API_KEY: optional(z.string().min(1)),
  XAI_MODEL: withDefault(z.string().min(1), "grok-4.7"),
  XAI_MAX_TURNS: withDefault(z.coerce.number().int().positive(), 2),

  // Tesis · Bisonte (BigQuery + Intents).
  GCP_PROJECT_ID: optional(z.string().min(1)),
  GOOGLE_APPLICATION_CREDENTIALS: optional(z.string().min(1)),
  BQ_MAX_BYTES: withDefault(z.coerce.number().int().positive(), 20_000_000_000),
  BQ_WINDOW_DAYS: withDefault(z.coerce.number().int().positive(), 180),
  INTENTS_JWT: optional(z.string().min(1)),
  INTENTS_CONTRACT: withDefault(z.string().min(1), "intents.near"),
  INTENTS_WINDOW_DAYS: withDefault(z.coerce.number().int().positive(), 90),

  // Notion: un solo token de integración para noticias y tesis.
  NOTION_TOKEN: optional(z.string().min(1)),
  NOTION_VERSION: withDefault(z.string().min(1), "2022-06-28"),
  NOTION_DB_RESUMENES: optional(z.string().min(1)),
  NOTION_PROP_USUARIO: optional(z.string().min(1)),
  NOTION_FILTRO_USUARIO: optional(z.email()),
  NOTION_DB_TICKERS_INFO: optional(z.string().min(1)),
  NOTION_DB_X_CREATIVE: optional(z.string().min(1)),
  NOTION_DB_X_ANALYSES: optional(z.string().min(1)),

  // Supabase: la service role solo vive en el servidor y en el job de sincronización.
  SUPABASE_URL: optional(z.url()),
  SUPABASE_ANON_KEY: optional(z.string().min(1)),
  SUPABASE_SERVICE_ROLE_KEY: optional(z.string().min(1)),
  ESPACIO_ID: withDefault(z.string().regex(/^[a-z0-9-]{1,40}$/, "lowercase letters, numbers, and hyphens only"), "principal"),

  // Web server.
  PORT: withDefault(z.coerce.number().int().min(1).max(65535), 3000),
  APP_URL: optional(z.url()),
  SESSION_SECRET: optional(z.string().min(32, "SESSION_SECRET must be at least 32 characters")),
  EMAILS_PERMITIDOS: EmailList,
  LIMITE_PETICIONES_POR_MINUTO: withDefault(z.coerce.number().int().positive(), 120),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source === process.env && cached) return cached;
  if (source === process.env && existsSync(".env")) process.loadEnvFile(".env");
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}

/** Fail fast when a command needs credentials that are not configured. */
export function requireEnv<K extends keyof Env>(env: Env, keys: readonly K[]): { [P in K]-?: NonNullable<Env[P]> } {
  const missing = keys.filter((k) => env[k] === undefined || env[k] === "");
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See .env.example.`);
  }
  return env as unknown as { [P in K]-?: NonNullable<Env[P]> };
}

export const hasSupabase = (env: Env): boolean => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
export const hasSupabaseAuth = (env: Env): boolean => Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
export const hasNotionNoticias = (env: Env): boolean => Boolean(env.NOTION_TOKEN && env.NOTION_DB_RESUMENES);
export const hasLlm = (env: Env): boolean =>
  env.LLM_PROVIDER === "xai" ? Boolean(env.XAI_API_KEY) : Boolean(env.GEMINI_API_KEY && env.LLM_MODEL);
