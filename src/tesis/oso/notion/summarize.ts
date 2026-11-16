import { OsoNotionHit, OsoNotionSnapshot, type NotionSentiment, type NotionSource } from "../../esquemas/oso";
import type { NotionPage } from "./client";
import { propertyText, readProps } from "./client";
import { scrubPii } from "../../../lib/redact";
import { isNearTicker, mentionsNearFields } from "./match";

const EXCERPT = 800;
const SENTIMENT = ["positive", "neutral", "negative", "mixed"] as const;
const SENTIMENT_LABEL: Record<NotionSentiment, string> = { positive: "positive", neutral: "neutral", negative: "negative", mixed: "mixed" };

/** Notion select options are defined in Spanish by the workspace; the pipeline normalizes them to stable English internal ids. */
const SENTIMENT_MAP: Record<string, NotionSentiment> = { positivo: "positive", neutral: "neutral", negativo: "negative", mixto: "mixed" };

export function normalizeSentiment(raw: string): NotionSentiment | null {
  return SENTIMENT_MAP[raw.trim().toLowerCase()] ?? null;
}

const THEMES: { id: string; title: string; test: (blob: string) => boolean }[] = [
  { id: "intents_security", title: "NEAR Intents / Omni", test: (t) => /intents|omni|exploit|reembolso|refund/.test(t) },
  { id: "whale", title: "On-chain positioning", test: (t) => /ballena|whale|mk4|10x/.test(t) },
  { id: "brave", title: "NEAR × Brave", test: (t) => /brave/.test(t) },
  { id: "conviction", title: "Desk conviction", test: (t) => /convicci[oó]n|top 10|fuerza relativa|\brs\b|alianza/.test(t) },
  { id: "tape", title: "Price tape and alts", test: (t) => /bleeding|fake.?out|pennant|triangle|nibble|longs|alts/.test(t) },
];

function clip(text: string, max = EXCERPT): string {
  const t = scrubPii(text).replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function isoDate(raw: string): string | null {
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function tally(hits: readonly OsoNotionHit[]) {
  const out = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  for (const h of hits) if (h.sentiment) out[h.sentiment] += 1;
  return out;
}

function themesFrom(hits: readonly OsoNotionHit[]) {
  return THEMES.flatMap((th) => {
    const matched = hits.filter((h) => th.test(`${h.title} ${h.topic ?? ""} ${h.excerpt}`.toLowerCase()));
    if (!matched.length) return [];
    const unique = [...new Set(matched.map((h) => h.excerpt).filter(Boolean))].slice(0, 2);
    return [{ id: th.id, title: th.title, evidence_count: matched.length, summary: unique.join(" · ") }];
  });
}

function paragraphs(counts: OsoNotionSnapshot["counts"], hits: readonly OsoNotionHit[], sentiment: OsoNotionSnapshot["sentiment_tally"]): string[] {
  const tickers = hits.filter((h) => h.source === "tickers_info");
  const out: string[] = [];
  out.push(
    `Bear read TickersInfo, X Creative Output, and X Account Analyses for NEAR (the ticker or an uppercase mention, not the English words "near" or "nearly"). ` +
      `Kept ${counts.tickers} TickersInfo rows, ${counts.creative} X Creative Output rows, and ${counts.analyses} X Account Analyses rows, ` +
      `after scanning ${counts.scanned_pages} pages and discarding ${counts.discarded_false_positives} false matches.`,
  );
  if (tickers.length) {
    out.push(
      tickers
        .map((h) => `${h.title}${h.topic ? ` (${h.topic})` : ""}${h.excerpt ? `: ${h.excerpt}` : "."}`)
        .join(" "),
    );
  }
  const withSent = SENTIMENT.map((k) => `${SENTIMENT_LABEL[k]}: ${sentiment[k]}`).join("; ");
  out.push(`Declared sentiment on labeled rows: ${withSent}. Figures that appear in these rows are source claims, not Bison measurements.`);
  return out;
}

export function hitFromTicker(page: NotionPage): OsoNotionHit | null {
  const p = readProps(page);
  const title = propertyText(p.Ticker);
  const lastNews = propertyText(p.LastNews);
  const what = propertyText(p["What it does"]);
  const sector = propertyText(p.Sector);
  const price = propertyText(p.Price);
  if (!isNearTicker(title) && !mentionsNearFields(title, lastNews, what, sector)) return null;
  const newsDate = isoDate(lastNews);
  const bits = [
    what,
    price ? `Price (TickersInfo): ${price}` : "",
    lastNews,
  ].filter(Boolean);
  return OsoNotionHit.parse({
    source: "tickers_info",
    page_id: page.id,
    title: scrubPii(title) || "untitled ticker",
    date: newsDate,
    sentiment: null,
    account: scrubPii(propertyText(p.Username)) || null,
    topic: scrubPii(sector) || null,
    excerpt: clip(bits.join(" — ")),
    url: null,
  });
}

export function hitFromDesk(page: NotionPage, source: Exclude<NotionSource, "tickers_info">): OsoNotionHit | null {
  const p = readProps(page);
  const title = propertyText(p["Título"]);
  const exec = propertyText(p["Resumen ejecutivo"]);
  const insights = propertyText(p["Insights clave"]);
  const topic = propertyText(p["Topic / Tema principal"]);
  const posts = propertyText(p["Posts destacados"]);
  const account = propertyText(p["Cuenta analizada"]) || propertyText(p.Username);
  const date = isoDate(propertyText(p["Fecha del análisis"])) ?? isoDate(title);
  if (!mentionsNearFields(title, exec, insights, topic, posts, account)) return null;
  const sentiment = normalizeSentiment(propertyText(p["Sentimiento general"]));
  return OsoNotionHit.parse({
    source,
    page_id: page.id,
    title: scrubPii(title) || "untitled",
    date,
    sentiment,
    account: scrubPii(account) || null,
    topic: scrubPii(topic) || null,
    excerpt: clip(exec || insights || topic),
    url: null,
  });
}

export function summarize(input: {
  mode: "mock" | "live";
  generated_at: string;
  databases: OsoNotionSnapshot["databases"];
  scanned_pages: number;
  discarded_false_positives: number;
  hits: readonly OsoNotionHit[];
}): OsoNotionSnapshot {
  const hits = [...input.hits];
  const counts = {
    tickers: hits.filter((h) => h.source === "tickers_info").length,
    creative: hits.filter((h) => h.source === "x_creative_output").length,
    analyses: hits.filter((h) => h.source === "x_account_analyses").length,
    scanned_pages: input.scanned_pages,
    discarded_false_positives: input.discarded_false_positives,
  };
  const sentiment_tally = tally(hits);
  return OsoNotionSnapshot.parse({
    mode: input.mode,
    generated_at: input.generated_at,
    query: "NEAR",
    databases: input.databases,
    counts,
    sentiment_tally,
    themes: themesFrom(hits),
    paragraphs: paragraphs(counts, hits, sentiment_tally),
    hits,
  });
}
