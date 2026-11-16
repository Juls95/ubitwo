import { readFileSync } from "node:fs";
import { buildMockInputs, MOCK_END } from "../mock/run";
import { buildCharts } from "./charts";
import { buildContext } from "./evidence";
import { analyze, classifySpikes } from "./metrics";
import { formatMetric, MissingPlaceholderError, render, strayDigits, type RenderContext } from "./render";
import { modeBanner, TEMPLATE_PATH, verifyArtifacts } from "./verify";

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("se esperaba un valor en el escenario simulado");
  return value;
}

const ctx: RenderContext = {
  metrics: { a: { id: "a", label: "A", value: 12.345, unit: "pct", source: "prueba" } },
  labels: { regime: { value: "expansión" } },
  blocks: { inner: "valor {{metric:a}}" },
};

describe("render", () => {
  it("formatea las métricas en es-MX y resuelve bloques anidados", () => {
    expect(render("{{block:inner}} · {{label:regime}} · {{param:lag_min_r}}", ctx)).toBe("valor 12.3% · expansión · 0.3");
  });

  it("formatea días y montos en USD con la configuración regional es-MX", () => {
    expect(formatMetric({ id: "d", label: "d", value: 1, unit: "days", source: "t" })).toBe("1 día");
    expect(formatMetric({ id: "d", label: "d", value: 7, unit: "days", source: "t" })).toBe("7 días");
    expect(formatMetric({ id: "u", label: "u", value: 76540, unit: "usd", source: "t" })).toMatch(/76,540/);
  });

  it("lanza un error ante marcadores desconocidos", () => {
    expect(() => render("{{metric:nope}}", ctx)).toThrow(MissingPlaceholderError);
  });

  it("dice «no disponible» en vez de inventar un valor", () => {
    expect(formatMetric({ id: "x", label: "x", value: null, unit: "count", source: "t" })).toBe("no disponible");
  });

  it("strayDigits solo permite 1Click y los números de sección", () => {
    expect(strayDigits("## 3. Pilares\n1Click crece")).toEqual([]);
    expect(strayDigits("crece 40 %")).toHaveLength(1);
  });
});

describe("escenario simulado de punta a punta", () => {
  const inputs = buildMockInputs("data/mock");
  const analysis = analyze(inputs, `${MOCK_END}T06:00:00.000Z`);

  it("la plantilla y cada oración de gráfica pasan la compuerta de «nunca inventar números»", () => {
    const c = buildContext(analysis);
    c.blocks.mode_banner = modeBanner("mock");
    expect(verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), c, buildCharts(inputs, analysis))).toEqual([]);
  });

  it("la plantilla es la versión en español", () => {
    expect(TEMPLATE_PATH).toMatch(/TESIS\.plantilla\.md$/);
    expect(readFileSync(TEMPLATE_PATH, "utf8").split("\n")[0]).toBe("# Tesis de inversión en NEAR · ubitwo");
  });

  it("marca un número literal escrito en una oración", () => {
    const c = buildContext(analysis);
    c.blocks.mode_banner = modeBanner("mock");
    const charts = buildCharts(inputs, analysis).map((ch, i) => (i === 0 ? { ...ch, sentence: "Creció 40 % esta semana." } : ch));
    expect(verifyArtifacts("# Tesis", c, charts).some((v) => v.check.includes("número fuera de un marcador"))).toBe(true);
  });

  it("clasifica el airdrop concentrado del escenario como pico, no como adopción", () => {
    const spikes = classifySpikes(inputs);
    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes.every((s) => s.classification === "pico")).toBe(true);
  });

  it("encuentra el adelanto diseñado de 1Click y la semana de espejismo", () => {
    expect(analysis.labels.lead_status?.value).toBe("observado");
    expect(analysis.divergences.some((d) => d.quadrant === "espejismo")).toBe(true);
  });

  it("etiqueta cada semana de Oso como en vivo o reconstruida", () => {
    expect(analysis.divergences.filter((d) => !d.reconstructed)).toHaveLength(1);
  });

  it("produce las etiquetas visibles en español", () => {
    const quadrants = ["confirmación", "espejismo", "oportunidad no narrada", "deterioro confirmado", "neutral", "sin datos"];
    expect(analysis.divergences.every((d) => quadrants.includes(d.quadrant))).toBe(true);
    expect(["expansión", "contracción", "lateral", "sin datos"]).toContain(analysis.labels.regime?.value);
    expect(["constructivo", "defensivo", "neutral", "sin datos"]).toContain(analysis.labels.technical_bias?.value);
    expect(["respaldada por los datos actuales", "parcialmente respaldada", "no respaldada por los datos actuales"]).toContain(analysis.labels.hypothesis_verdict?.value);
    expect(analysis.labels.mode?.value).toBe("SIMULADO (mock)");
    const c = buildContext(analysis);
    expect(c.blocks.divergences).toContain("| Semana | Tipo | Sentimiento (Oso) |");
    expect(c.blocks.confluence).toContain("| Criterio | Se cumple |");
    expect(c.labels.spike_0_class?.value).toBe("pico (no estructural)");
  });
});

