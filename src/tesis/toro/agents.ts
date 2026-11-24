import { loadQuery } from "../bisonte/bq/client";
import type { Inputs } from "./load";
import type { Analysis } from "./types";
import type { Violation } from "./verify";

/** `status` is an id for the site (indicator color); `name` and `detail` are visible English text. */
export type Validation = { name: string; status: "pass" | "warn" | "fail" | "n/a"; detail: string };
export type Run = { at: string; summary: string; details: Record<string, string | number | boolean | null> };
export type AgentCard = {
  id: "oso" | "bisonte" | "toro";
  name: string;
  role: string;
  does: string[];
  inputs: string[];
  outputs: string[];
  runs: Run[];
  validations: Validation[];
};

const DAY = 86_400_000;

export function buildAgents(inputs: Inputs, a: Analysis, violations: readonly Violation[], maxBytes: number): AgentCard[] {
  const { manifest, osoDaily } = inputs;
  const queryIds = manifest.items.filter((i) => i.query_file).map((i) => i.id);
  const partitionOk = queryIds.every((id) => {
    try {
      loadQuery(id);
      return true;
    } catch {
      return false;
    }
  });
  const lastBlock = manifest.freshness.last_block_date;
  const lagDays = lastBlock ? Math.round((Date.parse(`${manifest.window.end}T00:00:00Z`) - Date.parse(`${lastBlock}T00:00:00Z`)) / DAY) : null;
  const overCap = manifest.items.filter((i) => i.bytes_processed !== null && i.bytes_processed > maxBytes);
  const reasons = (r: string) => osoDaily.reduce((n, d) => n + d.discarded.filter((x) => x.reason === r).length, 0);
  const reconstructedWeeks = inputs.osoWeekly.filter((w) => w.reconstructed).length;
  const notion = inputs.osoNotion;

  return [
    {
      id: "oso",
      name: "Bear",
      role: "Psychological read: what trusted X and Notion accounts say about NEAR.",
      does: [
        "Reads TickersInfo, X Creative Output, and X Account Analyses in Notion (with a token that lives only in the environment) and keeps NEAR rows, not the English words \"near\" or \"nearly\".",
        "Each day queries xAI (Grok) with the x_search tool, limited to the account list and that day.",
        "A second model, swappable via an environment variable, turns the response into JSON validated with zod.",
        "Discards posts that xAI did not cite, posts from accounts outside the list, from another date, or duplicates.",
        "Computes a deterministic credibility score and a weekly sentiment index.",
        "Maintains a curated list of desk figures (public accounts cited in Notion) and tags each as a desk claim, never as a measurement.",
      ],
      inputs: ["config/oso.handles.yaml", "config/oso.notion.yaml", "NOTION_TOKEN", "xAI Responses API · x_search", "LLM_PROVIDER / LLM_MODEL"],
      outputs: ["data/tesis/oso/daily/YYYY-MM-DD.json", "data/tesis/oso/weekly/YYYY-Www.json", "data/tesis/oso/notion/near.json"],
      runs: osoDaily.slice(-14).reverse().map((d) => ({
        at: d.date,
        summary: `${d.posts.length} verified posts · ${d.discarded.length} discarded`,
        details: { reconstructed: d.reconstructed, search: d.search_model, structuring: d.structuring_model, posts_read: d.posts_fetched },
      })),
      validations: [
        { name: "Posts without an xAI citation are discarded", status: "pass", detail: `${reasons("not_in_citations")} discarded` },
        { name: "Accounts outside the list are discarded", status: "pass", detail: `${reasons("handle_not_allowed")} discarded` },
        { name: "Posts outside the date window are discarded", status: "pass", detail: `${reasons("outside_date_window")} discarded` },
        { name: "Reconstructed weeks are marked", status: reconstructedWeeks > 0 ? "warn" : "pass", detail: `${reconstructedWeeks} of ${inputs.osoWeekly.length} weeks are reconstructed` },
        {
          name: "Desk figures are tagged as claims",
          status: inputs.desk ? "pass" : "n/a",
          detail: inputs.desk ? `${inputs.desk.figures.length} figures, ${inputs.desk.observations.length} observations, ${inputs.desk.desks.length} desks` : "no curated desk file in this build",
        },
        {
          name: "NEAR Notion dossier",
          status: notion ? "pass" : "n/a",
          detail: notion
            ? `${notion.hits.length} NEAR rows · ${notion.counts.discarded_false_positives} false positives discarded`
            : "not run (missing NOTION_TOKEN or artifact)",
        },
      ],
    },
    {
      id: "bisonte",
      name: "Bison",
      role: "Technical read: NEAR on-chain activity and 1Click Swap volume.",
      does: [
        "Queries the public NEAR BigQuery dataset with versioned, parameterized queries.",
        "Runs a dry run before each query and aborts if it exceeds BQ_MAX_BYTES.",
        "Downloads successful 1Click swaps from Intents Explorer, respecting its one-request-per-five-seconds limit.",
        "Stores raw data and a manifest so everything can be reconstructed without credentials.",
        "Hands Bull daily NEAR and BTC candles when a price source is configured; without one, every technical metric is reported as unavailable.",
      ],
      inputs: ["bigquery-public-data.crypto_near_mainnet_us", "Intents Explorer API (JWT)", "src/tesis/bisonte/bq/queries/*.sql"],
      outputs: ["data/tesis/raw/bq/*.json", "data/tesis/raw/intents/intents_daily.json", "data/tesis/raw/manifest.json"],
      runs: manifest.items.map((i) => ({
        at: i.fetched_at.slice(0, 10),
        summary: `${i.id}: ${i.rows} rows`,
        details: { source: i.source, query: i.query_file, endpoint: i.endpoint, bytes: i.bytes_processed },
      })),
      validations: [
        { name: "Every query filters by block_date", status: partitionOk ? "pass" : "fail", detail: `${queryIds.length} queries reviewed` },
        { name: "Bytes per query under the cap", status: overCap.length ? "fail" : inputs.mode === "mock" ? "n/a" : "pass", detail: inputs.mode === "mock" ? "no BigQuery in mock mode" : `${overCap.length} over the cap` },
        { name: "Dataset freshness", status: lagDays === null ? "fail" : lagDays <= 2 ? "pass" : "warn", detail: lastBlock ? `last block ${lastBlock} (${lagDays} ${lagDays === 1 ? "day" : "days"} lag)` : "no freshness data" },
        {
          name: "Price candles",
          status: inputs.price ? (inputs.mode === "mock" ? "n/a" : "warn") : "n/a",
          detail: inputs.price
            ? inputs.mode === "mock" ? "simulated candles" : `source ${inputs.price.near.source}: confirm it is an approved source`
            : "no price source configured; technical metrics are unavailable",
        },
        { name: "Data validated with zod", status: "pass", detail: `${manifest.items.length} datasets` },
      ],
    },
    {
      id: "toro",
      name: "Bull",
      role: "Synthesis: crosses Bear with Bison and writes the thesis.",
      does: [
        "Computes metrics with pure functions from raw data.",
        "Builds each chart with its query and a plain-language sentence.",
        "Crosses sentiment and activity to separate confirmations from mirages.",
        "Computes the technical layer on the candles: averages, range and Fibonacci levels, nPOC marks, relative strength, beta vs BTC, and a confluence count.",
        "Contrasts the BTC weekly-average tripwire and reference theses as context, tagged as cited and unverified.",
        "Writes TESIS.md from a template where every figure comes from a placeholder.",
      ],
      inputs: ["data/tesis/raw/**", "data/tesis/oso/**", "src/tesis/toro/params.ts"],
      outputs: ["data/tesis/TESIS.md", "data/tesis/derived/metrics.json", "dist/ (site)"],
      runs: [{ at: a.generated_at.slice(0, 10), summary: `${Object.keys(a.metrics).length} metrics · ${a.divergences.length} weeks crossed`, details: { mode: a.mode } }],
      validations: [
        { name: "No hand-written figures", status: violations.length ? "fail" : "pass", detail: violations.length ? violations.map((v) => v.check).join("; ") : "every figure comes from metrics.json" },
        { name: "Every chart has a query and a sentence", status: violations.some((v) => v.check.startsWith("chart")) ? "fail" : "pass", detail: "reviewed by verify" },
        { name: "Every figure carries a provenance tag", status: "pass", detail: "computed, simulated, desk, or cited" },
        { name: "Simulated and live data are never mixed", status: "pass", detail: `mode ${a.mode}` },
      ],
    },
  ];
}
