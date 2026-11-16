import { OsoNotionHit, OsoNotionSnapshot } from "../esquemas/oso";
import { DeskSnapshot } from "../esquemas/mercado";
import { summarize } from "../oso/notion/summarize";

/**
 * Sample desk notes. The facts below were read from the author's three Notion tables (TickersInfo, X Creative
 * Output, X Account Analyses) and are paraphrased: no post text is copied and no private field is kept.
 * They are tagged "desk" everywhere because they are claims from public accounts, not measurements.
 */
export const DESK_ANCHORS = {
  nearPrint: { date: "2026-10-25", close: 4.45 },
  btcPrint: { date: "2026-11-01", close: 77_600 },
  nearPins: [{ date: "2026-10-15", close: 4.6 }, { date: "2026-10-25", close: 4.45 }],
  btcPins: [{ date: "2026-11-01", close: 77_600 }, { date: "2026-11-11", close: 71_500 }],
} as const;

const DESKS = ["CastilloTrading", "Nebraskangooner", "Zeneca", "arkham", "TradingLatino", "IncomeSharks", "MessariCrypto"] as const;

const FIGURES = [
  { id: "near_print_oct15", label: "NEAR price print in TickersInfo (mid-October)", value: 4.6, unit: "usd2", as_of: "2026-10-15", note: "Approximate spot price cited next to a chart comment." },
  { id: "near_print_oct25", label: "NEAR price print in TickersInfo (late October)", value: DESK_ANCHORS.nearPrint.close, unit: "usd2", as_of: DESK_ANCHORS.nearPrint.date },
  { id: "near_move_oct25_pct", label: "NEAR move cited on the selloff day", value: -5.4, unit: "pct", as_of: "2026-10-25" },
  { id: "btc_move_oct25_pct", label: "BTC move cited the same day", value: -0.9, unit: "pct", as_of: "2026-10-25" },
  { id: "btc_dominance_oct25_pct", label: "BTC dominance cited the same day", value: 60.13, unit: "pct", as_of: "2026-10-25" },
  { id: "omni_exploit_usd", label: "Omni bridge exploit amount reported by a desk", value: 3_800_000, unit: "usd", as_of: "2026-10-02", note: "Approximate." },
  { id: "omni_networks_paused", label: "Networks with deposits and withdrawals paused", value: 11, unit: "count", as_of: "2026-10-02" },
  { id: "whale_long_sep_usd", label: "Whale NEAR long reported by Arkham (September)", value: 29_700_000, unit: "usd", as_of: "2026-09-26" },
  { id: "whale_leverage", label: "Leverage on that long", value: 10, unit: "count", as_of: "2026-09-26" },
  { id: "whale_pnl_sep_usd", label: "Unrealized profit on that long (September)", value: 16_000_000, unit: "usd", as_of: "2026-09-26", note: "Approximate." },
  { id: "whale_long_oct_usd", label: "Whale NEAR long (late October, lower bound)", value: 25_000_000, unit: "usd", as_of: "2026-10-26", note: "Reported as \"more than\"." },
  { id: "whale_pnl_oct_usd", label: "Profit on that long (late October, lower bound)", value: 10_000_000, unit: "usd", as_of: "2026-10-26", note: "Reported as \"more than\"." },
  { id: "whale_btc_shorts_usd", label: "Shorts the same whale holds on major coins", value: 13_100_000, unit: "usd", as_of: "2026-10-26" },
  { id: "btc_oct25_low_usd", label: "BTC low cited on the selloff day", value: 79_220, unit: "usd", as_of: "2026-10-25" },
  { id: "btc_nov01_usd", label: "BTC level cited in the first November summary", value: DESK_ANCHORS.btcPrint.close, unit: "usd", as_of: DESK_ANCHORS.btcPrint.date, note: "Approximate." },
  { id: "btc_nov11_usd", label: "BTC level cited in the second November summary", value: 71_500, unit: "usd", as_of: "2026-11-11", note: "Approximate; the summary describes it as support inside a range." },
] as const;

