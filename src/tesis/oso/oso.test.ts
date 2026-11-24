import type { OsoDaily, ExtractedPost } from "../esquemas/oso";
import { normalizeStatusUrl, verifyPosts } from "./extract";
import { SCORING, scorePosts } from "./score";
import { buildWeekly, sentimentIndex } from "./weekly";

const post = (over: Partial<ExtractedPost> = {}): ExtractedPost => ({
  post_id: "1",
  url: "https://x.com/alice/status/1",
  handle: "alice",
  date: "2026-11-02",
  claim_type: "announcement",
  paraphrase: "Announces an integration.",
  primary_source_url: null,
  contains_numeric_claim: false,
  sentiment: 0.5,
  topics: ["intents"],
  ...over,
});

describe("normalizeStatusUrl", () => {
  it("normaliza twitter.com y los parámetros de consulta", () => {
    expect(normalizeStatusUrl("https://twitter.com/Alice/status/42?s=20")?.canonical).toBe("https://x.com/Alice/status/42");
    expect(normalizeStatusUrl("https://example.com/a")).toBeNull();
  });
});

describe("verifyPosts (compuerta contra alucinaciones)", () => {
  const base = { citations: new Set(["https://x.com/alice/status/1", "https://x.com/eve/status/3"]), allowedHandles: new Set(["Alice"]), date: "2026-11-02" };

  it("conserva las publicaciones citadas de cuentas permitidas en el día correcto", () => {
    const { kept, discarded } = verifyPosts({ ...base, posts: [post()] });
    expect(kept).toHaveLength(1);
    expect(discarded).toEqual([]);
  });

  it("descarta publicaciones sin cita, ajenas, fuera de la ventana, mal formadas y duplicadas", () => {
    const { kept, discarded } = verifyPosts({
      ...base,
      posts: [
        post({ url: "https://x.com/alice/status/999" }),
        post({ url: "https://x.com/eve/status/3", handle: "eve" }),
        post({ date: "2026-10-30" }),
        { url: "https://x.com/alice/status/1", sentiment: 5 },
        post(),
        post(),
      ],
    });
    expect(kept).toHaveLength(1);
    expect(discarded.map((d) => d.reason)).toEqual(["not_in_citations", "handle_not_allowed", "outside_date_window", "invalid_shape", "duplicate"]);
  });
});

describe("scorePosts", () => {
  const tiers = new Map([["alice", "official" as const], ["bob", "analyst" as const]]);

  it("es determinista y está acotado en [0, 1]", () => {
    const [p] = scorePosts([post({ primary_source_url: "https://near.org/blog" })], tiers);
    expect(p?.credibility).toBeCloseTo(SCORING.tier.official + SCORING.primarySourceBonus);
  });

  it("premia la corroboración y penaliza las promociones y los números sin fuente", () => {
    const scored = scorePosts(
      [post(), post({ post_id: "2", handle: "bob", url: "https://x.com/bob/status/2", claim_type: "promo", contains_numeric_claim: true })],
      tiers,
    );
    expect(scored[0]?.components.corroboration).toBe(SCORING.corroborationBonusPerHandle);
    expect(scored[1]?.credibility).toBe(0);
  });
});

describe("agregación semanal", () => {
  const day = (date: string, posts: ExtractedPost[], reconstructed = false): OsoDaily => ({
    mode: "mock", date, reconstructed, search_model: "m", structuring_model: "m", posts_fetched: null,
    posts: scorePosts(posts, new Map([["alice", "official"]])), discarded: [{ url: "u", reason: "not_in_citations" }],
  });

  it("devuelve sentimiento null cuando no hay evidencia", () => {
    expect(sentimentIndex([])).toBeNull();
  });

  it("agrega una semana ISO y marca las semanas reconstruidas", () => {
    const w = buildWeekly([day("2026-11-02", [post()], true), day("2026-11-03", [post({ post_id: "5", url: "https://x.com/alice/status/5", sentiment: -0.5 })]), day("2026-11-10", [post()])], "2026-11-02");
    expect(w.week).toBe("2026-W45");
    expect(w.post_count).toBe(2);
    expect(w.discarded_count).toBe(2);
    expect(w.reconstructed).toBe(true);
    expect(w.sentiment_index).toBeCloseTo(0);
  });
});
