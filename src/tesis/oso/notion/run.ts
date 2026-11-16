import { loadEnv } from "../../../config/env";
import { createLogger } from "../../../lib/logger";
import { dataRoot, writeJson } from "../../../lib/files";
import { ingestFromEnv } from "./ingest";

const log = createLogger("oso:notion");

async function main() {
  const env = loadEnv();
  if (env.DATA_MODE !== "live") throw new Error("oso:notion solo corre con DATA_MODE=live; usa `pnpm tesis:mock` para datos simulados");
  if (!env.NOTION_TOKEN) {
    log.warn("falta NOTION_TOKEN; se omite la ingesta de Notion. Defínelo en .env o como secreto de Render (sync: false).");
    process.stdout.write("oso:notion omitido (sin NOTION_TOKEN)\n");
    return;
  }
  const snap = await ingestFromEnv({ env, token: env.NOTION_TOKEN });
  const path = `${dataRoot("live")}/oso/notion/near.json`;
  writeJson(path, snap);
  log.info("instantánea de notion escrita", { path, hits: snap.hits.length, scanned: snap.counts.scanned_pages });
  process.stdout.write(`oso:notion OK · ${snap.hits.length} filas de NEAR · ${snap.counts.scanned_pages} páginas leídas\n`);
}

main().catch((err: unknown) => {
  log.error("oso notion falló", { error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
