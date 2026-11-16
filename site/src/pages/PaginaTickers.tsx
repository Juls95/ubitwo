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
        <h1>Everything that has been mentioned</h1>
        <p>Most mentioned first. The bar shows how many days were bullish (green), neutral or mixed (ochre), and bearish (red).</p>
      </header>
      <input className="filtro-tickers" name="filtro" type="search" aria-label="Filter tickers" placeholder="Filter, e.g. BTC" value={filtro} onChange={(e) => setFiltro(e.target.value)} maxLength={20} />
      {cargando ? <Cargando /> : null}
      {error ? <CajaError error={error} reintentar={recargar} /> : null}
      {datos && lista.length === 0 ? <Vacio titulo="No matching tickers." /> : null}
      <div className="table-wrap">
        <table className="tabla-tickers">
          <thead>
            <tr><th>Ticker</th><th>Type</th><th>Latest stance</th><th>Days</th><th>History</th><th>Last mention</th></tr>
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
                    <div className="barra-acuerdo" role="img" aria-label={`${plural(t.posturas.alcista, "bullish day", "bullish days")}, ${plural(t.posturas.bajista, "bearish", "bearish")}`}>
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
