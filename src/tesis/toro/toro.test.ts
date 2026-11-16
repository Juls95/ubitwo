import { readFileSync } from "node:fs";
import { buildMockInputs, MOCK_END } from "../mock/run";
import { buildCharts } from "./charts";
import { buildContext } from "./evidence";
import { analyze, classifySpikes } from "./metrics";
import { formatMetric, MissingPlaceholderError, render, strayDigits, type RenderContext } from "./render";
import { modeBanner, TEMPLATE_PATH, verifyArtifacts } from "./verify";

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("expected a value in the simulated scenario");
  return value;
}

const ctx: RenderContext = {
  metrics: { a: { id: "a", label: "A", value: 12.345, unit: "pct", source: "test" } },
  labels: { regime: { value: "expansion" } },
  blocks: { inner: "value {{metric:a}}" },
};

describe("render", () => {
  it("formats metrics in en-US and resolves nested blocks", () => {
    expect(render("{{block:inner}} · {{label:regime}} · {{param:lag_min_r}}", ctx)).toBe("value 12.3% · expansion · 0.3");
  });

  it("formats days and USD amounts with the en-US locale", () => {
    expect(formatMetric({ id: "d", label: "d", value: 1, unit: "days", source: "t" })).toBe("1 day");
    expect(formatMetric({ id: "d", label: "d", value: 7, unit: "days", source: "t" })).toBe("7 days");
    expect(formatMetric({ id: "u", label: "u", value: 76540, unit: "usd", source: "t" })).toMatch(/76,540/);
  });

  it("throws on unknown placeholders", () => {
    expect(() => render("{{metric:nope}}", ctx)).toThrow(MissingPlaceholderError);
  });

  it("says \"not available\" instead of inventing a value", () => {
    expect(formatMetric({ id: "x", label: "x", value: null, unit: "count", source: "t" })).toBe("not available");
  });

  it("strayDigits only allows 1Click and section numbers", () => {
    expect(strayDigits("## 3. Pilares\n1Click crece")).toEqual([]);
    expect(strayDigits("crece 40 %")).toHaveLength(1);
  });
});

describe("end-to-end simulated scenario", () => {
  const inputs = buildMockInputs("data/mock");
  const analysis = analyze(inputs, `${MOCK_END}T06:00:00.000Z`);

  it("the template and every chart sentence pass the never-invent-numbers gate", () => {
    const c = buildContext(analysis);
    c.blocks.mode_banner = modeBanner("mock");
    expect(verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), c, buildCharts(inputs, analysis))).toEqual([]);
  });

  it("the template is the English version", () => {
    expect(TEMPLATE_PATH).toMatch(/THESIS\.template\.md$/);
    expect(readFileSync(TEMPLATE_PATH, "utf8").split("\n")[0]).toBe("# NEAR investment thesis · ubitwo");
  });

  it("flags a literal number written in a sentence", () => {
    const c = buildContext(analysis);
    c.blocks.mode_banner = modeBanner("mock");
    const charts = buildCharts(inputs, analysis).map((ch, i) => (i === 0 ? { ...ch, sentence: "Grew 40% this week." } : ch));
    expect(verifyArtifacts("# Thesis", c, charts).some((v) => v.check.includes("number outside a placeholder"))).toBe(true);
  });

  it("classifies the scenario's concentrated airdrop as a spike, not adoption", () => {
    const spikes = classifySpikes(inputs);
    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes.every((s) => s.classification === "spike")).toBe(true);
  });

  it("finds the designed 1Click lead and the mirage week", () => {
    expect(analysis.labels.lead_status?.value).toBe("observed");
    expect(analysis.divergences.some((d) => d.quadrant === "mirage")).toBe(true);
  });

  it("labels each Bear week as live or reconstructed", () => {
    expect(analysis.divergences.filter((d) => !d.reconstructed)).toHaveLength(1);
  });

  it("produces the visible English labels", () => {
    const quadrants = ["confirmation", "mirage", "unnarrated opportunity", "confirmed deterioration", "neutral", "no data"];
    expect(analysis.divergences.every((d) => quadrants.includes(d.quadrant))).toBe(true);
    expect(["expansion", "contraction", "sideways", "no data"]).toContain(analysis.labels.regime?.value);
    expect(["constructive", "defensive", "neutral", "no data"]).toContain(analysis.labels.technical_bias?.value);
    expect(["supported by current data", "partially supported", "not supported by current data"]).toContain(analysis.labels.hypothesis_verdict?.value);
    expect(analysis.labels.mode?.value).toBe("SIMULATED (mock)");
    const c = buildContext(analysis);
    expect(c.blocks.divergences).toContain("| Week | Kind | Sentiment (Bear) |");
    expect(c.blocks.confluence).toContain("| Criterion | Met |");
    expect(c.labels.spike_0_class?.value).toBe("spike");
  });
});

