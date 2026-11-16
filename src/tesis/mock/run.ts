import { rmSync } from "node:fs";
import { createLogger } from "../../lib/logger";
import { addDays, weekStart } from "../../lib/dates";
import { dataRoot, writeJson } from "../../lib/files";
import { isMain } from "../../lib/paths";
import { buildWeekly } from "../oso/weekly";
import { datasetFile, type BisonteDatasetId, type BisonteManifest } from "../esquemas/bisonte";
import type { Inputs, BisonteData } from "../toro/load";
import { createRng } from "./prng";
import { mockBisonte } from "./bisonte";
import { mockOso } from "./oso";
import { mockDesk, mockNotion } from "./desk";
import { mockPrice } from "./price";

const log = createLogger("mock");

/** Fixed anchor so the simulated scenario (and its tests) never drift. */
export const MOCK_END = "2026-11-14";
const SEED = 20261109;
const PRICE_SEED = 20261180;
const PRICE_DAYS = 420;

/** Full simulated scenario in memory; `main` only persists it. */
export function buildMockInputs(root = dataRoot("mock")): Inputs {
  const rng = createRng(SEED);
  const { start, datasets } = mockBisonte(rng, MOCK_END, 180, 90);
  const items: BisonteManifest["items"] = (Object.entries(datasets) as [BisonteDatasetId, unknown[]][]).map(([id, rows]) => ({
    id, file: datasetFile(root, id), source: "mock",
    query_file: id === "intents_daily" ? null : `src/tesis/bisonte/bq/queries/${id}.sql`,
    endpoint: id === "intents_daily" ? "mock://intents-explorer/transactions" : null,
    params: { start_date: start, end_date: MOCK_END }, rows: rows.length, bytes_processed: null,
    fetched_at: `${MOCK_END}T06:00:00.000Z`,
  }));
  const manifest: BisonteManifest = {
    mode: "mock", generated_at: `${MOCK_END}T06:00:00.000Z`, window: { start, end: MOCK_END },
    freshness: { last_block_date: addDays(MOCK_END, -1), checked_at: `${MOCK_END}T06:00:00.000Z` }, items,
  };
  const osoDaily = mockOso(rng, MOCK_END, 5, addDays(MOCK_END, -7));
  const osoWeekly = [...new Set(osoDaily.map((d) => weekStart(d.date)))].map((monday) => buildWeekly(osoDaily, monday));
  const generatedAt = `${MOCK_END}T06:00:00.000Z`;
  return {
    mode: "mock", manifest, bisonte: datasets as BisonteData, osoDaily, osoWeekly,
    osoNotion: mockNotion(generatedAt), desk: mockDesk(generatedAt), price: mockPrice(PRICE_SEED, MOCK_END, PRICE_DAYS, generatedAt),
  };
}

function main() {
  const root = dataRoot("mock");
  rmSync(root, { recursive: true, force: true });
  const inputs = buildMockInputs(root);
  for (const item of inputs.manifest.items) {
    writeJson(item.file, { mode: "mock", id: item.id, rows: inputs.bisonte[item.id as BisonteDatasetId] });
  }
  writeJson(`${root}/raw/manifest.json`, inputs.manifest);
  for (const d of inputs.osoDaily) writeJson(`${root}/oso/daily/${d.date}.json`, d);
  for (const w of inputs.osoWeekly) writeJson(`${root}/oso/weekly/${w.week}.json`, w);
  writeJson(`${root}/oso/notion/near.json`, inputs.osoNotion);
  writeJson(`${root}/oso/desk/near.json`, inputs.desk);
  if (inputs.price) {
    writeJson(`${root}/raw/price/near.json`, inputs.price.near);
    writeJson(`${root}/raw/price/btc.json`, inputs.price.btc);
  }
  log.info("simulated data written", { root, days: inputs.osoDaily.length });
}

if (isMain("src/tesis/mock/run.ts")) main();
