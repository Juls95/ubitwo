import { useState } from "react";
import { api } from "../lib/api";
import { useDatos } from "../lib/useDatos";
import { ETIQUETA_TIPO, formatoFechaCorta, plural } from "../lib/formato";
import { CajaError, Cargando, InsigniaPostura, Vacio } from "../components/Comunes";

export function PaginaTickers() {
  const { datos, error, cargando, recargar } = useDatos(() => api.tickers());
  const [filtro, setFiltro] = useState("");
  const lista = (datos ?? []).filter((t) => t.ticker.toLowerCase().includes(filtro.trim().toLowerCase()));

  return (
    <section className="page">
      <header className="page-head">
        <span className="eyebrow">Tickers</span>
        <h1>Todo lo que se ha mencionado</h1>
        <p>Los más mencionados primero. La barra muestra cuántos días fue alcista (verde), neutral o mixto (ocre) y bajista (rojo).</p>
      </header>
      <input className="filtro-tickers" name="filtro" type="search" aria-label="Filtrar tickers" placeholder="Filtrar, ej. BTC" value={filtro} onChange={(e) => setFiltro(e.target.value)} maxLength={20} />
      {cargando ? <Cargando /> : null}
      {error ? <CajaError error={error} reintentar={recargar} /> : null}
      {datos && lista.length === 0 ? <Vacio titulo="No hay tickers que coincidan." /> : null}
      <div className="table-wrap">
        <table className="tabla-tickers">
          <thead>
            <tr><th>Ticker</th><th>Tipo</th><th>Última postura</th><th>Días</th><th>Historia</th><th>Última mención</th></tr>
          </thead>
          <tbody>
            {lista.map((t) => {
              const total = t.dias || 1;
              return (
                <tr key={t.ticker}>
                  <td><a className="ticker-mini" href={`#/tickers/${encodeURIComponent(t.ticker)}`}>{t.ticker}</a></td>
                  <td>{ETIQUETA_TIPO[t.tipo]}</td>
                  <td><InsigniaPostura postura={t.ultima_postura} /></td>
                  <td>{t.dias}</td>
                  <td>
                    <div className="barra-acuerdo" role="img" aria-label={`${plural(t.posturas.alcista, "día alcista", "días alcistas")}, ${plural(t.posturas.bajista, "bajista", "bajistas")}`}>
                      <span className="b-alcista" style={{ width: `${(t.posturas.alcista / total) * 100}%` }} />
                      <span className="b-neutral" style={{ width: `${((t.posturas.neutral + t.posturas.mixta) / total) * 100}%` }} />
                      <span className="b-bajista" style={{ width: `${(t.posturas.bajista / total) * 100}%` }} />
                    </div>
                  </td>
                  <td>{formatoFechaCorta(t.ultima_fecha)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
