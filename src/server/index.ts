import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { hasSupabaseAuth, loadEnv } from "../config/env";
import { createLogger } from "../lib/logger";
import { isMain, repoPath } from "../lib/paths";
import { crearRepositorio } from "../noticias/repositorio";
import { crearGuardia, politicaAcceso, rutasAcceso } from "./acceso";
import { crearManejador, Enrutador, rutasNoticias, type Dependencias } from "./app";
import { maybeLlmClient, type LlmClient } from "../llm";
import { rutasPreguntar } from "./preguntar";
import { crearClienteAuth, type ClienteAuth } from "./supabase-auth";

const log = createLogger("server");

export type DependenciasServidor = Dependencias & { auth?: ClienteAuth | null; llm?: LlmClient | null };

export function crearServidor(d: DependenciasServidor) {
  const auth = d.auth !== undefined ? d.auth : hasSupabaseAuth(d.env) ? crearClienteAuth(d.env.SUPABASE_URL as string, d.env.SUPABASE_ANON_KEY as string) : null;
  const acceso = { env: d.env, fuente: d.repo.tipo, auth };
  const llm = d.llm !== undefined ? (d.llm ?? undefined) : maybeLlmClient(d.env);
  const enrutador = rutasPreguntar(rutasAcceso(rutasNoticias(new Enrutador(), d), acceso), { repo: d.repo, llm });
  const manejador = crearManejador(d, enrutador, crearGuardia(acceso));
  return createServer((req, res) => void manejador(req, res));
}

function main() {
  const env = loadEnv();
  const version = (JSON.parse(readFileSync(repoPath("package.json"), "utf8")) as { version: string }).version;
  const repo = crearRepositorio(env);
  const politica = politicaAcceso(env, repo.tipo);
  if (politica === "bloqueado") log.error("real data present but access is not configured: the API will not serve news");
  if (politica === "abierto-local") log.warn("real data without access configured: open only because NODE_ENV is not production");
  const servidor = crearServidor({ env, repo, distDir: repoPath("dist"), version });
  servidor.listen(env.PORT, () => {
    log.info("server ready", { puerto: env.PORT, fuente: repo.tipo, politica, ia: env.LLM_PROVIDER });
    process.stdout.write(`ubitwo listening on http://localhost:${env.PORT} · news: ${repo.tipo} · access: ${politica}\n`);
  });
  const cerrar = () => servidor.close(() => process.exit(0));
  process.on("SIGTERM", cerrar);
  process.on("SIGINT", cerrar);
}

if (isMain("src/server/index.ts")) main();
