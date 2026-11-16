import { useState, type FormEvent } from "react";
import { api, ErrorApi, type Estado, type Respuesta } from "../lib/api";
import { formatoFechaCorta } from "../lib/formato";
import { CajaError } from "../components/Comunes";

const EJEMPLOS = ["What was said about BTC this week?", "Which assets had the most disagreement?", "Summarize sentiment over the last few days"];

export function PaginaPreguntar({ estado }: { estado: Estado | null }) {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [pensando, setPensando] = useState(false);

  const enviar = async (texto: string) => {
    setPensando(true);
    setError(null);
    try {
      setRespuesta(await api.preguntar(texto));
    } catch (e) {
      setError(e instanceof ErrorApi ? e : new ErrorApi(0, String(e)));
    } finally {
      setPensando(false);
    }
  };
  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    void enviar(pregunta.trim());
  };

  return (
    <section className="page preguntar">
      <header className="page-head">
        <span className="eyebrow">Ask</span>
        <h1>Ask ubitwo</h1>
        <p>It answers only from saved digests and tells you which days it used. {estado && !estado.ia.disponible ? "No AI is configured right now: you will see the most relevant fragments." : null}</p>
      </header>
      <form className="formulario" onSubmit={alEnviar}>
        <label htmlFor="pregunta">Your question</label>
        <textarea id="pregunta" name="pregunta" rows={3} required minLength={3} maxLength={500} value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="e.g. What was said about ETH this week?" />
        <div className="comment-form-row">
          <span className="muted">{pregunta.length}/500</span>
          <button type="submit" className="cta" disabled={pensando || pregunta.trim().length < 3}>{pensando ? "Thinking…" : "Ask"}</button>
        </div>
      </form>
      <div className="ejemplos">
        {EJEMPLOS.map((e) => (
          <button key={e} type="button" className="hud-btn hud-ghost" onClick={() => { setPregunta(e); void enviar(e); }}>{e}</button>
        ))}
      </div>
      {error ? <CajaError error={error} /> : null}
      {respuesta ? (
        <article className="respuesta" aria-live="polite">
          <p className="eyebrow">{respuesta.modo === "ia" ? `Answer (${respuesta.proveedor ?? "AI"})` : "Relevant fragments (no AI)"}</p>
          {respuesta.respuesta.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          {respuesta.fuentes.length > 0 ? (
            <p className="muted">
              Sources:{" "}
              {respuesta.fuentes.map((f, i) => (
                <span key={`${f.fecha}-${f.ticker}-${i}`}>
                  {i > 0 ? " · " : null}
                  {f.ticker ? <a href={`#/tickers/${encodeURIComponent(f.ticker)}`}>{f.ticker}</a> : "context"} {formatoFechaCorta(f.fecha)}
                </span>
              ))}
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
