import type { Tesis } from "../lib/tesis";
import { EnlaceExterno } from "../components/Comunes";

const MOTIVO: Record<string, string> = {
  not_in_citations: "xAI no la citó (posible alucinación)",
  handle_not_allowed: "Cuenta fuera de la lista",
  outside_date_window: "Fuera de la fecha consultada",
  invalid_shape: "Respuesta mal formada",
  duplicate: "Duplicada",
};

const TABLA: Record<string, string> = {
  tickers_info: "TickersInfo",
  x_creative_output: "X Creative Output",
  x_account_analyses: "X Account Analyses",
};

const SENTIMIENTO: Record<string, string> = { positive: "positivo", neutral: "neutral", negative: "negativo", mixed: "mixto" };
const NIVEL: Record<string, string> = { official: "oficial", core: "núcleo", ecosystem: "ecosistema", analyst: "analista" };
const TEMA_MESA: Record<string, string> = { setup: "configuración", positioning: "posicionamiento", exploit: "incidente", partnership: "alianza", price: "precio", macro: "macro" };

export function SeccionSocial({ tesis }: { tesis: Tesis }) {
  const { weeks, latest_posts, discard_reasons, notion } = tesis.oso;
  const { desk } = tesis;
  const ultima = weeks.at(-1);
  return (
    <>
      <p className="lede">
        Lo que Oso leyó en Notion y en X. Las cifras que aparecen en publicaciones o tablas nunca se usan como datos: se marcan como afirmaciones que Bisonte debe verificar.
      </p>

      {notion ? (
        <>
          <h2>Expediente de Notion</h2>
          <p className="muted">
            {notion.generated_at.slice(0, 10)} · {notion.counts.tickers} TickersInfo · {notion.counts.creative} X Creative Output · {notion.counts.analyses} X Account Analyses · {notion.counts.discarded_false_positives} coincidencias falsas descartadas
          </p>
          <div className="stat-row">
            <div className="stat"><span>Positivo</span><strong>{notion.sentiment_tally.positive}</strong></div>
            <div className="stat"><span>Mixto</span><strong>{notion.sentiment_tally.mixed}</strong></div>
            <div className="stat"><span>Neutral</span><strong>{notion.sentiment_tally.neutral}</strong></div>
            <div className="stat"><span>Negativo</span><strong>{notion.sentiment_tally.negative}</strong></div>
          </div>
          {notion.paragraphs.map((p) => <p key={p.slice(0, 48)}>{p}</p>)}
          {notion.themes.length > 0 ? (
            <>
              <h3>Temas</h3>
              <ul>{notion.themes.map((t) => <li key={t.id}><strong>{t.title}</strong> ({t.evidence_count}): {t.summary}</li>)}</ul>
            </>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tabla</th><th>Título</th><th>Fecha</th><th>Sentimiento</th><th>Extracto</th></tr></thead>
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
        <p className="muted">Oso todavía no tiene expediente de Notion. Configura NOTION_TOKEN y ejecuta <code>pnpm tesis:oso:notion</code>.</p>
      )}

      {desk ? (
        <>
          <h2>Observaciones de mesas</h2>
          <p className="muted">{desk.desks.length} mesas públicas · parafraseadas de filas de Notion · afirmaciones de cuentas públicas, no mediciones. Bisonte no las ha verificado.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Mesa</th><th>Tema</th><th>Afirmación</th></tr></thead>
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
          <h2>Semana {ultima.week} {ultima.reconstructed ? "(reconstruida)" : "(en vivo)"}</h2>
          <div className="stat-row">
            <div className="stat"><span>Índice de sentimiento</span><strong>{ultima.sentiment_index?.toFixed(2) ?? "—"}</strong></div>
            <div className="stat"><span>Publicaciones verificadas</span><strong>{ultima.post_count}</strong></div>
            <div className="stat"><span>Descartadas</span><strong>{ultima.discarded_count}</strong></div>
          </div>
          <h2>Narrativas</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tema</th><th>Publicaciones</th><th>Sentimiento medio</th><th>Peso (credibilidad)</th></tr></thead>
              <tbody>{ultima.narratives.map((n) => <tr key={n.topic}><td>{n.topic}</td><td>{n.posts}</td><td>{n.avg_sentiment.toFixed(2)}</td><td>{n.weight.toFixed(2)}</td></tr>)}</tbody>
            </table>
          </div>
          <h2>Afirmaciones que Bisonte debe verificar</h2>
          <ul>{ultima.claims_to_verify.map((c) => <li key={c.post_id}><EnlaceExterno url={c.url}>{c.paraphrase}</EnlaceExterno> <span className="muted">· {c.topic}</span></li>)}</ul>
        </>
      ) : (
        <p>Oso todavía no tiene semanas analizadas.</p>
      )}

      <h2>Publicaciones con más credibilidad</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Cuenta</th><th>Nivel</th><th>Paráfrasis</th><th>Credibilidad</th><th>Sentimiento</th></tr></thead>
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

      <h2>Por qué se descartaron publicaciones</h2>
      <ul>{Object.entries(discard_reasons).map(([k, n]) => <li key={k}>{MOTIVO[k] ?? k}: {n}</li>)}</ul>
    </>
  );
}
