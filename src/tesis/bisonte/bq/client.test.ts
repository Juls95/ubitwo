import { readdirSync } from "node:fs";
import { BISONTE_DATASETS } from "../../esquemas/bisonte";
import { CostGuardError, loadQuery, runGuarded, type BqBackend } from "./client";

const fakeBackend = (bytes: number) => {
  const run = jest.fn<ReturnType<BqBackend["run"]>, Parameters<BqBackend["run"]>>().mockResolvedValue([{ date: "2026-11-01" }]);
  const backend: BqBackend = { dryRun: jest.fn().mockResolvedValue(bytes), run };
  return { backend, run };
};

describe("consultas de BigQuery", () => {
  const files = readdirSync("src/tesis/bisonte/bq/queries").map((f) => f.replace(/\.sql$/, ""));

  it.each(files)("%s filtra por particiones de block_date", (id) => {
    expect(() => loadQuery(id)).not.toThrow();
  });

  it("hay una consulta para cada conjunto de datos de BigQuery", () => {
    const bqIds = Object.keys(BISONTE_DATASETS).filter((id) => id !== "intents_daily");
    for (const id of bqIds) expect(files).toContain(id);
  });

  it("rechaza ids que podrían escapar de la carpeta de consultas", () => {
    expect(() => loadQuery("../../../package")).toThrow(/Invalid query id/);
  });
});

describe("runGuarded", () => {
  it("hace una simulación y rechaza consultas por encima del tope de bytes", async () => {
    const { backend, run } = fakeBackend(5_000);
    await expect(runGuarded(backend, "daily_activity", {}, {}, 1_000)).rejects.toBeInstanceOf(CostGuardError);
    expect(run).not.toHaveBeenCalled();
  });

  it("ejecuta con maximumBytesBilled cuando está por debajo del tope", async () => {
    const { backend, run } = fakeBackend(500);
    const res = await runGuarded(backend, "daily_activity", { start_date: "2026-10-01" }, { start_date: "DATE" }, 1_000);
    expect(res.bytesProcessed).toBe(500);
    expect(run.mock.calls[0]?.[3]).toBe(1_000);
  });
});
