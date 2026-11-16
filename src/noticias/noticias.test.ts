import { buscar, estadisticas, historialTicker, resumenTickers } from "./agregados";
import { crearDemo } from "./demo";
import { ResumenDiario } from "./esquema";
import { ErrorResumen, extraerJson, limpiarTexto, normalizar, normalizarTicker, posturaAgregada, tipoDeActivo } from "./normalizar";

/** Forma real de las páginas del bot: entradas planas por cuenta, `ticker_intel` aparte y tickers con espacios. */
const PLANO = {
  schema: "otrobot.digest.v1",
  date: "2026-11-10",
  username: "alguien",
  accounts: ["@a", "@b"],
  market_context: "Contexto del día",
  assets: [
    { ticker: "btc", account: "@a", claim: "Rompe resistencia", url: "https://x.com/a/status/1", stance: "bullish", invalidation: "Pierde soporte" },
    { ticker: "BTC", account: "@b", claim: "Divergencia bajista", url: "javascript:alert(1)", stance: "bearish", invalidation: "" },
    { ticker: "CRYPTO TOP100", account: "@a", claim: "Altcoins débiles", url: "", stance: "mixed" },
    { ticker: "<script>", account: "@a", claim: "inyección", stance: "bullish" },
  ],
  ticker_intel: [{ ticker: "BTC", what_it_does: "Dinero digital", price: "$95,000", last_news: "ETF", source: "https://example.org" }],
  conflicts: ["@a y @b no coinciden en BTC"],
  flags: [],
};

/** Forma rica por activo (otro bot posible): puntuación, convicción y evidencias anidadas. */
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
      summary: "Guía fuerte",
      agreement: { bullish: 3, bearish: 1, neutral: 0 },
      evidence: [{ account: "@c", claim: "Supera consenso", url: "https://x.com/c" }],
    },
  ],
};

