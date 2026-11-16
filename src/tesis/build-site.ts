import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnv } from "../config/env";
import { dataRoot } from "../lib/files";
import { createLogger } from "../lib/logger";
import { isMain } from "../lib/paths";

const log = createLogger("tesis:build");

export type Plan = { mode: "mock" | "live"; steps: string[][] };

/**
 * Decide which thesis goes into the site. With DATA_MODE=live and live data already downloaded, the live thesis is published;
 * otherwise the sample thesis with simulated data is generated, marked as such on every page.
 */
export function planBuild(dataMode: "mock" | "live", hasLiveData: boolean): Plan {
  if (dataMode === "live" && hasLiveData) return { mode: "live", steps: [["src/tesis/toro/build.ts"]] };
  return { mode: "mock", steps: [["src/tesis/mock/run.ts"], ["src/tesis/toro/build.ts"]] };
}

function main() {
  const env = loadEnv();
  const plan = planBuild(env.DATA_MODE, existsSync(`${dataRoot("live")}/raw/manifest.json`));
  if (env.DATA_MODE === "live" && plan.mode === "mock") {
    log.warn("no live data in data/tesis; publishing the sample (simulated) thesis");
  }
  for (const step of plan.steps) {
    execFileSync(process.execPath, ["--import", "tsx", ...step], {
      stdio: "inherit",
      env: { ...process.env, DATA_MODE: plan.mode },
    });
  }
}

if (isMain("src/tesis/build-site.ts")) main();
