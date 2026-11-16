import { cargarTesis, type Tesis } from "../lib/tesis";
import { NOMBRE_AGENTE } from "../lib/formato";
import { useDatos } from "../lib/useDatos";
import { Markdown } from "../lib/markdown";
import { BotLedger } from "../components/BotLedger";
import { Chart } from "../components/Chart";
import { Cargando, Status } from "../components/Comunes";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SeccionSocial } from "./SeccionSocial";

const SECCIONES = [
  { id: "summary", label: "Thesis" },
  { id: "charts", label: "Charts" },
  { id: "social", label: "Social" },
  { id: "agents", label: "Agents" },
];

function BannerSimulado({ tesis }: { tesis: Tesis }) {
  if (tesis.mode !== "mock") return null;
  return (
    <div className="aviso" role="status">
      <strong>Thesis with simulated data.</strong> On-chain, price, and sentiment figures are simulated; desk notes are real but paraphrased. With credentials, <code>pnpm tesis:refresh</code> pulls live data.
    </div>
  );
}

function Resumen({ tesis }: { tesis: Tesis }) {
  const fila = (titulo: string, valor: string | null) => (
    <div>
      <span className="eyebrow">{titulo}</span>
      <strong>{valor ?? "no data"}</strong>
    </div>
  );
  return (
    <article className="thesis">
      <div className="verdict">
        {fila("Hypothesis status", tesis.hypothesis_verdict)}
        {fila("Stance", tesis.stance)}
        {fila("Technical bias", tesis.technical_bias)}
        {fila("Adoption regime", tesis.regime)}
      </div>
      <Markdown source={tesis.thesis_md} />
    </article>
  );
}

function Graficas({ tesis }: { tesis: Tesis }) {
  return (
    <>
      <p className="lede">Each chart shows the query or endpoint that produces it and a plain sentence about what it teaches. Everything is rebuilt with <code>pnpm tesis:toro</code>.</p>
      <div className="chart-grid">
        {tesis.charts.map((c) => (
          <ErrorBoundary key={c.id} label={c.title}>
            <Chart chart={c} />
          </ErrorBoundary>
        ))}
      </div>
    </>
  );
}

function Agentes({ tesis }: { tesis: Tesis }) {
  return (
    <>
      <p className="lede">Each agent is scored on its own: what it contributed, how it reasoned, and whether it passed its validations.</p>
      <div className="ledger">
        {tesis.agents.map((a) => <BotLedger key={a.id} agente={a} tesis={tesis} />)}
      </div>
      <h2>Week by week</h2>
      <p className="muted">The weekly cross of Bear&apos;s sentiment against Bison&apos;s on-chain activity.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Week</th><th>Sentiment</th><th>On-chain</th><th>Verdict</th><th>Origin</th></tr></thead>
          <tbody>
            {tesis.divergences.map((d) => (
              <tr key={d.week}>
                <td>{d.week}</td>
                <td>{d.sentiment_index === null ? "—" : d.sentiment_index.toFixed(2)}</td>
                <td>{d.onchain_change_pct === null ? "—" : `${d.onchain_change_pct > 0 ? "+" : ""}${d.onchain_change_pct.toFixed(1)} %`}</td>
                <td>{d.quadrant}</td>
                <td>{d.reconstructed ? "reconstructed" : "live"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Agente({ tesis, id }: { tesis: Tesis; id: string }) {
  const agente = tesis.agents.find((a) => a.id === id);
  if (!agente) return <p>Unknown agent. <a href="#/thesis/agents">See the three agents</a>.</p>;
  const graficas = tesis.charts.filter((c) => c.agent === agente.id);
  const nombre = NOMBRE_AGENTE[agente.id];
  return (
    <div className={`agent-page agent-${agente.id}`}>
      <a href="#/thesis/agents" className="volver">← Agents</a>
      <header className="page-head">
        <span className="eyebrow">Agent</span>
        <h1>{nombre}</h1>
        <p>{agente.role}</p>
      </header>
      <div className="two-col">
        <div>
          <h2>What it does</h2>
          <ul>{agente.does.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <h2>Inputs</h2>
          <ul>{agente.inputs.map((d) => <li key={d}><code>{d}</code></li>)}</ul>
          <h2>Outputs</h2>
          <ul>{agente.outputs.map((d) => <li key={d}><code>{d}</code></li>)}</ul>
        </div>
      </div>
      <h2>Validations</h2>
      <ul className="validations">
        {agente.validations.map((v) => (
          <li key={v.name}>
            <Status status={v.status} />
            <span className="v-name">{v.name}</span>
            <span className="muted">{v.detail}</span>
          </li>
        ))}
      </ul>
      <h2>What it did</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Summary</th><th>Detail</th></tr></thead>
          <tbody>
            {agente.runs.map((r, i) => (
              <tr key={`${r.at}-${i}`}>
                <td>{r.at}</td>
                <td>{r.summary}</td>
                <td className="mono">{Object.entries(r.details).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {graficas.length > 0 && <h2>Visual outputs</h2>}
      <div className="chart-grid">
        {graficas.map((c) => (
          <ErrorBoundary key={c.id} label={c.title}>
            <Chart chart={c} />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
}

export function PaginaTesis({ seccion, agente }: { seccion: string; agente?: string }) {
  const { datos: tesis, error, cargando } = useDatos(() => cargarTesis());
  return (
    <section className="page">
      <header className="page-head">
        <span className="eyebrow">Thesis</span>
        <h1>The thesis in the agora</h1>
        {tesis ? <p className="muted">Generated {tesis.generated_at.slice(0, 10)} · {tesis.mode === "mock" ? "simulated" : "live"} mode</p> : null}
      </header>
      <nav className="subnav" aria-label="Thesis sections">
        {SECCIONES.map((s) => (
          <a key={s.id} href={s.id === "summary" ? "#/thesis" : `#/thesis/${s.id}`} aria-current={seccion === s.id ? "page" : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
      {cargando ? <Cargando texto="Loading the evidence…" /> : null}
      {error ? <div className="error-box" role="alert">{error.message}</div> : null}
      {tesis ? (
        <>
          <BannerSimulado tesis={tesis} />
          {seccion === "charts" ? <Graficas tesis={tesis} /> : null}
          {seccion === "social" ? <SeccionSocial tesis={tesis} /> : null}
          {seccion === "agents" && !agente ? <Agentes tesis={tesis} /> : null}
          {seccion === "agents" && agente ? <Agente tesis={tesis} id={agente} /> : null}
          {!["charts", "social", "agents"].includes(seccion) ? <Resumen tesis={tesis} /> : null}
        </>
      ) : null}
    </section>
  );
}
