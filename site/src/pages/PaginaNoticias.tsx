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
    <section className="buscador" aria-label="Buscar en las noticias">
      <form role="search" onSubmit={enviar}>
        <label htmlFor="buscar" className="sr-only">Buscar</label>
        <input id="buscar" type="search" value={q} minLength={2} maxLength={120} onChange={(e) => setQ(e.target.value)} placeholder="Busca un ticker, una cuenta o un tema (ej. ETF, BTC, @cuenta)" />
        <button type="submit" className="cta cta-chica">Buscar</button>
      </form>
      {error ? <p className="error-box" role="alert">{error}</p> : null}
      {res ? (
        <div className="resultados">
          <p className="muted">{plural(res.resultados.length, "resultado", "resultados")} para «{res.consulta}»</p>
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
        <span className="eyebrow">Panel de noticias</span>
        <h1>Lo que dijo el mercado, día por día</h1>
        <p>Cada día, un resumen de las cuentas que sigues: qué activos se mencionaron, con qué postura y con qué evidencia. Toca un ticker para ver su historial.</p>
      </header>

      {stats.datos ? (
        <div className="stat-row">
          <div className="stat"><span>Días resumidos</span><strong>{stats.datos.resumenes}</strong></div>
          <div className="stat"><span>Tickers</span><strong>{stats.datos.tickers}</strong></div>
          <div className="stat"><span>Cuentas</span><strong>{stats.datos.cuentas}</strong></div>
          <div className="stat"><span>Días alcistas</span><strong>{stats.datos.sesgos.alcista}</strong></div>
          <div className="stat"><span>Días bajistas</span><strong>{stats.datos.sesgos.bajista}</strong></div>
        </div>
      ) : null}

      <Buscador />

      {resumenes.cargando ? <Cargando texto="Cargando resúmenes…" /> : null}
      {resumenes.error ? <CajaError error={resumenes.error} reintentar={resumenes.recargar} /> : null}
      {!resumenes.cargando && !resumenes.error && lista.length === 0 ? (
        <Vacio titulo="Todavía no hay resúmenes.">
          Ejecuta <code>pnpm noticias:sync</code> para traerlos de Notion, o revisa la página <a href="#/estado">Estado</a>.
        </Vacio>
      ) : null}

      {dia ? (
        <>
          <div className="pestanas" role="tablist" aria-label="Días">
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
                <summary>{plural(dia.resumen.conflictos.length, "desacuerdo entre cuentas", "desacuerdos entre cuentas")}</summary>
                <ul>{dia.resumen.conflictos.map((c) => <li key={c}>{c}</li>)}</ul>
              </details>
            ) : null}

            <div className="filtros" aria-label="Filtros">
              <label>
                Postura{" "}
                <select value={filtro.postura} onChange={(e) => setFiltro({ ...filtro, postura: e.target.value as Filtro["postura"] })}>
                  <option value="todas">Todas</option>
                  {(Object.keys(ETIQUETA_POSTURA) as Postura[]).map((p) => <option key={p} value={p}>{ETIQUETA_POSTURA[p]}</option>)}
                </select>
              </label>
              <label>
                Tipo{" "}
                <select value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value as Filtro["tipo"] })}>
                  <option value="todos">Todos</option>
                  {(Object.keys(ETIQUETA_TIPO) as TipoActivo[]).map((t) => <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>)}
                </select>
              </label>
              <span className="muted">{plural(activos.length, "activo", "activos")} · {plural(dia.resumen.cuentas.length, "cuenta", "cuentas")}</span>
            </div>

            {activos.length === 0 ? <Vacio titulo="Ningún activo coincide con el filtro." /> : null}
            <div className="rejilla-activos">
              {activos.map((a) => <TarjetaActivo key={a.ticker} activo={a} />)}
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
