import { readFileSync } from "node:fs";
import { loadEnv } from "../../config/env";
import { createLogger } from "../../lib/logger";
import { isMain } from "../../lib/paths";
import { dataRoot, writeJson, writeText } from "../../lib/files";
import { buildAgents } from "./agents";
import { buildCharts } from "./charts";
import { buildContext } from "./evidence";
import { loadInputs } from "./load";
import { analyze } from "./metrics";
import { render } from "./render";
import { modeBanner, TEMPLATE_PATH, verifyArtifacts } from "./verify";

const log = createLogger("toro");

export const SITE_BUNDLE = "site/public/data/tesis.json";

/** One command: raw data → metrics → charts → TESIS.md → site bundle. Fails if any number is not backed by data. */
function main() {
  const env = loadEnv();
  const mode = env.DATA_MODE;
  const inputs = loadInputs(mode);
  const generatedAt = mode === "mock" ? inputs.manifest.generated_at : new Date().toISOString();
  const analysis = analyze(inputs, generatedAt);
  const ctx = buildContext(analysis);
  ctx.blocks.mode_banner = modeBanner(mode);
  const charts = buildCharts(inputs, analysis);
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const violations = verifyArtifacts(template, ctx, charts);
  if (violations.length) {
    log.error("verification failed; nothing written", { violations });
    throw new Error(`verification failed with ${violations.length} violations`);
  }

  const thesis = render(template, ctx);
  writeText(`${dataRoot(mode)}/TESIS.md`, thesis);
  writeJson(`${dataRoot(mode)}/derived/metrics.json`, { mode, generated_at: generatedAt, metrics: analysis.metrics, labels: analysis.labels });

  const latest = inputs.osoWeekly.at(-1);
  const latestPosts = latest
    ? inputs.osoDaily.filter((d) => d.date >= latest.from && d.date < latest.to).flatMap((d) => d.posts).sort((x, y) => y.credibility - x.credibility).slice(0, 10)
    : [];
  const discardReasons: Record<string, number> = {};
  for (const d of inputs.osoDaily) for (const x of d.discarded) discardReasons[x.reason] = (discardReasons[x.reason] ?? 0) + 1;

  writeJson(SITE_BUNDLE, {
    mode,
    generated_at: generatedAt,
    thesis_md: thesis,
    hypothesis_verdict: analysis.labels.hypothesis_verdict?.value ?? null,
    regime: analysis.labels.regime?.value ?? null,
    stance: analysis.labels.stance?.value ?? null,
    technical_bias: analysis.labels.technical_bias?.value ?? null,
    metrics: analysis.metrics,
    charts: charts.map((c) => ({
      id: c.id, title: c.title, agent: c.agent, query_file: c.query_file, endpoint: c.endpoint,
      query_sql: c.query_file ? readFileSync(c.query_file, "utf8") : null,
      sentence: render(c.sentence, ctx), spec: c.spec,
    })),
    desk: inputs.desk ? { ...inputs.desk, observations: inputs.desk.observations.map((o) => ({ ...o, claim: render(o.claim, ctx) })) } : null,
    divergences: analysis.divergences,
    spikes: analysis.spikes,
    oso: { weeks: inputs.osoWeekly, latest_posts: latestPosts, discard_reasons: discardReasons, notion: inputs.osoNotion },
    agents: buildAgents(inputs, analysis, violations, env.BQ_MAX_BYTES),
  });
  log.info("thesis generated", { mode, charts: charts.length });
  process.stdout.write(`tesis:toro OK (${mode}) · ${charts.length} charts · ${Object.keys(analysis.metrics).length} metrics\n`);
}

if (isMain("src/tesis/toro/build.ts")) main();
