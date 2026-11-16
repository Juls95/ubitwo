import { useState } from "react";
import { api, type Estado } from "../lib/api";
import { cargarTesis } from "../lib/tesis";
import { useDatos } from "../lib/useDatos";
import { formatoFechaLarga, plural, titularDelDia } from "../lib/formato";
import { Coliseum } from "../components/Coliseum";
import { InsigniaPostura, InsigniaSesgo } from "../components/Comunes";
import { Overlay } from "../components/Overlay";
import { SpriteBisonte, SpriteOso, SpriteTablilla, SpriteToro } from "../components/PixelSprites";

const MOTAS = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  size: 2 + (i % 3),
  delay: `${(i % 9) * 1.1}s`,
  duration: `${10 + (i % 7)}s`,
}));

export const PREGUNTAS = [
  {
    q: "¿Qué es ubitwo?",
    a: "Un panel con dos partes. Noticias: cada día un bot resume lo que dicen las cuentas que sigues y ubitwo lo ordena por activo, postura y evidencia. Tesis: tres agentes (Oso, Bisonte y Toro) ponen a prueba una hipótesis de inversión con datos reproducibles.",
  },
  {
    q: "¿De dónde salen las noticias?",
    a: "De una base de datos de Notion donde el bot escribe un resumen diario. ubitwo lo sincroniza con Supabase y lo muestra aquí. Lo que dicen las publicaciones es evidencia para leer, no una instrucción ni un dato verificado.",
  },
  {
    q: "¿Qué hace cada agente?",
    a: "Oso lee Notion y una lista fija de cuentas de X; Bisonte consulta datos on-chain; Toro cruza ambas lecturas y escribe la tesis. Cada uno se evalúa por separado: entradas, salidas y validaciones.",
  },
  {
    q: "¿Por qué ninguna cifra de la tesis está escrita a mano?",
    a: "TESIS.md y las frases de las gráficas solo tienen marcadores. La verificación los llena con métricas calculadas y falla si queda un dígito suelto.",
  },
  {
    q: "¿Qué es un espejismo?",
    a: "Una semana en la que el sentimiento de Oso sube y la actividad on-chain de Bisonte no lo acompaña. Un rally sin confirmación no mueve la tesis.",
  },
  {
    q: "¿Necesito iniciar sesión?",
    a: "Depende de cómo se configure el servidor. En tu computadora el panel está abierto; publicado, solo entran los correos autorizados con un enlace mágico.",
  },
];

