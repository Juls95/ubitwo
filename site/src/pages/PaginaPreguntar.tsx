import { useState, type FormEvent } from "react";
import { api, ErrorApi, type Estado, type Respuesta } from "../lib/api";
import { formatoFechaCorta } from "../lib/formato";
import { CajaError } from "../components/Comunes";

const EJEMPLOS = ["¿Qué se dijo de BTC esta semana?", "¿Qué activos tuvieron más desacuerdo?", "Resume el sentimiento de los últimos días"];

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
        <span className="eyebrow">Pregunta</span>
        <h1>Pregúntale a ubitwo</h1>
        <p>Responde solo con los resúmenes guardados y te dice qué días usó. {estado && !estado.ia.disponible ? "Ahora mismo no hay IA configurada: verás los fragmentos más relevantes." : null}</p>
      </header>
      <form className="formulario" onSubmit={alEnviar}>
        <label htmlFor="pregunta">Tu pregunta</label>
        <textarea id="pregunta" rows={3} required minLength={3} maxLength={500} value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="Ej. ¿Qué se dijo de ETH esta semana?" />
        <div className="comment-form-row">
          <span className="muted">{pregunta.length}/500</span>
          <button type="submit" className="cta" disabled={pensando || pregunta.trim().length < 3}>{pensando ? "Pensando…" : "Preguntar"}</button>
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
          <p className="eyebrow">{respuesta.modo === "ia" ? `Respuesta (${respuesta.proveedor ?? "IA"})` : "Fragmentos relevantes (sin IA)"}</p>
          {respuesta.respuesta.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          {respuesta.fuentes.length > 0 ? (
            <p className="muted">
              Fuentes:{" "}
              {respuesta.fuentes.map((f, i) => (
                <span key={`${f.fecha}-${f.ticker}-${i}`}>
                  {i > 0 ? " · " : null}
                  {f.ticker ? <a href={`#/tickers/${encodeURIComponent(f.ticker)}`}>{f.ticker}</a> : "contexto"} {formatoFechaCorta(f.fecha)}
                </span>
              ))}
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
