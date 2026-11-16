import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { hasSupabaseAuth, loadEnv } from "../config/env";
import { createLogger } from "../lib/logger";
import { isMain, repoPath } from "../lib/paths";
import { crearRepositorio } from "../noticias/repositorio";
import { crearGuardia, politicaAcceso, rutasAcceso } from "./acceso";
import { crearManejador, Enrutador, rutasNoticias, type Dependencias } from "./app";
import { crearClienteAuth, type ClienteAuth } from "./supabase-auth";

const log = createLogger("server");

export type DependenciasServidor = Dependencias & { auth?: ClienteAuth | null };

export function crearServidor(d: DependenciasServidor) {
  const auth = d.auth !== undefined ? d.auth : hasSupabaseAuth(d.env) ? crearClienteAuth(d.env.SUPABASE_URL as string, d.env.SUPABASE_ANON_KEY as string) : null;
  const acceso = { env: d.env, fuente: d.repo.tipo, auth };
  const enrutador = rutasAcceso(rutasNoticias(new Enrutador(), d), acceso);
  const manejador = crearManejador(d, enrutador, crearGuardia(acceso));
  return createServer((req, res) => void manejador(req, res));
}

function main() {
  const env = loadEnv();
  const version = (JSON.parse(readFileSync(repoPath("package.json"), "utf8")) as { version: string }).version;
  const repo = crearRepositorio(env);
  const politica = politicaAcceso(env, repo.tipo);
  if (politica === "bloqueado") log.error("hay datos reales pero el acceso no está configurado: la API no servirá noticias");
  if (politica === "abierto-local") log.warn("datos reales sin acceso configurado: abierto solo porque NODE_ENV no es production");
  const servidor = crearServidor({ env, repo, distDir: repoPath("dist"), version });
  servidor.listen(env.PORT, () => {
    log.info("servidor listo", { puerto: env.PORT, fuente: repo.tipo, politica });
    process.stdout.write(`ubitwo escuchando en http://localhost:${env.PORT} · noticias: ${repo.tipo} · acceso: ${politica}\n`);
  });
  const cerrar = () => servidor.close(() => process.exit(0));
  process.on("SIGTERM", cerrar);
  process.on("SIGINT", cerrar);
}

if (isMain("src/server/index.ts")) main();
