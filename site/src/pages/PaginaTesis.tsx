import { cargarTesis, type Tesis } from "../lib/tesis";
import { useDatos } from "../lib/useDatos";
import { Markdown } from "../lib/markdown";
import { BotLedger } from "../components/BotLedger";
import { Chart } from "../components/Chart";
import { Cargando, Status } from "../components/Comunes";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SeccionSocial } from "./SeccionSocial";

const SECCIONES = [
  { id: "resumen", label: "Tesis" },
  { id: "graficas", label: "Gráficas" },
  { id: "social", label: "Social" },
  { id: "agentes", label: "Agentes" },
];

function BannerSimulado({ tesis }: { tesis: Tesis }) {
  if (tesis.mode !== "mock") return null;
  return (
    <div className="aviso" role="status">
      <strong>Tesis con datos simulados.</strong> Las cifras on-chain, de precio y de sentimiento son simuladas; las notas de las mesas son reales pero parafraseadas. Con credenciales, <code>pnpm tesis:refresh</code> trae datos reales.
    </div>
  );
}

function Resumen({ tesis }: { tesis: Tesis }) {
  const fila = (titulo: string, valor: string | null) => (
    <div>
      <span className="eyebrow">{titulo}</span>
      <strong>{valor ?? "sin datos"}</strong>
    </div>
  );
  return (
    <article className="thesis">
      <div className="verdict">
        {fila("Estado de la hipótesis", tesis.hypothesis_verdict)}
        {fila("Postura", tesis.stance)}
        {fila("Sesgo técnico", tesis.technical_bias)}
        {fila("Régimen de adopción", tesis.regime)}
      </div>
      <Markdown source={tesis.thesis_md} />
    </article>
  );
}

function Graficas({ tesis }: { tesis: Tesis }) {
  return (
    <>
      <p className="lede">Cada gráfica muestra la consulta o el endpoint que la produce y una frase sencilla sobre lo que enseña. Todo se reconstruye con <code>pnpm tesis:toro</code>.</p>
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
      <p className="lede">Cada agente se evalúa solo: qué aportó, cómo razonó y si pasó sus validaciones.</p>
      <div className="ledger">
        {tesis.agents.map((a) => <BotLedger key={a.id} agente={a} tesis={tesis} />)}
      </div>
      <h2>Semana a semana</h2>
      <p className="muted">El cruce semanal del sentimiento de Oso contra la actividad on-chain de Bisonte.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Semana</th><th>Sentimiento</th><th>On-chain</th><th>Veredicto</th><th>Origen</th></tr></thead>
          <tbody>
            {tesis.divergences.map((d) => (
              <tr key={d.week}>
                <td>{d.week}</td>
                <td>{d.sentiment_index === null ? "—" : d.sentiment_index.toFixed(2)}</td>
                <td>{d.onchain_change_pct === null ? "—" : `${d.onchain_change_pct > 0 ? "+" : ""}${d.onchain_change_pct.toFixed(1)} %`}</td>
                <td>{d.quadrant}</td>
                <td>{d.reconstructed ? "reconstruida" : "en vivo"}</td>
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
  if (!agente) return <p>Agente desconocido. <a href="#/tesis/agentes">Ver los tres agentes</a>.</p>;
  const graficas = tesis.charts.filter((c) => c.agent === agente.id);
  return (
    <div className={`agent-page agent-${agente.id}`}>
      <a href="#/tesis/agentes" className="volver">← Agentes</a>
      <header className="page-head">
        <span className="eyebrow">Agente</span>
        <h1>{agente.name}</h1>
        <p>{agente.role}</p>
      </header>
      <div className="two-col">
        <div>
          <h2>Qué hace</h2>
          <ul>{agente.does.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <h2>Entradas</h2>
          <ul>{agente.inputs.map((d) => <li key={d}><code>{d}</code></li>)}</ul>
          <h2>Salidas</h2>
          <ul>{agente.outputs.map((d) => <li key={d}><code>{d}</code></li>)}</ul>
        </div>
      </div>
      <h2>Validaciones</h2>
      <ul className="validations">
        {agente.validations.map((v) => (
          <li key={v.name}>
            <Status status={v.status} />
            <span className="v-name">{v.name}</span>
            <span className="muted">{v.detail}</span>
          </li>
        ))}
      </ul>
      <h2>Qué hizo</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Resumen</th><th>Detalle</th></tr></thead>
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
      {graficas.length > 0 && <h2>Salidas visuales</h2>}
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
        <span className="eyebrow">Tesis</span>
        <h1>La tesis en el ágora</h1>
        {tesis ? <p className="muted">Generada el {tesis.generated_at.slice(0, 10)} · modo {tesis.mode === "mock" ? "simulado" : "en vivo"}</p> : null}
      </header>
      <nav className="subnav" aria-label="Secciones de la tesis">
        {SECCIONES.map((s) => (
          <a key={s.id} href={s.id === "resumen" ? "#/tesis" : `#/tesis/${s.id}`} aria-current={seccion === s.id ? "page" : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
      {cargando ? <Cargando texto="Cargando la evidencia…" /> : null}
      {error ? <div className="error-box" role="alert">{error.message}</div> : null}
      {tesis ? (
        <>
          <BannerSimulado tesis={tesis} />
          {seccion === "graficas" ? <Graficas tesis={tesis} /> : null}
          {seccion === "social" ? <SeccionSocial tesis={tesis} /> : null}
          {seccion === "agentes" && !agente ? <Agentes tesis={tesis} /> : null}
          {seccion === "agentes" && agente ? <Agente tesis={tesis} id={agente} /> : null}
          {!["graficas", "social", "agentes"].includes(seccion) ? <Resumen tesis={tesis} /> : null}
        </>
      ) : null}
    </section>
  );
}
