import { existsSync, readFileSync } from "node:fs";
import { loadEnv } from "../../config/env";
import { createLogger } from "../../lib/logger";
import { isMain, repoPath } from "../../lib/paths";
import { buildCharts, type ChartDef } from "./charts";
import { buildContext } from "./evidence";
import { loadInputs } from "./load";
import { analyze } from "./metrics";
import { MissingPlaceholderError, render, strayDigits, type RenderContext } from "./render";

const log = createLogger("toro:verify");

export const TEMPLATE_PATH = repoPath("src/tesis/toro/thesis/TESIS.plantilla.md");

export type Violation = { check: string; detail: string };

export function modeBanner(mode: "mock" | "live"): string {
  return mode === "mock"
    ? "> **TESIS DE EJEMPLO · DATOS SIMULADOS.** Las cifras on-chain, de precio y de sentimiento salen de una simulación con semilla y no describen a NEAR; sirven para ejercitar el formato y la lógica del pipeline. Las notas de las mesas son reales pero parafraseadas, y las referencias externas se citan sin verificar: cada cifra lleva su propia etiqueta de procedencia."
    : "> Datos reales. Reproducible con `pnpm tesis:toro` a partir de los archivos en `data/`.";
}

/** La compuerta de «nunca inventar números» para la tesis y cada oración de gráfica. */
export function verifyArtifacts(template: string, ctx: RenderContext, charts: readonly ChartDef[]): Violation[] {
  const violations: Violation[] = [];
  const check = (name: string, text: string) => {
    try {
      for (const d of strayDigits(render(text, ctx, true))) violations.push({ check: `${name}: número fuera de un marcador`, detail: d });
    } catch (err) {
      if (err instanceof MissingPlaceholderError) violations.push({ check: `${name}: marcador inválido`, detail: err.message });
      else throw err;
    }
  };
  check("TESIS", template);
  for (const c of charts) {
    if (!c.sentence.trim()) violations.push({ check: `gráfica ${c.id}`, detail: "falta la oración en lenguaje llano" });
    if (!c.query_file && !c.endpoint) violations.push({ check: `gráfica ${c.id}`, detail: "faltan la consulta y el endpoint" });
    if (c.query_file && !existsSync(c.query_file)) violations.push({ check: `gráfica ${c.id}`, detail: `${c.query_file} no existe` });
    check(`gráfica ${c.id}`, c.sentence);
  }
  for (const m of Object.values(ctx.metrics)) {
    if (m.value !== null && !Number.isFinite(m.value)) violations.push({ check: `métrica ${m.id}`, detail: "valor no finito" });
  }
  return violations;
}

function main() {
  const env = loadEnv();
  const inputs = loadInputs(env.DATA_MODE);
  const analysis = analyze(inputs, inputs.manifest.generated_at);
  const ctx = buildContext(analysis);
  ctx.blocks.mode_banner = modeBanner(env.DATA_MODE);
  const violations = verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), ctx, buildCharts(inputs, analysis));
  if (violations.length) {
    log.error("la verificación falló", { violations });
    process.exitCode = 1;
    return;
  }
  log.info("verificación aprobada", { mode: env.DATA_MODE });
  process.stdout.write(`verificar: OK (${env.DATA_MODE})\n`);
}

if (isMain("src/tesis/toro/verify.ts")) main();
