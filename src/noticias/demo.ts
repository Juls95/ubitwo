import { addDays, isoDay } from "../lib/dates";
import { ESQUEMA, type RegistroResumen } from "./esquema";
import { normalizar } from "./normalizar";

/**
 * Demo data: fictional accounts and claims, in the same shape the bot writes to Notion.
 * Runs through `normalizar` like real digests, so the demo exercises the full path. Never mixed with real data.
 */
const CUENTAS = ["@demo_macro", "@demo_cripto", "@demo_tecnico", "@demo_acciones", "@demo_onchain"];

type Entrada = { ticker: string; account: string; stance: string; claim: string; invalidation?: string };

const DIAS: { sesgo: string; contexto: string; entradas: Entrada[]; conflictos: string[] }[] = [
  {
    sesgo: "Bullish",
    contexto: "Risk appetite returns after cooler-than-expected inflation data; the dollar softens and tech leads.",
    entradas: [
      { ticker: "BTC", account: "@demo_cripto", stance: "bullish", claim: "Reclaims its weekly average and ETF flows turn positive again.", invalidation: "Weekly close below the twenty-week average." },
      { ticker: "BTC", account: "@demo_macro", stance: "bullish", claim: "A weaker dollar often accompanies expansion phases in crypto." },
      { ticker: "NVDA", account: "@demo_acciones", stance: "bullish", claim: "Data-center guidance beats consensus for a third straight quarter.", invalidation: "Gross margin below guidance." },
      { ticker: "SOL", account: "@demo_onchain", stance: "neutral", claim: "Network activity rises, but fees stay flat." },
    ],
    conflictos: [],
  },
  {
    sesgo: "Mixed",
    contexto: "Indecisive market ahead of the Federal Reserve meeting; rotation from tech into defensives.",
    entradas: [
      { ticker: "BTC", account: "@demo_tecnico", stance: "bearish", claim: "Rejection at range resistance; daily RSI shows a bearish divergence.", invalidation: "Daily close above the range high." },
      { ticker: "BTC", account: "@demo_cripto", stance: "bullish", claim: "Whales keep accumulating according to on-chain data." },
      { ticker: "ETH", account: "@demo_onchain", stance: "bullish", claim: "Exchange supply falls to multi-year lows." },
      { ticker: "TSLA", account: "@demo_acciones", stance: "bearish", claim: "Deliveries miss expectations and Europe sees price cuts.", invalidation: "Automotive margin holds in the next report." },
      { ticker: "CRIPTO TOP100", account: "@demo_macro", stance: "mixed", claim: "Altcoins fail to follow BTC: dominance rises." },
    ],
    conflictos: ["@demo_tecnico sees BTC bearish on structure while @demo_cripto sees it bullish on accumulation."],
  },
  {
    sesgo: "Bearish",
    contexto: "Risk-off: bond yields climb and crypto derivatives see liquidations.",
    entradas: [
      { ticker: "BTC", account: "@demo_macro", stance: "bearish", claim: "Ten-year yields at month highs pressure risk assets." },
      { ticker: "ETH", account: "@demo_tecnico", stance: "bearish", claim: "Loses range support and leaves an open nPOC above.", invalidation: "Reclaim the lost support on a daily close." },
      { ticker: "NEAR", account: "@demo_onchain", stance: "bullish", claim: "Daily active accounts keep growing despite the price drop." },
      { ticker: "NVDA", account: "@demo_acciones", stance: "neutral", claim: "Profit-taking with no change to the fundamental case." },
    ],
    conflictos: [],
  },
  {
    sesgo: "Neutral",
    contexto: "Quiet session, low volume; the market waits on jobs data.",
    entradas: [
      { ticker: "SOL", account: "@demo_cripto", stance: "bullish", claim: "New payments apps launch on the network this week." },
      { ticker: "AAPL", account: "@demo_acciones", stance: "neutral", claim: "No clear catalysts until the product event." },
      { ticker: "BTC", account: "@demo_tecnico", stance: "neutral", claim: "Sideways inside the range; wait for a volume breakout." },
    ],
    conflictos: [],
  },
  {
    sesgo: "Bullish",
    contexto: "Solid jobs data without wage pressure; indexes print highs.",
    entradas: [
      { ticker: "NVDA", account: "@demo_acciones", stance: "bullish", claim: "Hyperscalers announce new AI chip orders." },
      { ticker: "ETH", account: "@demo_onchain", stance: "bullish", claim: "Inflows into ETH exchange-traded products rise." },
      { ticker: "NEAR", account: "@demo_cripto", stance: "bullish", claim: "Cross-chain intents volume grows for a fourth week." },
      { ticker: "NEAR", account: "@demo_tecnico", stance: "bearish", claim: "Still below the slow average; technical confirmation missing.", invalidation: "Daily close above the slow average." },
    ],
    conflictos: ["NEAR: bullish on-chain fundamentals, technical structure still bearish."],
  },
];

export function crearDemo(hoy: Date = new Date()): RegistroResumen[] {
  const fin = isoDay(hoy);
  return DIAS.map((d, i) => {
    const fecha = addDays(fin, -(DIAS.length - 1 - i));
    const resumen = normalizar(
      {
        schema: ESQUEMA,
        date: fecha,
        accounts: CUENTAS,
        market_context: d.contexto,
        assets: d.entradas.map((e) => ({ ...e, url: `https://x.com/${e.account.slice(1)}` })),
        ticker_intel: [
          { ticker: "NEAR", what_it_does: "Layer-one chain focused on account abstraction and cross-chain intents.", price: "", last_news: "", source: "https://near.org" },
          { ticker: "NVDA", what_it_does: "Designs GPUs and compute platforms for data centers and artificial intelligence.", price: "", last_news: "", source: "https://nvidia.com" },
        ],
        conflicts: d.conflictos,
        flags: ["demo"],
      },
      { titulo: `Demo digest · ${fecha}`, sesgo: d.sesgo, estado: "Completed" },
    );
    return { fecha, notion_page_id: null, resumen, actualizado: `${fecha}T13:00:00.000Z` };
  });
}
