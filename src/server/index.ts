import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { loadEnv } from "../config/env";
import { createLogger } from "../lib/logger";
import { isMain, repoPath } from "../lib/paths";
import { crearRepositorio } from "../noticias/repositorio";
import { crearManejador, Enrutador, rutasNoticias, type Dependencias } from "./app";

const log = createLogger("server");

export function crearServidor(d: Dependencias) {
  const enrutador = rutasNoticias(new Enrutador(), d);
  const manejador = crearManejador(d, enrutador);
  return createServer((req, res) => void manejador(req, res));
}

function main() {
  const env = loadEnv();
  const version = (JSON.parse(readFileSync(repoPath("package.json"), "utf8")) as { version: string }).version;
  const repo = crearRepositorio(env);
  const servidor = crearServidor({ env, repo, distDir: repoPath("dist"), version });
  servidor.listen(env.PORT, () => {
    log.info("servidor listo", { puerto: env.PORT, fuente: repo.tipo });
    process.stdout.write(`ubitwo escuchando en http://localhost:${env.PORT} · fuente de noticias: ${repo.tipo}\n`);
  });
  const cerrar = () => servidor.close(() => process.exit(0));
  process.on("SIGTERM", cerrar);
  process.on("SIGINT", cerrar);
}

if (isMain("src/server/index.ts")) main();