describe("extraerJson", () => {
  it("lee un bloque ```json dentro del cuerpo", () => {
    expect(extraerJson('Texto\n```json\n{"date":"2026-11-10"}\n```\nmás')).toEqual({ date: "2026-11-10" });
  });

  it("lee un cuerpo que solo es el objeto", () => {
    expect(extraerJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("falla con un mensaje claro si no hay JSON o está roto", () => {
    expect(() => extraerJson("")).toThrow(ErrorResumen);
    expect(() => extraerJson("solo texto")).toThrow(/bloque/);
    expect(() => extraerJson("```json\n{roto}\n```")).toThrow(/no se puede leer/);
  });
});

describe("normalizar", () => {
  it("agrupa el formato plano por ticker y detecta posturas mixtas", () => {
    const r = normalizar(PLANO, { sesgo: "Mixto", estado: "Completado", titulo: "Resumen" });
    expect(ResumenDiario.safeParse(r).success).toBe(true);
    expect(r.activos.map((a) => a.ticker)).toEqual(["BTC", "CRYPTO TOP100"]);
    const btc = r.activos[0];
    expect(btc?.postura).toBe("mixta");
    expect(btc?.evidencias).toHaveLength(2);
    expect(btc?.acuerdo).toEqual({ alcista: 1, bajista: 1, neutral: 0 });
    expect(btc?.que_hace).toBe("Dinero digital");
    expect(btc?.tipo).toBe("cripto");
    expect(r.activos[1]?.tipo).toBe("cripto");
    expect(r.sesgo).toBe("mixto");
    expect(r.esquema).toBe("ubitwo.digest.v1");
  });

  it("nunca deja pasar enlaces que no sean https", () => {
    const r = normalizar(PLANO);
    const urls = r.activos.flatMap((a) => a.evidencias.map((e) => e.url));
    expect(urls).toContain("https://x.com/a/status/1");
    expect(urls).not.toContain("javascript:alert(1)");
    expect(JSON.stringify(r)).not.toMatch(/javascript:/);
  });

  it("acota números del modelo y lee el formato rico", () => {
    const r = normalizar(RICO);
    const nvda = r.activos[0];
    expect(nvda?.puntuacion).toBe(1);
    expect(nvda?.postura).toBe("alcista");
    expect(nvda?.tipo).toBe("accion");
    expect(nvda?.catalizador).toBe("EARNINGS");
    expect(nvda?.acuerdo).toEqual({ alcista: 3, bajista: 1, neutral: 0 });
    expect(r.titulo).toBe("Resumen del 2026-11-11");
  });

  it("usa la fecha de Notion si el JSON no la trae", () => {
    expect(normalizar({ ...RICO, date: "" }, { fecha: "2026-11-12" }).fecha).toBe("2026-11-12");
  });

  it("falla rápido con esquemas desconocidos, sin fecha o sin objeto", () => {
    expect(() => normalizar({ ...RICO, schema: "otra.cosa.v2" })).toThrow(/esquema/);
    expect(() => normalizar({ ...RICO, date: "ayer" })).toThrow(/fecha/);
    expect(() => normalizar([])).toThrow(/objeto/);
  });

  it("un día sin activos tiene sesgo 'sin datos'", () => {
    expect(normalizar({ date: "2026-11-10", assets: [] }, { sesgo: "Alcista" }).sesgo).toBe("sin datos");
  });
});

describe("utilidades de normalización", () => {
  it("limpia caracteres de control y de dirección", () => {
    expect(limpiarTexto("a\u202Eb\u0000c   d", 10)).toBe("abc d");
  });

  it("valida tickers", () => {
    expect(normalizarTicker("$nvda")).toBe("NVDA");
    expect(normalizarTicker("BRK.B")).toBe("BRK.B");
    expect(normalizarTicker("<img>")).toBeNull();
  });

  it("clasifica tipos de activo", () => {
    expect(tipoDeActivo("ETH", "")).toBe("cripto");
    expect(tipoDeActivo("SPX", "")).toBe("indice");
    expect(tipoDeActivo("AAPL", "")).toBe("accion");
    expect(tipoDeActivo("ALGO RARO 1", "")).toBe("otro");
  });

  it("agrega posturas", () => {
    expect(posturaAgregada(["alcista", "alcista"])).toBe("alcista");
    expect(posturaAgregada(["alcista", "bajista"])).toBe("mixta");
    expect(posturaAgregada([null])).toBe("neutral");
  });
});

describe("demo y agregados", () => {
  const demo = crearDemo(new Date("2026-11-16T12:00:00Z"));

  it("genera cinco días válidos que terminan hoy", () => {
    expect(demo).toHaveLength(5);
    expect(demo.at(-1)?.fecha).toBe("2026-11-16");
    for (const r of demo) expect(ResumenDiario.safeParse(r.resumen).success).toBe(true);
  });

  it("resume tickers con el más mencionado primero", () => {
    const t = resumenTickers(demo);
    expect(t[0]?.ticker).toBe("BTC");
    expect(t[0]?.dias).toBe(4);
    expect(t.find((x) => x.ticker === "NEAR")?.ultima_postura).toBe("mixta");
  });

  it("devuelve el historial de un ticker, más reciente primero", () => {
    const h = historialTicker(demo, "near");
    expect(h.map((d) => d.fecha)).toEqual(["2026-11-16", "2026-11-14"]);
  });

  it("calcula estadísticas", () => {
    const e = estadisticas(demo);
    expect(e).toMatchObject({ resumenes: 5, desde: "2026-11-12", hasta: "2026-11-16" });
    expect(e.sesgos.alcista).toBe(2);
  });

  it("busca sin acentos ni mayúsculas", () => {
    expect(buscar(demo, "INFLACION").length).toBeGreaterThan(0);
    expect(buscar(demo, "nvda pedidos")[0]?.ticker).toBe("NVDA");
    expect(buscar(demo, "x")).toEqual([]);
  });
});