describe("capa de procedencia y de mesas", () => {
  const inputs = buildMockInputs("data/mock");
  const at = `${MOCK_END}T06:00:00.000Z`;
  const analysis = analyze(inputs, at);
  const prov = (id: string) => analysis.metrics[id]?.provenance;

  it("renderiza la palabra de procedencia de una métrica y la oculta tras el centinela en modo verificación", () => {
    const c: RenderContext = { ...ctx, metrics: { a: { ...must(ctx.metrics.a), provenance: "mesa" } } };
    expect(render("{{prov:a}}", c)).toBe("mesa");
    expect(() => render("{{prov:nope}}", c)).toThrow(MissingPlaceholderError);
  });

  it("nunca etiqueta como calculados los insumos simulados y separa las cifras de mesas de las citadas", () => {
    expect(prov("desk_whale_pnl_oct_usd")).toBe("mesa");
    expect(prov("notion_rows_total")).toBe("mesa");
    expect(prov("desk_count")).toBe("mesa");
    const cited = Object.values(analysis.metrics).filter((m) => m.provenance === "citado");
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((m) => m.id.startsWith("ref_"))).toBe(true);
    const simulated = Object.values(analysis.metrics).filter((m) => m.provenance === "simulado");
    expect(simulated.length).toBeGreaterThan(0);
    expect(Object.values(analysis.metrics).some((m) => m.provenance === "calculado")).toBe(false);
  });

  it("deriva la beta de la venta masiva solo a partir de los dos movimientos citados", () => {
    const near = analysis.metrics.desk_near_move_oct25_pct?.value as number;
    const btc = analysis.metrics.desk_btc_move_oct25_pct?.value as number;
    expect(analysis.metrics.desk_alt_beta_ratio?.value).toBeCloseTo(near / btc, 6);
  });

  it("sin datos de mesas, Notion o precio, cada métrica dependiente es null y la compilación igual se verifica", () => {
    const bare = { ...inputs, desk: null, osoNotion: null, price: null };
    const a = analyze(bare, at);
    expect(a.metrics.desk_whale_pnl_oct_usd?.value).toBeNull();
    expect(a.metrics.notion_rows_total?.value).toBeNull();
    expect(a.metrics.near_rsi?.value).toBeNull();
    expect(analysis.metrics.near_rsi?.value).not.toBeNull();
    expect(a.labels.src_price?.value).toBe("no disponible");
    const c = buildContext(a);
    c.blocks.mode_banner = modeBanner("mock");
    expect(verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), c, buildCharts(bare, a))).toEqual([]);
  });

  it("la compuerta detecta un número escrito en una afirmación de mesa", () => {
    const desk = must(inputs.desk);
    const tampered = { ...desk, observations: desk.observations.map((o, i) => (i === 0 ? { ...o, claim: `${o.claim} Cayó 12 por ciento.` } : o)) };
    const a = analyze({ ...inputs, desk: tampered }, at);
    const c = buildContext(a);
    c.blocks.mode_banner = modeBanner("mock");
    const violations = verifyArtifacts(readFileSync(TEMPLATE_PATH, "utf8"), c, buildCharts(inputs, a));
    expect(violations.some((v) => v.check.includes("número fuera de un marcador"))).toBe(true);
  });

  it("las notas curadas de mesas del escenario simulado no traen dígitos escritos a mano", () => {
    for (const o of must(inputs.desk).observations) expect(strayDigits(o.claim.replace(/\{\{[^}]+\}\}/g, ""))).toEqual([]);
  });
});