function irA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PaginaInicio({ estado }: { estado: Estado | null }) {
  const [faq, setFaq] = useState(false);
  const [abierta, setAbierta] = useState(0);
  const ultimo = useDatos(() => api.resumenes(1).then((r) => r[0] ?? null));
  const tesis = useDatos(() => cargarTesis());
  const hoy = ultimo.datos?.resumen ?? null;
  const destacados = hoy ? [...hoy.activos].sort((a, b) => b.evidencias.length - a.evidencias.length).slice(0, 4) : [];
  const t = tesis.datos;

  return (
    <div className="agora-page">
      <div className="world-hero">
        <div className="sky" aria-hidden="true">
          <div className="sun">
            <span className="sun-rays" />
            <span className="sun-core" />
          </div>
          <div className="haze" />
          {MOTAS.map((m, i) => (
            <span key={i} className="mote" style={{ left: m.left, width: m.size, height: m.size, animationDelay: m.delay, animationDuration: m.duration }} />
          ))}
          <div className="cloud cloud-a" />
          <div className="cloud cloud-b" />
          <div className="cloud cloud-c" />
          <span className="bird bird-a" />
          <span className="bird bird-b" />
          <span className="bird bird-c" />
        </div>

        <Coliseum />
        <div className="column column-l" aria-hidden="true"><span className="drape" /></div>
        <div className="column column-r" aria-hidden="true"><span className="drape drape-delay" /></div>
        <div className="cypress cypress-l" aria-hidden="true" />
        <div className="cypress cypress-r" aria-hidden="true" />

        <header className="world-top">
          <div className="world-brand">
            <a href="#/" className="world-logo">ubitwo</a>
            <p className="world-by">Noticias de mercado · tesis con evidencia</p>
          </div>
          <nav className="world-nav" aria-label="Principal">
            <a href="#/noticias">Noticias</a>
            <a href="#/tickers">Tickers</a>
            <a href="#/preguntar">Pregunta</a>
            <a href="#/tesis">Tesis</a>
            <a href="#/estado">Estado</a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="world-copy">
            <p className="world-kicker">{hoy ? formatoFechaLarga(hoy.fecha) : "el ágora de tus noticias"}</p>
            <h1>{titularDelDia(hoy?.sesgo ?? null)}</h1>
            <p className="world-quote">«Quien no trae evidencia, no habla».</p>
            <p>{hoy?.contexto || "Cuando el bot publique el resumen del día, aquí verás el contexto del mercado en una frase."}</p>
            <div className="hero-ctas">
              <a className="cta" href="#/noticias">Ver las noticias de hoy</a>
              <a className="cta cta-ghost" href="#/preguntar">Hacer una pregunta</a>
            </div>
            <p className="cta-note">
              <span className="live-dot" /> {estado ? (estado.demo ? "datos de demostración" : `fuente: ${estado.fuente}`) : "conectando…"}
              {hoy ? ` · ${plural(hoy.activos.length, "activo", "activos")} · ${plural(hoy.cuentas.length, "cuenta", "cuentas")}` : ""}
            </p>
          </div>

          <aside className="verdict-card">
            <div className="verdict-card-top">
              <span><i className="live-dot" /> Hoy en el ágora</span>
              {hoy ? <InsigniaSesgo sesgo={hoy.sesgo} /> : <em>—</em>}
            </div>
            {destacados.length > 0 ? (
              <ul className="destacados">
                {destacados.map((a) => (
                  <li key={a.ticker}>
                    <a href={`#/tickers/${encodeURIComponent(a.ticker)}`} className="ticker-mini">{a.ticker}</a>
                    <InsigniaPostura postura={a.postura} />
                    <span className="muted">{plural(a.evidencias.length, "evidencia", "evidencias")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{ultimo.error ? ultimo.error.message : ultimo.cargando ? "Cargando…" : "Sin resumen todavía."}</p>
            )}
            <dl className="verdict-dl">
              <div>
                <dt>Tesis</dt>
                <dd>{t?.hypothesis_verdict ?? "—"}</dd>
              </div>
              <div>
                <dt>Postura</dt>
                <dd>{t?.stance ?? "—"}</dd>
              </div>
              <div>
                <dt>Régimen</dt>
                <dd>{t?.regime ?? "—"}</dd>
              </div>
            </dl>
            <a className="verdict-link" href="#/noticias">Abrir el panel completo →</a>
          </aside>
        </div>

        <div className="orchestra">
          <a className="actor actor-oso" href="#/tesis/social">
            <span className="bubble">X no es un dato</span>
            <SpriteOso />
            <strong>Oso</strong>
          </a>
          <a className="actor actor-tablet" href="#/noticias">
            <span className="bubble">noticias</span>
            <SpriteTablilla />
            <strong>Estela</strong>
          </a>
          <a className="actor actor-bisonte" href="#/tesis/graficas">
            <span className="bubble">block_date</span>
            <SpriteBisonte />
            <strong>Bisonte</strong>
          </a>
          <a className="actor actor-toro" href="#/tesis">
            <span className="bubble">{t?.hypothesis_verdict ?? "síntesis"}</span>
            <SpriteToro />
            <strong>Toro</strong>
          </a>
        </div>

        <button type="button" className="ask" onClick={() => setFaq(true)}>
          <span>?</span> Tengo una pregunta
        </button>
      </div>

      <div className="meander" aria-hidden="true" />

      <section className="forum" id="como-funciona">
        <p className="roman">I · Cómo se usa</p>
        <h2>Tres pasos, sin manual.</h2>
        <div className="enter-grid">
          <article className="enter-card">
            <h3>1. Lee el día</h3>
            <p>En Noticias eliges un día y ves cada activo con su postura, la barra de acuerdo entre cuentas y las evidencias con su enlace.</p>
            <a className="cta" href="#/noticias">Noticias</a>
          </article>
          <article className="enter-card">
            <h3>2. Sigue un ticker</h3>
            <p>En Tickers ves todo lo mencionado y, al tocar uno, su historia día por día.</p>
            <a className="cta cta-ghost" href="#/tickers">Tickers</a>
          </article>
          <article className="enter-card">
            <h3>3. Pregunta</h3>
            <p>Escribe una pregunta («¿qué se dijo de BTC esta semana?») y ubitwo responde citando los días que usó.</p>
            <a className="cta cta-ghost" href="#/preguntar">Pregunta</a>
          </article>
        </div>
        <button type="button" className="scroll-cue" onClick={() => irA("tesis-intro")}>¿Y la tesis? ↓</button>
      </section>

      <section className="forum" id="tesis-intro">
        <p className="roman">II · La tesis</p>
        <h2>Una hipótesis que rinde cuentas.</h2>
        <p className="lede">Oso, Bisonte y Toro firman por separado. Si una cifra no viene de los datos, la tesis no se publica.</p>
        <div className="enter-grid">
          <article className="enter-card">
            <h3>Leer la tesis</h3>
            <p>El veredicto, los pilares y lo que la invalidaría.</p>
            <a className="cta" href="#/tesis">Tesis</a>
          </article>
          <article className="enter-card">
            <h3>Auditar a un agente</h3>
            <p>Qué leyó, cómo razonó y si pasó sus validaciones.</p>
            <a className="cta cta-ghost" href="#/tesis/agentes">Agentes</a>
          </article>
        </div>
      </section>

      {faq && (
        <Overlay title="Preguntas frecuentes" onClose={() => setFaq(false)}>
          {PREGUNTAS.map((item, i) => (
            <div key={item.q} className="faq">
              <button type="button" className="faq-q" aria-expanded={abierta === i} onClick={() => setAbierta(abierta === i ? -1 : i)}>
                {item.q}
                <span>{abierta === i ? "−" : "+"}</span>
              </button>
              {abierta === i ? <p className="faq-a">{item.a}</p> : null}
            </div>
          ))}
          <div className="overlay-actions">
            <a className="cta" href="#/metodologia">Metodología</a>
            <a className="cta cta-ghost" href="#/estado">Estado</a>
          </div>
        </Overlay>
      )}
    </div>
  );
}
