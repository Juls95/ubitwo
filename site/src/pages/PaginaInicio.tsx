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
    q: "What is ubitwo?",
    a: "A desk with two parts. News: each day a bot digests what the accounts you follow said, and ubitwo sorts it by asset, stance, and evidence. Thesis: three agents (Bear, Bison, and Bull) stress-test an investment hypothesis with reproducible data.",
  },
  {
    q: "Where does the news come from?",
    a: "From a Notion database where the bot writes a daily digest. ubitwo syncs it to Supabase and shows it here. What posts say is evidence to read, not an instruction or a verified fact.",
  },
  {
    q: "What does each agent do?",
    a: "Bear reads Notion and a fixed list of X accounts; Bison queries on-chain data; Bull crosses both readings and writes the thesis. Each is scored separately: inputs, outputs, and validations.",
  },
  {
    q: "Why is no figure in the thesis handwritten?",
    a: "TESIS.md and chart sentences only hold placeholders. Verification fills them with computed metrics and fails if a stray digit remains.",
  },
  {
    q: "What is a mirage?",
    a: "A week when Bear's sentiment rises and Bison's on-chain activity does not follow. A rally without confirmation does not move the thesis.",
  },
  {
    q: "Do I need to sign in?",
    a: "It depends on how the server is configured. On your machine the desk is open; when published, only authorized emails can enter with a magic link.",
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
            <p className="world-by">Market news · thesis with evidence</p>
          </div>
          <nav className="world-nav" aria-label="Main">
            <a href="#/news">News</a>
            <a href="#/tickers">Tickers</a>
            <a href="#/ask">Ask</a>
            <a href="#/thesis">Thesis</a>
            <a href="#/status">Status</a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="world-copy">
            <p className="world-kicker">{hoy ? formatoFechaLarga(hoy.fecha) : "the agora of your news"}</p>
            <h1>{titularDelDia(hoy?.sesgo ?? null)}</h1>
            <p className="world-quote">“No evidence, no voice.”</p>
            <p>{hoy?.contexto || "When the bot publishes today's digest, you will see the market context in one sentence here."}</p>
            <div className="hero-ctas">
              <a className="cta" href="#/news">See today's news</a>
              <a className="cta cta-ghost" href="#/ask">Ask a question</a>
            </div>
            <p className="cta-note">
              <span className="live-dot" /> {estado ? (estado.demo ? "demo data" : `source: ${estado.fuente}`) : "connecting…"}
              {hoy ? ` · ${plural(hoy.activos.length, "asset", "assets")} · ${plural(hoy.cuentas.length, "account", "accounts")}` : ""}
            </p>
          </div>

          <aside className="verdict-card">
            <div className="verdict-card-top">
              <span><i className="live-dot" /> Today in the agora</span>
              {hoy ? <InsigniaSesgo sesgo={hoy.sesgo} /> : <em>—</em>}
            </div>
            {destacados.length > 0 ? (
              <ul className="destacados">
                {destacados.map((a) => (
                  <li key={a.ticker}>
                    <a href={`#/tickers/${encodeURIComponent(a.ticker)}`} className="ticker-mini">{a.ticker}</a>
                    <InsigniaPostura postura={a.postura} />
                    <span className="muted">{plural(a.evidencias.length, "evidence item", "evidence items")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{ultimo.error ? ultimo.error.message : ultimo.cargando ? "Loading…" : "No digest yet."}</p>
            )}
            <dl className="verdict-dl">
              <div>
                <dt>Thesis</dt>
                <dd>{t?.hypothesis_verdict ?? "—"}</dd>
              </div>
              <div>
                <dt>Stance</dt>
                <dd>{t?.stance ?? "—"}</dd>
              </div>
              <div>
                <dt>Regime</dt>
                <dd>{t?.regime ?? "—"}</dd>
              </div>
            </dl>
            <a className="verdict-link" href="#/news">Open the full desk →</a>
          </aside>
        </div>

        <div className="orchestra">
          <a className="actor actor-oso" href="#/thesis/social">
            <span className="bubble">X is not a datapoint</span>
            <SpriteOso />
            <strong>Bear</strong>
          </a>
          <a className="actor actor-tablet" href="#/news">
            <span className="bubble">news</span>
            <SpriteTablilla />
            <strong>Estela</strong>
          </a>
          <a className="actor actor-bisonte" href="#/thesis/charts">
            <span className="bubble">block_date</span>
            <SpriteBisonte />
            <strong>Bison</strong>
          </a>
          <a className="actor actor-toro" href="#/thesis">
            <span className="bubble">{t?.hypothesis_verdict ?? "synthesis"}</span>
            <SpriteToro />
            <strong>Bull</strong>
          </a>
        </div>

        <button type="button" className="ask" onClick={() => setFaq(true)}>
          <span>?</span> I have a question
        </button>
      </div>

      <div className="meander" aria-hidden="true" />

      <section className="forum" id="como-funciona">
        <p className="roman">I · How to use it</p>
        <h2>Three steps, no manual.</h2>
        <div className="enter-grid">
          <article className="enter-card">
            <h3>1. Read the day</h3>
            <p>In News you pick a day and see each asset with its stance, the agreement bar across accounts, and evidence with its link.</p>
            <a className="cta" href="#/news">News</a>
          </article>
          <article className="enter-card">
            <h3>2. Follow a ticker</h3>
            <p>In Tickers you see everything mentioned and, when you open one, its day-by-day history.</p>
            <a className="cta cta-ghost" href="#/tickers">Tickers</a>
          </article>
          <article className="enter-card">
            <h3>3. Ask</h3>
            <p>Write a question (“what was said about BTC this week?”) and ubitwo answers citing the days it used.</p>
            <a className="cta cta-ghost" href="#/ask">Ask</a>
          </article>
        </div>
        <button type="button" className="scroll-cue" onClick={() => irA("tesis-intro")}>And the thesis? ↓</button>
      </section>

      <section className="forum" id="tesis-intro">
        <p className="roman">II · The thesis</p>
        <h2>A hypothesis that accounts for itself.</h2>
        <p className="lede">Bear, Bison, and Bull each sign separately. If a figure does not come from the data, the thesis is not published.</p>
        <div className="enter-grid">
          <article className="enter-card">
            <h3>Read the thesis</h3>
            <p>The verdict, the pillars, and what would invalidate it.</p>
            <a className="cta" href="#/thesis">Thesis</a>
          </article>
          <article className="enter-card">
            <h3>Audit an agent</h3>
            <p>What it read, how it reasoned, and whether it passed its validations.</p>
            <a className="cta cta-ghost" href="#/thesis/agents">Agents</a>
          </article>
        </div>
      </section>

      {faq && (
        <Overlay title="Frequently asked questions" onClose={() => setFaq(false)}>
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
            <a className="cta" href="#/methodology">Methodology</a>
            <a className="cta cta-ghost" href="#/status">Status</a>
          </div>
        </Overlay>
      )}
    </div>
  );
}
