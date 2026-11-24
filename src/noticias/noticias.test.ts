import { buscar, estadisticas, historialTicker, resumenTickers } from "./agregados";
import { crearDemo } from "./demo";
import { ResumenDiario } from "./esquema";
import { ErrorResumen, extraerJson, limpiarTexto, normalizar, normalizarTicker, posturaAgregada, tipoDeActivo } from "./normalizar";

/** Real bot page shape: flat per-account rows, separate `ticker_intel`, and tickers with spaces. */
const PLANO = {
  schema: "otrobot.digest.v1",
  date: "2026-11-10",
  username: "someone",
  accounts: ["@a", "@b"],
  market_context: "Context for the day",
  assets: [
    { ticker: "btc", account: "@a", claim: "Breaks resistance", url: "https://x.com/a/status/1", stance: "bullish", invalidation: "Loses support" },
    { ticker: "BTC", account: "@b", claim: "Bearish divergence", url: "javascript:alert(1)", stance: "bearish", invalidation: "" },
    { ticker: "CRYPTO TOP100", account: "@a", claim: "Weak altcoins", url: "", stance: "mixed" },
    { ticker: "<script>", account: "@a", claim: "injection", stance: "bullish" },
  ],
  ticker_intel: [{ ticker: "BTC", what_it_does: "Digital money", price: "$95,000", last_news: "ETF", source: "https://example.org" }],
  conflicts: ["@a and @b disagree on BTC"],
  flags: [],
};

/** Rich per-asset shape (another possible bot): score, conviction, and nested evidence. */
const RICO = {
  schema: "ubitwo.digest.v1",
  date: "2026-11-11",
  assets: [
    {
      ticker: "NVDA",
      asset_type: "stock",
      stance_score: 7,
      conviction: 0.8,
      catalyst_type: "EARNINGS",
      horizon_days: 30,
      summary: "Strong guidance",
      agreement: { bullish: 3, bearish: 1, neutral: 0 },
      evidence: [{ account: "@c", claim: "Beats consensus", url: "https://x.com/c" }],
    },
  ],
};