describe("provenance and desk layer", () => {
  const inputs = buildMockInputs("data/mock");
  const at = `${MOCK_END}T06:00:00.000Z`;
  const analysis = analyze(inputs, at);
  const prov = (id: string) => analysis.metrics[id]?.provenance;

  it("renders a metric provenance word and hides it behind the sentinel in verification mode", () => {
    const c: RenderContext = { ...ctx, metrics: { a: { ...must(ctx.metrics.a), provenance: "desk" } } };
    expect(render("{{prov:a}}", c)).toBe("desk");
    expect(() => render("{{prov:nope}}", c)).toThrow(MissingPlaceholderError);
  });

  it("never tags simulated inputs as computed and separates desk figures from cited ones", () => {
    expect(prov("desk_whale_pnl_oct_usd")).toBe("desk");
    expect(prov("notion_rows_total")).toBe("desk");
    expect(prov("desk_count")).toBe("desk");
    const cited = Object.values(analysis.metrics).filter((m) => m.provenance === "cited");
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((m) => m.id.startsWith("ref_"))).toBe(true);
    const simulated = Object.values(analysis.metrics).filter((m) => m.provenance === "simulated");
    expect(simulated.length).toBeGreaterThan(0);
    expect(Object.values(analysis.metrics).some((m) => m.provenance === "computed")).toBe(false);
  });

  it("derives selloff beta only from the two cited moves", () => {
    const near = analysis.metrics.desk_near_move_oct25_pct?.value as number;
    const btc = analysis.metrics.desk_btc_move_oct25_pct?.value as number;
    expect(analysis.metrics.desk_alt_beta_ratio?.value).toBeCloseTo(near / btc, 6);
  });

  it("with no desk, Notion, or price data, every dependent metric is null and the build still verifies", () => {
    const bare = { ...inputs, desk: null, osoNotion: null, price: null };
    const a = analyze(bare, at);
    expect(a.metrics.desk_whale_pnl_oct_usd?.value).toBeNull();
    expect(a.metrics.notion_rows_total?.value).toBeNull();
    expect(a.metrics.near_rsi?.value).toBeNull();
    expect(analysis.metrics.near_rsi?.value).not.toBeNull();
    expect(a.labels.src_price?.value).toBe("not available");
    const c = buildContext(a);
    c.blocks.mode_banner = modeBanner("mock");
    expect(verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), c, buildCharts(bare, a))).toEqual([]);
  });

  it("the gate detects a number written into a desk claim", () => {
    const desk = must(inputs.desk);
    const tampered = { ...desk, observations: desk.observations.map((o, i) => (i === 0 ? { ...o, claim: `${o.claim} Fell 12 percent.` } : o)) };
    const a = analyze({ ...inputs, desk: tampered }, at);
    const c = buildContext(a);
    c.blocks.mode_banner = modeBanner("mock");
    const violations = verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), c, buildCharts(inputs, a));
    expect(violations.some((v) => v.check.includes("number outside a placeholder"))).toBe(true);
  });

  it("curated desk notes in the simulated scenario have no hand-written digits", () => {
    for (const o of must(inputs.desk).observations) expect(strayDigits(o.claim.replace(/\{\{[^}]+\}\}/g, ""))).toEqual([]);
  });
});
