import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnv } from "../config/env";
import { dataRoot } from "../lib/files";
import { createLogger } from "../lib/logger";
import { isMain } from "../lib/paths";

const log = createLogger("tesis:build");

export type Plan = { mode: "mock" | "live"; steps: string[][] };

/**
 * Decide qué tesis entra en el sitio. Con DATA_MODE=live y datos reales ya descargados se publica la tesis real;
 * en cualquier otro caso se genera la tesis de ejemplo con datos simulados, marcada como tal en cada página.
 */
export function planBuild(dataMode: "mock" | "live", hasLiveData: boolean): Plan {
  if (dataMode === "live" && hasLiveData) return { mode: "live", steps: [["src/tesis/toro/build.ts"]] };
  return { mode: "mock", steps: [["src/tesis/mock/run.ts"], ["src/tesis/toro/build.ts"]] };
}

function main() {
  const env = loadEnv();
  const plan = planBuild(env.DATA_MODE, existsSync(`${dataRoot("live")}/raw/manifest.json`));
  if (env.DATA_MODE === "live" && plan.mode === "mock") {
    log.warn("no hay datos reales en data/tesis; se publica la tesis de ejemplo (simulada)");
  }
  for (const step of plan.steps) {
    execFileSync(process.execPath, ["--import", "tsx", ...step], {
      stdio: "inherit",
      env: { ...process.env, DATA_MODE: plan.mode },
    });
  }
}

if (isMain("src/tesis/build-site.ts")) main();
