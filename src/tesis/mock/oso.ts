import { addDays, daysBetween } from "../../lib/dates";
import { scorePosts } from "../oso/score";
import { verifyPosts } from "../oso/extract";
import type { OsoDaily, HandleTier } from "../esquemas/oso";
import type { Rng } from "./prng";

/** Fictional accounts only: simulated posts must never be attributed to real people. */
export const MOCK_HANDLES: { handle: string; tier: HandleTier }[] = [
  { handle: "mock_official", tier: "official" },
  { handle: "mock_core_dev", tier: "core" },
  { handle: "mock_eco_a", tier: "ecosystem" },
  { handle: "mock_eco_b", tier: "ecosystem" },
  { handle: "mock_analyst_a", tier: "analyst" },
  { handle: "mock_analyst_b", tier: "analyst" },
];

const TOPICS = ["intents", "near-ai", "chain-signatures", "ecosystem", "token", "partnerships"] as const;
const PARAPHRASES: Record<(typeof TOPICS)[number], string[]> = {
  intents: ["[MOCK] Highlights growth in cross-chain swaps routed by Intents.", "[MOCK] Explains how a new chain was added to Intents routing."],
  "near-ai": ["[MOCK] Announces a private inference feature for agents.", "[MOCK] Shares a demo of an agent that pays for an API."],
  "chain-signatures": ["[MOCK] Describes a wallet that uses chain signatures to sign on another chain."],
  ecosystem: ["[MOCK] Summarizes new projects deployed this week.", "[MOCK] Summarizes a community call."],
  token: ["[MOCK] Opinion on the token's long-term value.", "[MOCK] Speculative price prediction with no sources."],
  partnerships: ["[MOCK] Announces an integration with an external protocol."],
};

/**
 * Bear daily output for the simulated window. The pipeline is real (verifyPosts + scorePosts);
 * only the "LLM response" is simulated, including some hallucinated or out-of-scope posts that should be discarded.
 * The penultimate week is deliberately euphoric so the divergence detector ("mirage") has something to flag.
 */
export function mockOso(rng: Rng, end: string, weeks: number, liveFrom: string): OsoDaily[] {
  const start = addDays(end, -7 * weeks);
  const euphoricFrom = addDays(end, -14);
  const euphoricTo = addDays(end, -7);
  const tiers = new Map(MOCK_HANDLES.map((h) => [h.handle, h.tier]));
  let seq = 1;
  return daysBetween(start, end).map((date) => {
    const euphoric = date >= euphoricFrom && date < euphoricTo;
    const raw: Record<string, unknown>[] = [];
    const citations = new Set<string>();
    const n = rng.int(2, 5);
    for (let k = 0; k < n; k++) {
      const h = rng.pick(MOCK_HANDLES);
      const topic = h.tier === "analyst" && rng.next() < 0.3 ? "token" : rng.pick(TOPICS);
      const id = String(9_000_000_000 + seq++);
      const url = `https://x.com/${h.handle}/status/${id}`;
      citations.add(url);
      const promo = topic === "token" && rng.next() < 0.5;
      const numeric = topic === "intents" || promo;
      raw.push({
        post_id: id,
        url,
        handle: h.handle,
        date,
        claim_type: promo ? "promo" : topic === "token" ? "opinion" : rng.pick(["announcement", "metric", "opinion"]),
        paraphrase: rng.pick(PARAPHRASES[topic]),
        primary_source_url: !promo && rng.next() < 0.55 ? "https://example.org/mock-primary-source" : null,
        contains_numeric_claim: numeric,
        sentiment: Math.round(Math.min(1, Math.max(-1, (euphoric ? 0.75 : 0.25) + rng.between(-0.35, 0.35))) * 100) / 100,
        topics: [topic],
      });
    }
    if (rng.next() < 0.35) {
      raw.push({
        post_id: "0", url: `https://x.com/mock_eco_a/status/${8_000_000_000 + seq++}`, handle: "mock_eco_a", date,
        claim_type: "metric", paraphrase: "[MOCK] Hallucinated post that does not appear in the citations.", primary_source_url: null,
        contains_numeric_claim: true, sentiment: 0.9, topics: ["intents"],
      });
    }
    if (rng.next() < 0.2) {
      const url = `https://x.com/mock_outsider/status/${7_000_000_000 + seq++}`;
      citations.add(url);
      raw.push({
        post_id: "0", url, handle: "mock_outsider", date, claim_type: "promo", paraphrase: "[MOCK] Post from an account outside the list.",
        primary_source_url: null, contains_numeric_claim: true, sentiment: 1, topics: ["token"],
      });
    }
    const { kept, discarded } = verifyPosts({ posts: raw, citations, allowedHandles: new Set(tiers.keys()), date });
    return {
      mode: "mock",
      date,
      reconstructed: date < liveFrom,
      search_model: "mock:x_search",
      structuring_model: "mock:structuring",
      posts_fetched: raw.length,
      posts: scorePosts(kept, tiers),
      discarded,
    };
  });
}
