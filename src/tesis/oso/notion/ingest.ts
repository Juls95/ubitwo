import type { Env } from "../../../config/env";
import { OsoNotionHit } from "../../esquemas/oso";
import {
  ANALYSES_FILTER,
  CREATIVE_FILTER,
  MIN_INTERVAL_MS,
  TICKERS_FILTER,
  queryDatabase,
  type NotionPage,
} from "./client";
import { loadNotionConfig } from "./config";
import { hitFromDesk, hitFromTicker, summarize } from "./summarize";

export type IngestOptions = {
  env: Env;
  token: string;
  generatedAt?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

function keep(page: NotionPage, hit: OsoNotionHit | null, discarded: { n: number }): OsoNotionHit | null {
  if (hit) return hit;
  discarded.n += 1;
  return null;
}

/** Consulta las tres tablas de Notion de Oso, conserva solo las filas del ecosistema NEAR y escribe una instantánea tipada. */
export async function ingestFromEnv({ env, token, generatedAt, fetchImpl, sleep }: IngestOptions) {
  const cfg = loadNotionConfig(env);
  const wait = sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const discarded = { n: 0 };
  let scanned = 0;

  const tickersPages = await queryDatabase({
    token, version: cfg.version, databaseId: cfg.databases.tickers_info, filter: TICKERS_FILTER, fetchImpl, sleep: wait,
  });
  scanned += tickersPages.length;
  const tickers = tickersPages.map((p) => keep(p, hitFromTicker(p), discarded)).filter((h): h is OsoNotionHit => h !== null);

  await wait(MIN_INTERVAL_MS);
  const creativePages = await queryDatabase({
    token, version: cfg.version, databaseId: cfg.databases.x_creative_output, filter: CREATIVE_FILTER, fetchImpl, sleep: wait,
  });
  scanned += creativePages.length;
  const creative = creativePages.map((p) => keep(p, hitFromDesk(p, "x_creative_output"), discarded)).filter((h): h is OsoNotionHit => h !== null);

  await wait(MIN_INTERVAL_MS);
  const analysesPages = await queryDatabase({
    token, version: cfg.version, databaseId: cfg.databases.x_account_analyses, filter: ANALYSES_FILTER, fetchImpl, sleep: wait,
  });
  scanned += analysesPages.length;
  const analyses = analysesPages.map((p) => keep(p, hitFromDesk(p, "x_account_analyses"), discarded)).filter((h): h is OsoNotionHit => h !== null);

  const hits = [...tickers, ...creative, ...analyses];
  return summarize({
    mode: env.DATA_MODE,
    generated_at: generatedAt ?? new Date().toISOString(),
    databases: cfg.databases,
    scanned_pages: scanned,
    discarded_false_positives: discarded.n,
    hits,
  });
}
