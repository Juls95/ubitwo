import { mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeJson } from "../../lib/files";
import type { BisonteDatasetId } from "../esquemas/bisonte";
import { buildMockInputs } from "../mock/run";
import { loadInputs } from "./load";

const ROOT = "data/mock/tesis";
const originalCwd = process.cwd();
let dir = "";

/** Persiste el escenario simulado igual que `pnpm demo`, pero en un directorio desechable. */
function persist(): void {
  const inputs = buildMockInputs(ROOT);
  for (const item of inputs.manifest.items) {
    writeJson(item.file, { mode: "mock", id: item.id, rows: inputs.bisonte[item.id as BisonteDatasetId] });
  }
  writeJson(`${ROOT}/raw/manifest.json`, inputs.manifest);
  for (const d of inputs.osoDaily) writeJson(`${ROOT}/oso/daily/${d.date}.json`, d);
  for (const w of inputs.osoWeekly) writeJson(`${ROOT}/oso/weekly/${w.week}.json`, w);
  writeJson(`${ROOT}/oso/notion/near.json`, inputs.osoNotion);
  writeJson(`${ROOT}/oso/desk/near.json`, inputs.desk);
  writeJson(`${ROOT}/raw/price/near.json`, inputs.price?.near);
  writeJson(`${ROOT}/raw/price/btc.json`, inputs.price?.btc);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ubitwo-load-"));
  process.chdir(dir);
  persist();
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("loadInputs", () => {
  it("recupera intacto el escenario simulado persistido, incluidas las notas de mesas y las velas", () => {
    const loaded = loadInputs("mock");
    const built = buildMockInputs(ROOT);
    expect(loaded.desk).toEqual(built.desk);
    expect(loaded.osoNotion).toEqual(built.osoNotion);
    expect(loaded.price).toEqual(built.price);
  });

  it("trata una fuente de precios ausente como «sin datos» y no como error", () => {
    unlinkSync(`${ROOT}/raw/price/near.json`);
    unlinkSync(`${ROOT}/raw/price/btc.json`);
    expect(loadInputs("mock").price).toBeNull();
  });

  it("falla de inmediato cuando solo existe uno de los dos archivos de precio", () => {
    unlinkSync(`${ROOT}/raw/price/btc.json`);
    expect(() => loadInputs("mock")).toThrow(/necesitan ambos archivos/);
  });

  it("rechaza un archivo de mesas simulado cuando se lee como datos reales", () => {
    const live = buildMockInputs(ROOT);
    // El directorio real trae archivos simulados de Bisonte, que deben rechazarse antes de leer cualquier otra cosa.
    writeJson("data/tesis/raw/manifest.json", { ...live.manifest, mode: "live" });
    for (const item of live.manifest.items) {
      writeJson(item.file.replace("data/mock/tesis", "data/tesis"), { mode: "live", id: item.id, rows: live.bisonte[item.id as BisonteDatasetId] });
    }
    writeJson("data/tesis/oso/desk/near.json", live.desk);
    expect(() => loadInputs("live")).toThrow(/artefacto mock al compilar en modo live/);
  });
});
