import type { AgentCard } from "../../../src/tesis/toro/agents";
import { NOMBRE_AGENTE } from "../lib/formato";
import type { Tesis } from "../lib/tesis";
import { SpriteAgente } from "./PixelSprites";
import { Status } from "./Comunes";

const PASOS = ["α", "β", "γ", "δ", "ε"];

function aporte(agente: AgentCard, tesis: Tesis): string {
  const ultima = agente.runs[0];
  const corrida = ultima ? `${ultima.summary} (${ultima.at})` : "no runs yet";
  if (agente.id === "oso") {
    const descartadas = Object.values(tesis.oso.discard_reasons).reduce((n, x) => n + x, 0);
    const filas = tesis.oso.notion?.hits.length;
    const notion = filas !== undefined ? ` Notion: ${filas} rows.` : "";
    return `${corrida}. Discarded ${descartadas} posts that failed citation, account, or date checks.${notion}`;
  }
  if (agente.id === "bisonte") {
    const grafica = tesis.charts.find((c) => c.agent === "bisonte");
    return grafica ? `${corrida}. ${grafica.sentence}` : corrida;
  }
  const semana = tesis.divergences.at(-1);
  return semana ? `${corrida}. Latest crossed week: ${semana.week} · ${semana.quadrant}.` : corrida;
}

export function BotLedger({ agente, tesis }: { agente: AgentCard; tesis: Tesis }) {
  const fallas = agente.validations.filter((v) => v.status === "fail").length;
  const avisos = agente.validations.filter((v) => v.status === "warn").length;
  const nombre = NOMBRE_AGENTE[agente.id];
  return (
    <article className={`ledger-card agent-${agente.id}`} id={`razonamiento-${agente.id}`}>
      <header className="ledger-head">
        <SpriteAgente id={agente.id} />
        <div>
          <p className="ledger-kicker">Agent · {agente.id}</p>
          <h3>{nombre}</h3>
          <p>{agente.role}</p>
        </div>
        <Status status={fallas ? "fail" : avisos ? "warn" : "pass"} />
      </header>

      <div className="ledger-block">
        <h4>Contribution</h4>
        <p>{aporte(agente, tesis)}</p>
        <p className="muted">
          Outputs:{" "}
          {agente.outputs.map((o, i) => (
            <span key={o}>{i > 0 ? " · " : null}<code>{o}</code></span>
          ))}
        </p>
      </div>

      <div className="ledger-block">
        <h4>Reasoning</h4>
        <ol className="ledger-steps">
          {agente.does.map((paso, i) => (
            <li key={paso}>
              <em>{PASOS[i] ?? String(i + 1)}</em>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="ledger-block">
        <h4>Validity</h4>
        <ul className="validations">
          {agente.validations.map((v) => (
            <li key={v.name}>
              <Status status={v.status} />
              <span className="v-name">{v.name}</span>
              <span className="muted">{v.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <a className="ledger-more" href={`#/thesis/agents/${agente.id}`}>{nombre}&apos;s dossier →</a>
    </article>
  );
}
