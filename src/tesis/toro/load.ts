import { existsSync, readdirSync } from "node:fs";
import { z } from "zod";
import { dataRoot, readJson } from "../../lib/files";
import { BISONTE_DATASETS, BisonteManifest, DatasetFile, datasetFile, type BisonteDatasetId } from "../esquemas/bisonte";
import { OsoDaily, OsoNotionSnapshot, OsoWeekly } from "../esquemas/oso";
import type { DataMode } from "../../lib/esquemas";
import { DeskSnapshot, PriceSeries } from "../esquemas/mercado";
import type { PriceData } from "./technical";

type Rows<K extends BisonteDatasetId> = z.infer<(typeof BISONTE_DATASETS)[K]>[];
export type BisonteData = { [K in BisonteDatasetId]: Rows<K> };

export type Inputs = {
  mode: DataMode;
  manifest: BisonteManifest;
  bisonte: BisonteData;
  osoDaily: OsoDaily[];
  osoWeekly: OsoWeekly[];
  osoNotion: OsoNotionSnapshot | null;
  desk: DeskSnapshot | null;
  /** Velas diarias de NEAR y BTC. Null cuando no se ha configurado una fuente de precios aprobada. */
  price: PriceData | null;
};

function readDir<T>(dir: string, schema: z.ZodType<T>): T[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(`${dir}/${f}`, schema));
}

/** Price candles need both symbols; one without the other is a config error, not "no data". */
function loadPrice(root: string): PriceData | null {
  const nearPath = `${root}/raw/price/near.json`;
  const btcPath = `${root}/raw/price/btc.json`;
  const hasNear = existsSync(nearPath);
  const hasBtc = existsSync(btcPath);
  if (!hasNear && !hasBtc) return null;
  if (hasNear !== hasBtc) throw new Error(`Los datos de precio necesitan ambos archivos: ${nearPath} y ${btcPath}`);
  return { near: readJson(nearPath, PriceSeries), btc: readJson(btcPath, PriceSeries) };
}

/** Loads every artifact for a mode and refuses to mix simulated and live data. */
export function loadInputs(mode: DataMode): Inputs {
  const root = dataRoot(mode);
  const manifest = readJson(`${root}/raw/manifest.json`, BisonteManifest);
  const bisonte = {} as Record<BisonteDatasetId, unknown[]>;
  for (const id of Object.keys(BISONTE_DATASETS) as BisonteDatasetId[]) {
    const file = readJson(datasetFile(root, id), DatasetFile(BISONTE_DATASETS[id]));
    if (file.mode !== mode) throw new Error(`${id} tiene datos ${file.mode} pero la compilación corre en modo ${mode}`);
    bisonte[id] = file.rows;
  }
  const osoDaily = readDir(`${root}/oso/daily`, OsoDaily);
  const osoWeekly = readDir(`${root}/oso/weekly`, OsoWeekly);
  const notionPath = `${root}/oso/notion/near.json`;
  const osoNotion = existsSync(notionPath) ? readJson(notionPath, OsoNotionSnapshot) : null;
  const deskPath = `${root}/oso/desk/near.json`;
  const desk = existsSync(deskPath) ? readJson(deskPath, DeskSnapshot) : null;
  const price = loadPrice(root);
  const mixed = [manifest, ...osoDaily, ...osoWeekly, ...(osoNotion ? [osoNotion] : []), ...(desk ? [desk] : []), ...(price ? [price.near, price.btc] : [])].find((a) => a.mode !== mode);
  if (mixed) throw new Error(`Se encontró un artefacto ${mixed.mode} al compilar en modo ${mode}`);
  return { mode, manifest, bisonte: bisonte as BisonteData, osoDaily, osoWeekly, osoNotion, desk, price };
}