describe("extraerJson", () => {
  it("reads a ```json block inside the body", () => {
    expect(extraerJson('Text\n```json\n{"date":"2026-11-10"}\n```\nmore')).toEqual({ date: "2026-11-10" });
  });

  it("reads a body that is only the object", () => {
    expect(extraerJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("fails with a clear message when JSON is missing or broken", () => {
    expect(() => extraerJson("")).toThrow(ErrorResumen);
    expect(() => extraerJson("plain text")).toThrow(/block/);
    expect(() => extraerJson("```json\n{broken}\n```")).toThrow(/could not be parsed/);
  });
});

describe("normalizar", () => {
  it("groups the flat format by ticker and detects mixed stances", () => {
    const r = normalizar(PLANO, { sesgo: "Mixed", estado: "Completed", titulo: "Digest" });
    expect(ResumenDiario.safeParse(r).success).toBe(true);
    expect(r.activos.map((a) => a.ticker)).toEqual(["BTC", "CRYPTO TOP100"]);
    const btc = r.activos[0];
    expect(btc?.postura).toBe("mixta");
    expect(btc?.evidencias).toHaveLength(2);
    expect(btc?.acuerdo).toEqual({ alcista: 1, bajista: 1, neutral: 0 });
    expect(btc?.que_hace).toBe("Digital money");
    expect(btc?.tipo).toBe("cripto");
    expect(r.activos[1]?.tipo).toBe("cripto");
    expect(r.sesgo).toBe("mixto");
    expect(r.esquema).toBe("ubitwo.digest.v1");
  });

  it("never lets non-https links through", () => {
    const r = normalizar(PLANO);
    const urls = r.activos.flatMap((a) => a.evidencias.map((e) => e.url));
    expect(urls).toContain("https://x.com/a/status/1");
    expect(urls).not.toContain("javascript:alert(1)");
    expect(JSON.stringify(r)).not.toMatch(/javascript:/);
  });

  it("clamps model numbers and reads the rich format", () => {
    const r = normalizar(RICO);
    const nvda = r.activos[0];
    expect(nvda?.puntuacion).toBe(1);
    expect(nvda?.postura).toBe("alcista");
    expect(nvda?.tipo).toBe("accion");
    expect(nvda?.catalizador).toBe("EARNINGS");
    expect(nvda?.acuerdo).toEqual({ alcista: 3, bajista: 1, neutral: 0 });
    expect(r.titulo).toBe("Digest · 2026-11-11");
  });

  it("uses the Notion date when the JSON has none", () => {
    expect(normalizar({ ...RICO, date: "" }, { fecha: "2026-11-12" }).fecha).toBe("2026-11-12");
  });

  it("fails fast on unknown schemas, missing date, or non-object input", () => {
    expect(() => normalizar({ ...RICO, schema: "otra.cosa.v2" })).toThrow(/schema/);
    expect(() => normalizar({ ...RICO, date: "yesterday" })).toThrow(/date/);
    expect(() => normalizar([])).toThrow(/object/);
  });

  it("a day with no assets has bias 'sin datos'", () => {
    expect(normalizar({ date: "2026-11-10", assets: [] }, { sesgo: "Bullish" }).sesgo).toBe("sin datos");
  });
});

describe("normalization helpers", () => {
  it("strips control and bidi characters", () => {
    expect(limpiarTexto("a\u202Eb\u0000c   d", 10)).toBe("abc d");
  });

  it("validates tickers", () => {
    expect(normalizarTicker("$nvda")).toBe("NVDA");
    expect(normalizarTicker("BRK.B")).toBe("BRK.B");
    expect(normalizarTicker("<img>")).toBeNull();
  });

  it("classifies asset types", () => {
    expect(tipoDeActivo("ETH", "")).toBe("cripto");
    expect(tipoDeActivo("SPX", "")).toBe("indice");
    expect(tipoDeActivo("AAPL", "")).toBe("accion");
    expect(tipoDeActivo("ALGO RARO 1", "")).toBe("otro");
  });

  it("aggregates stances", () => {
    expect(posturaAgregada(["alcista", "alcista"])).toBe("alcista");
    expect(posturaAgregada(["alcista", "bajista"])).toBe("mixta");
    expect(posturaAgregada([null])).toBe("neutral");
  });
});

describe("demo and aggregates", () => {
  const demo = crearDemo(new Date("2026-11-16T12:00:00Z"));

  it("generates five valid days ending today", () => {
    expect(demo).toHaveLength(5);
    expect(demo.at(-1)?.fecha).toBe("2026-11-16");
    for (const r of demo) expect(ResumenDiario.safeParse(r.resumen).success).toBe(true);
  });

  it("summarizes tickers with the most mentioned first", () => {
    const t = resumenTickers(demo);
    expect(t[0]?.ticker).toBe("BTC");
    expect(t[0]?.dias).toBe(4);
    expect(t.find((x) => x.ticker === "NEAR")?.ultima_postura).toBe("mixta");
  });

  it("returns ticker history, newest first", () => {
    const h = historialTicker(demo, "near");
    expect(h.map((d) => d.fecha)).toEqual(["2026-11-16", "2026-11-14"]);
  });

  it("computes statistics", () => {
    const e = estadisticas(demo);
    expect(e).toMatchObject({ resumenes: 5, desde: "2026-11-12", hasta: "2026-11-16" });
    expect(e.sesgos.alcista).toBe(2);
  });

  it("searches without accents or case", () => {
    expect(buscar(demo, "INFLATION").length).toBeGreaterThan(0);
    expect(buscar(demo, "nvda chip")[0]?.ticker).toBe("NVDA");
    expect(buscar(demo, "x")).toEqual([]);
  });
});
