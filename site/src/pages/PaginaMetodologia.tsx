import { PARAMS } from "../../../src/tesis/toro/params";
import { SCORING } from "../../../src/tesis/oso/score";

const NIVEL: Record<string, string> = { official: "official", core: "core", ecosystem: "ecosystem", analyst: "analyst" };

export function PaginaMetodologia() {
  return (
    <section className="page">
      <header className="page-head">
        <span className="eyebrow">Methodology</span>
        <h1>How each datapoint is obtained and combined</h1>
        <p>Which sources are used, which parameters were fixed before seeing results, and what cannot be measured.</p>
      </header>

      <h2>News</h2>
      <ul>
        <li><strong>Origin:</strong> a bot writes a Notion page each day in a database with a JSON block (<code>*.digest.v1</code>): title, overall bias, context, and assets with their evidence.</li>
        <li><strong>Sync:</strong> <code>pnpm noticias:sync</code> reads pages edited in recent days, validates the JSON with zod, drops what fails, and stores one row per day in Supabase. If the content did not change, nothing is rewritten.</li>
        <li><strong>Content safety:</strong> what posts say is evidence, never instructions. Only https links are shown and text is never interpreted as HTML.</li>
        <li><strong>Asset stance:</strong> written by the bot; ubitwo normalizes it to bullish, bearish, neutral, or mixed and counts agreement across accounts.</li>
        <li><strong>Questions:</strong> the answer may only use saved digests. If no AI model is configured, ubitwo replies with the most relevant fragments, without inventing.</li>
      </ul>

      <h2>Thesis: sources</h2>
      <ul>
        <li><strong>Bison · BigQuery:</strong> public chain tables (<code>blocks</code>, <code>transactions</code>, <code>receipt_actions</code>). Each query filters by <code>block_date</code> and goes through a dry run with a byte limit.</li>
        <li><strong>Bison · Intents Explorer:</strong> only 1Click swaps with SUCCESS status, one request every five seconds.</li>
        <li><strong>Bear · Notion:</strong> TickersInfo, X Creative Output, and X Account Analyses. The token lives in <code>NOTION_TOKEN</code>; table IDs are not secrets.</li>
        <li><strong>Bear · xAI:</strong> X search limited to a fixed account list and one day per query.</li>
      </ul>

      <h2>How to read the thesis</h2>
      <ul>
        <li><strong>Regime:</strong> direction without momentum; compares the thirty-day median of active accounts against the ninety-day median.</li>
        <li><strong>Confirmers:</strong> a sentiment rise without activity is a mirage.</li>
        <li><strong>Spike versus structural change:</strong> a jump that does not persist, or that concentrates in few signers, does not count as adoption.</li>
        <li><strong>Explicit invalidation:</strong> the thesis states in advance which outcome would change it.</li>
      </ul>

      <h2>Preregistered parameters</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
          <tbody>{Object.entries(PARAMS).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>Bear credibility score</h2>
      <p className="muted">Computed in code; the model does not decide it. The result stays between zero and one.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Component</th><th>Value</th></tr></thead>
          <tbody>
            {Object.entries(SCORING.tier).map(([k, v]) => <tr key={k}><td>Account tier: {NIVEL[k] ?? k}</td><td>{v}</td></tr>)}
            <tr><td>Links to a primary source</td><td>+{SCORING.primarySourceBonus}</td></tr>
            <tr><td>Per independent corroborating account (max {SCORING.corroborationMaxHandles})</td><td>+{SCORING.corroborationBonusPerHandle}</td></tr>
            <tr><td>Promotion</td><td>−{SCORING.promoPenalty}</td></tr>
            <tr><td>Unsourced figure</td><td>−{SCORING.unsourcedNumberPenalty}</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Limits</h2>
      <ul>
        <li>News reflects what followed accounts say, not the whole market.</li>
        <li>No price, market cap, TVL, or USD fees inside the thesis: there is no approved source for them.</li>
        <li>Accounts are not people; relayers distort the count.</li>
        <li>A lagged correlation does not prove causation.</li>
      </ul>
    </section>
  );
}
