import type { Tesis } from "../lib/tesis";
import { EnlaceExterno } from "../components/Comunes";

const MOTIVO: Record<string, string> = {
  not_in_citations: "xAI did not cite it (possible hallucination)",
  handle_not_allowed: "Account outside the allowlist",
  outside_date_window: "Outside the queried date window",
  invalid_shape: "Malformed response",
  duplicate: "Duplicate",
};

const TABLA: Record<string, string> = {
  tickers_info: "TickersInfo",
  x_creative_output: "X Creative Output",
  x_account_analyses: "X Account Analyses",
};

const SENTIMIENTO: Record<string, string> = { positive: "positive", neutral: "neutral", negative: "negative", mixed: "mixed" };
const NIVEL: Record<string, string> = { official: "official", core: "core", ecosystem: "ecosystem", analyst: "analyst" };
const TEMA_MESA: Record<string, string> = { setup: "setup", positioning: "positioning", exploit: "incident", partnership: "partnership", price: "price", macro: "macro" };

export function SeccionSocial({ tesis }: { tesis: Tesis }) {
  const { weeks, latest_posts, discard_reasons, notion } = tesis.oso;
  const { desk } = tesis;
  const ultima = weeks.at(-1);
  return (
    <>
      <p className="lede">
        What Bear read in Notion and on X. Figures that appear in posts or tables are never used as data: they are marked as claims Bison must verify.
      </p>

      {notion ? (
        <>
          <h2>Notion dossier</h2>
          <p className="muted">
            {notion.generated_at.slice(0, 10)} · {notion.counts.tickers} TickersInfo · {notion.counts.creative} X Creative Output · {notion.counts.analyses} X Account Analyses · {notion.counts.discarded_false_positives} false-positive matches discarded
          </p>
          <div className="stat-row">
            <div className="stat"><span>Positive</span><strong>{notion.sentiment_tally.positive}</strong></div>
            <div className="stat"><span>Mixed</span><strong>{notion.sentiment_tally.mixed}</strong></div>
            <div className="stat"><span>Neutral</span><strong>{notion.sentiment_tally.neutral}</strong></div>
            <div className="stat"><span>Negative</span><strong>{notion.sentiment_tally.negative}</strong></div>
          </div>
          {notion.paragraphs.map((p) => <p key={p.slice(0, 48)}>{p}</p>)}
          {notion.themes.length > 0 ? (
            <>
              <h3>Themes</h3>
              <ul>{notion.themes.map((t) => <li key={t.id}><strong>{t.title}</strong> ({t.evidence_count}): {t.summary}</li>)}</ul>
            </>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Table</th><th>Title</th><th>Date</th><th>Sentiment</th><th>Excerpt</th></tr></thead>
              <tbody>
                {notion.hits.map((h) => (
                  <tr key={h.page_id}>
                    <td>{TABLA[h.source] ?? h.source}</td>
                    <td><EnlaceExterno url={h.url}>{h.title}</EnlaceExterno></td>
                    <td>{h.date ?? "—"}</td>
                    <td>{h.sentiment ? SENTIMIENTO[h.sentiment] : "—"}</td>
                    <td>{h.excerpt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="muted">Bear has no Notion dossier yet. Set NOTION_TOKEN and run <code>pnpm tesis:oso:notion</code>.</p>
      )}

      {desk ? (
        <>
          <h2>Desk observations</h2>
          <p className="muted">{desk.desks.length} public desks · paraphrased from Notion rows · claims from public accounts, not measurements. Bison has not verified them.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Desk</th><th>Topic</th><th>Claim</th></tr></thead>
              <tbody>
                {desk.observations.map((o) => (
                  <tr key={o.id}><td>{o.date ?? "—"}</td><td>{o.desk}</td><td>{TEMA_MESA[o.topic] ?? o.topic}</td><td>{o.claim}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {ultima ? (
        <>
          <h2>Week {ultima.week} {ultima.reconstructed ? "(reconstructed)" : "(live)"}</h2>
          <div className="stat-row">
            <div className="stat"><span>Sentiment index</span><strong>{ultima.sentiment_index?.toFixed(2) ?? "—"}</strong></div>
            <div className="stat"><span>Verified posts</span><strong>{ultima.post_count}</strong></div>
            <div className="stat"><span>Discarded</span><strong>{ultima.discarded_count}</strong></div>
          </div>
          <h2>Narratives</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Topic</th><th>Posts</th><th>Avg sentiment</th><th>Weight (credibility)</th></tr></thead>
              <tbody>{ultima.narratives.map((n) => <tr key={n.topic}><td>{n.topic}</td><td>{n.posts}</td><td>{n.avg_sentiment.toFixed(2)}</td><td>{n.weight.toFixed(2)}</td></tr>)}</tbody>
            </table>
          </div>
          <h2>Claims Bison must verify</h2>
          <ul>{ultima.claims_to_verify.map((c) => <li key={c.post_id}><EnlaceExterno url={c.url}>{c.paraphrase}</EnlaceExterno> <span className="muted">· {c.topic}</span></li>)}</ul>
        </>
      ) : (
        <p>Bear has no analyzed weeks yet.</p>
      )}

      <h2>Highest-credibility posts</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Account</th><th>Tier</th><th>Paraphrase</th><th>Credibility</th><th>Sentiment</th></tr></thead>
          <tbody>
            {latest_posts.map((p) => (
              <tr key={p.post_id}>
                <td><EnlaceExterno url={p.url}>@{p.handle}</EnlaceExterno></td>
                <td>{NIVEL[p.tier] ?? p.tier}</td>
                <td>{p.paraphrase}</td>
                <td>{p.credibility.toFixed(2)}</td>
                <td>{p.sentiment.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Why posts were discarded</h2>
      <ul>{Object.entries(discard_reasons).map(([k, n]) => <li key={k}>{MOTIVO[k] ?? k}: {n}</li>)}</ul>
    </>
  );
}