const OBSERVATIONS = [
  { id: "sep07_breakout", date: "2026-09-07", desk: "X Creative Output", topic: "setup", claim: "The daily summary notes that NEAR breaks above resistance." },
  { id: "sep18_base", date: "2026-09-18", desk: "Nebraskangooner", topic: "setup", claim: "Includes NEAR among constructive charts; the summary speaks of a weekly base forming." },
  { id: "sep22_bottoms", date: "2026-09-22", desk: "CastilloTrading", topic: "setup", claim: "Mentions NEAR among possible bottoms, alongside several other large alts." },
  { id: "sep26_whale", date: "2026-09-26", desk: "arkham", topic: "positioning", claim: "A whale wallet tracked by Arkham holds a NEAR long of {{metric:desk_whale_long_sep_usd}} with {{metric:desk_whale_leverage}}x leverage and about {{metric:desk_whale_pnl_sep_usd}} of unrealized profit." },
  { id: "sep30_bottom", date: "2026-09-30", desk: "Nebraskangooner", topic: "setup", claim: "Calls NEAR a giant bottom, with a strong monthly candle." },
  { id: "oct01_rs", date: "2026-10-01", desk: "Zeneca", topic: "setup", claim: "Includes NEAR among names showing relative strength during pullbacks." },
  { id: "oct02_exploit", date: "2026-10-02", desk: "TradingLatino", topic: "exploit", claim: "Reports an Omni bridge exploit of about {{metric:desk_omni_exploit_usd}} on NEAR Intents; deposits and withdrawals were paused on {{metric:desk_omni_networks_paused}} networks and refunds were promised. Service was later restored and the incident was scoped to a single stablecoin route. The desk says the NEAR chain and token were unaffected." },
  { id: "oct08_conviction", date: "2026-10-08", desk: "Zeneca", topic: "positioning", claim: "Includes NEAR on a ten-name conviction list for the cycle." },
  { id: "oct16_brave", date: "2026-10-16", desk: "Zeneca", topic: "partnership", claim: "Reports a NEAR and Brave partnership (with a thin sample of posts)." },
  { id: "oct25_selloff", date: "2026-10-25", desk: "Nebraskangooner", topic: "macro", claim: "Alts fell harder than BTC: NEAR {{metric:desk_near_move_oct25_pct}} vs BTC {{metric:desk_btc_move_oct25_pct}}, with BTC dominance at {{metric:desk_btc_dominance_oct25_pct}}." },
  { id: "oct26_whale", date: "2026-10-26", desk: "arkham", topic: "positioning", claim: "The same whale reports more than {{metric:desk_whale_pnl_oct_usd}} of profit on a NEAR long above {{metric:desk_whale_long_oct_usd}}, while holding {{metric:desk_whale_btc_shorts_usd}} in shorts on major coins." },
  { id: "oct28_green", date: "2026-10-28", desk: "CastilloTrading", topic: "setup", claim: "Reports that the small NEAR long, held alongside ZRO, HYPE, and ONDO, is in profit, and keeps a short-term bullish bias tied to a BTC nPOC level." },
] as const;

export function mockDesk(generatedAt: string): DeskSnapshot {
  return DeskSnapshot.parse({
    mode: "mock", generated_at: generatedAt, source: "notion", desks: [...DESKS], figures: FIGURES, observations: OBSERVATIONS,
  });
}

const hit = (h: Omit<OsoNotionHit, "url" | "page_id"> & { n: number }): OsoNotionHit => {
  const { n, ...rest } = h;
  return OsoNotionHit.parse({ ...rest, page_id: `sample-${String(n).padStart(2, "0")}`, url: null });
};

/** Sample Notion dossier: one row per curated observation, with the sentiment labels the rows carry. */
export function mockNotion(generatedAt: string): OsoNotionSnapshot {
  const hits = [
    hit({ n: 1, source: "tickers_info", title: "NEAR", date: "2026-10-25", sentiment: null, account: null, topic: "Layer 1", excerpt: "Price print of 4.45 on October 25 and about 4.60 on October 15. Desks note the selloff (NEAR -5.4% vs BTC -0.9%) and a small NEAR long alongside ZRO, HYPE, and ONDO." }),
    hit({ n: 2, source: "tickers_info", title: "NEAR Intents", date: "2026-10-02", sentiment: null, account: null, topic: "Intents", excerpt: "Omni bridge exploit of about 3.8M on October 2; operations paused then partly restored, with refunds promised." }),
    hit({ n: 3, source: "x_creative_output", title: "Daily summary · September 7", date: "2026-09-07", sentiment: null, account: null, topic: "Setup", excerpt: "NEAR breaks above resistance." }),
    hit({ n: 4, source: "x_creative_output", title: "Daily summary · October 25", date: "2026-10-25", sentiment: null, account: null, topic: "Macro", excerpt: "Alts fell harder than BTC; BTC dominance at 60.13%." }),
    hit({ n: 5, source: "x_account_analyses", title: "@arkham", date: "2026-09-26", sentiment: "positive", account: "arkham", topic: "Positioning", excerpt: "Mk4 whale with a 29.7M NEAR long at 10x leverage and about 16M unrealized profit." }),
    hit({ n: 6, source: "x_account_analyses", title: "@TradingLatino", date: "2026-10-02", sentiment: "mixed", account: "TradingLatino", topic: "Exploit", excerpt: "Omni exploit on NEAR Intents; claims the chain and token were unaffected." }),
    hit({ n: 7, source: "x_account_analyses", title: "@Nebraskangooner", date: "2026-10-25", sentiment: "negative", account: "Nebraskangooner", topic: "Macro", excerpt: "Weekend flush; NEAR among the hardest-hit alts." }),
    hit({ n: 8, source: "x_account_analyses", title: "@arkham", date: "2026-10-26", sentiment: "neutral", account: "arkham", topic: "Positioning", excerpt: "Same whale: more than 10M profit on a NEAR long above 25M, with 13.1M in shorts on majors." }),
    hit({ n: 9, source: "x_account_analyses", title: "@CastilloTrading", date: "2026-10-28", sentiment: "positive", account: "CastilloTrading", topic: "Setup", excerpt: "Small NEAR long in profit; short-term bullish bias tied to a BTC nPOC." }),
    hit({ n: 10, source: "x_account_analyses", title: "@Zeneca", date: "2026-10-16", sentiment: null, account: "Zeneca", topic: "Partnership", excerpt: "Reports a NEAR and Brave partnership (thin sample)." }),
  ];
  return summarize({
    mode: "mock", generated_at: generatedAt,
    databases: {
      tickers_info: "99687de2-cbd0-4b2e-9e1c-0dd0a3211357",
      x_creative_output: "460be6fc-c001-4330-9832-c55f647c5c23",
      x_account_analyses: "bbaf87b8-dfa1-4cce-acb3-f4f69a0c383d",
    },
    scanned_pages: hits.length, discarded_false_positives: 0, hits,
  });
}
