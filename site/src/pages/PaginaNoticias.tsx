import { useMemo, useState, type FormEvent } from "react";
import type { Postura, RegistroResumen, TipoActivo } from "../../../src/noticias/esquema";
import { api, type Busqueda } from "../lib/api";
import { useDatos } from "../lib/useDatos";
import { ETIQUETA_POSTURA, ETIQUETA_TIPO, formatoFechaCorta, formatoFechaLarga, plural } from "../lib/formato";
import { CajaError, Cargando, EnlaceExterno, InsigniaSesgo, Vacio } from "../components/Comunes";
import { TarjetaActivo } from "../components/TarjetaActivo";

type Filtro = { postura: Postura | "todas"; tipo: TipoActivo | "todos" };

export function filtrarActivos(r: RegistroResumen, f: Filtro) {
  return r.resumen.activos.filter((a) => (f.postura === "todas" || a.postura === f.postura) && (f.tipo === "todos" || a.tipo === f.tipo));
}

function Buscador() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Busqueda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setRes(await api.buscar(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  return (
    <section className="buscador" aria-label="Search the news">
      <form role="search" onSubmit={enviar}>
        <label htmlFor="buscar" className="sr-only">Search</label>
        <input id="buscar" name="q" type="search" value={q} minLength={2} maxLength={120} onChange={(e) => setQ(e.target.value)} placeholder="Search a ticker, account, or topic (e.g. ETF, BTC, @account)" />
        <button type="submit" className="cta cta-chica">Search</button>
      </form>
      {error ? <p className="error-box" role="alert">{error}</p> : null}
      {res ? (
        <div className="resultados">
          <p className="muted">{plural(res.resultados.length, "result", "results")} for “{res.consulta}”</p>
          <ul>
            {res.resultados.map((r, i) => (
              <li key={`${r.fecha}-${i}`}>
                <span className="mono">{formatoFechaCorta(r.fecha)}</span>{" "}
                {r.ticker ? <a href={`#/tickers/${encodeURIComponent(r.ticker)}`} className="ticker-mini">{r.ticker}</a> : null}{" "}
                {r.cuenta ? <strong>{r.cuenta}: </strong> : null}
                <EnlaceExterno url={r.url}>{r.texto}</EnlaceExterno>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function PaginaNoticias() {
  const resumenes = useDatos(() => api.resumenes(30));
  const stats = useDatos(() => api.estadisticas());
  const [elegida, setElegida] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>({ postura: "todas", tipo: "todos" });

  const lista = useMemo(() => resumenes.datos ?? [], [resumenes.datos]);
  const dia = lista.find((r) => r.fecha === elegida) ?? lista[0] ?? null;
  const activos = dia ? filtrarActivos(dia, filtro) : [];

  return (
    <section className="page noticias">
      <header className="page-head">
        <span className="eyebrow">News desk</span>
        <h1>What the market said, day by day</h1>
        <p>Each day, a digest of the accounts you follow: which assets were mentioned, with what stance, and with what evidence. Tap a ticker to see its history.</p>
      </header>

      {stats.datos ? (
        <div className="stat-row">
          <div className="stat"><span>Days digested</span><strong>{stats.datos.resumenes}</strong></div>
          <div className="stat"><span>Tickers</span><strong>{stats.datos.tickers}</strong></div>
          <div className="stat"><span>Accounts</span><strong>{stats.datos.cuentas}</strong></div>
          <div className="stat"><span>Bullish days</span><strong>{stats.datos.sesgos.alcista}</strong></div>
          <div className="stat"><span>Bearish days</span><strong>{stats.datos.sesgos.bajista}</strong></div>
        </div>
      ) : null}

      <Buscador />

      {resumenes.cargando ? <Cargando texto="Loading digests…" /> : null}
      {resumenes.error ? <CajaError error={resumenes.error} reintentar={resumenes.recargar} /> : null}
      {!resumenes.cargando && !resumenes.error && lista.length === 0 ? (
        <Vacio titulo="No digests yet.">
          Run <code>pnpm noticias:sync</code> to pull them from Notion, or check the <a href="#/status">Status</a> page.
        </Vacio>
      ) : null}

      {dia ? (
        <>
          <div className="pestanas" role="tablist" aria-label="Days">
            {lista.map((r) => (
              <button key={r.fecha} type="button" role="tab" aria-selected={r.fecha === dia.fecha} className={`pestana sesgo-${r.resumen.sesgo.replace(" ", "-")}`} onClick={() => setElegida(r.fecha)}>
                {formatoFechaCorta(r.fecha)}
              </button>
            ))}
          </div>

          <article className="dia" role="tabpanel" aria-label={formatoFechaLarga(dia.fecha)}>
            <header className="dia-head">
              <div>
                <p className="eyebrow">{formatoFechaLarga(dia.fecha)}</p>
                <h2>{dia.resumen.titulo}</h2>
              </div>
              <InsigniaSesgo sesgo={dia.resumen.sesgo} />
            </header>
            {dia.resumen.contexto ? <p className="contexto">{dia.resumen.contexto}</p> : null}
            {dia.resumen.alertas.length > 0 ? (
              <p className="alertas">{dia.resumen.alertas.map((a) => <span key={a} className="alerta">{a}</span>)}</p>
            ) : null}
            {dia.resumen.conflictos.length > 0 ? (
              <details className="conflictos">
                <summary>{plural(dia.resumen.conflictos.length, "disagreement across accounts", "disagreements across accounts")}</summary>
                <ul>{dia.resumen.conflictos.map((c) => <li key={c}>{c}</li>)}</ul>
              </details>
            ) : null}

            <div className="filtros" aria-label="Filters">
              <label>
                Stance{" "}
                <select name="postura" value={filtro.postura} onChange={(e) => setFiltro({ ...filtro, postura: e.target.value as Filtro["postura"] })}>
                  <option value="todas">All</option>
                  {(Object.keys(ETIQUETA_POSTURA) as Postura[]).map((p) => <option key={p} value={p}>{ETIQUETA_POSTURA[p]}</option>)}
                </select>
              </label>
              <label>
                Type{" "}
                <select name="tipo" value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value as Filtro["tipo"] })}>
                  <option value="todos">All</option>
                  {(Object.keys(ETIQUETA_TIPO) as TipoActivo[]).map((t) => <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>)}
                </select>
              </label>
              <span className="muted">{plural(activos.length, "asset", "assets")} · {plural(dia.resumen.cuentas.length, "account", "accounts")}</span>
            </div>

            {activos.length === 0 ? <Vacio titulo="No assets match the filter." /> : null}
            <div className="rejilla-activos">
              {activos.map((a) => <TarjetaActivo key={a.ticker} activo={a} />)}
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
