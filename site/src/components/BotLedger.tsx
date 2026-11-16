import type { AgentCard } from "../../../src/tesis/toro/agents";
import type { Tesis } from "../lib/tesis";
import { SpriteAgente } from "./PixelSprites";
import { Status } from "./Comunes";

const PASOS = ["α", "β", "γ", "δ", "ε"];

function aporte(agente: AgentCard, tesis: Tesis): string {
  const ultima = agente.runs[0];
  const corrida = ultima ? `${ultima.summary} (${ultima.at})` : "sin corridas todavía";
  if (agente.id === "oso") {
    const descartadas = Object.values(tesis.oso.discard_reasons).reduce((n, x) => n + x, 0);
    const filas = tesis.oso.notion?.hits.length;
    const notion = filas !== undefined ? ` Notion: ${filas} filas.` : "";
    return `${corrida}. Descartó ${descartadas} publicaciones que no pasaron los controles de cita, cuenta o fecha.${notion}`;
  }
  if (agente.id === "bisonte") {
    const grafica = tesis.charts.find((c) => c.agent === "bisonte");
    return grafica ? `${corrida}. ${grafica.sentence}` : corrida;
  }
  const semana = tesis.divergences.at(-1);
  return semana ? `${corrida}. Última semana cruzada: ${semana.week} · ${semana.quadrant}.` : corrida;
}

export function BotLedger({ agente, tesis }: { agente: AgentCard; tesis: Tesis }) {
  const fallas = agente.validations.filter((v) => v.status === "fail").length;
  const avisos = agente.validations.filter((v) => v.status === "warn").length;
  return (
    <article className={`ledger-card agent-${agente.id}`} id={`razonamiento-${agente.id}`}>
      <header className="ledger-head">
        <SpriteAgente id={agente.id} />
        <div>
          <p className="ledger-kicker">Agente · {agente.id}</p>
          <h3>{agente.name}</h3>
          <p>{agente.role}</p>
        </div>
        <Status status={fallas ? "fail" : avisos ? "warn" : "pass"} />
      </header>

      <div className="ledger-block">
        <h4>Aporte</h4>
        <p>{aporte(agente, tesis)}</p>
        <p className="muted">
          Salidas:{" "}
          {agente.outputs.map((o, i) => (
            <span key={o}>{i > 0 ? " · " : null}<code>{o}</code></span>
          ))}
        </p>
      </div>

      <div className="ledger-block">
        <h4>Razonamiento</h4>
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
        <h4>Validez</h4>
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

      <a className="ledger-more" href={`#/tesis/agentes/${agente.id}`}>Expediente de {agente.name} →</a>
    </article>
  );
}
