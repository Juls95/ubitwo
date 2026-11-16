import { api } from "../lib/api";
import { useDatos } from "../lib/useDatos";
import { formatoFechaLarga, plural } from "../lib/formato";
import { CajaError, Cargando, InsigniaSesgo } from "../components/Comunes";
import { TarjetaActivo } from "../components/TarjetaActivo";

export function PaginaTicker({ ticker }: { ticker: string }) {
  const { datos, error, cargando, recargar } = useDatos(() => api.ticker(ticker), [ticker]);
  return (
    <section className="page">
      <a href="#/tickers" className="volver">← Todos los tickers</a>
      <header className="page-head">
        <span className="eyebrow">Historial</span>
        <h1>{ticker.toUpperCase()}</h1>
        {datos ? <p>{plural(datos.historial.length, "día con menciones", "días con menciones")}. El más reciente arriba.</p> : null}
      </header>
      {cargando ? <Cargando /> : null}
      {error ? <CajaError error={error} reintentar={error.status === 404 ? undefined : recargar} /> : null}
      <ol className="linea-tiempo">
        {datos?.historial.map((d) => (
          <li key={d.fecha}>
            <p className="linea-fecha">
              <strong>{formatoFechaLarga(d.fecha)}</strong> · día <InsigniaSesgo sesgo={d.sesgo_del_dia} />
            </p>
            <TarjetaActivo activo={d.activo} />
          </li>
        ))}
      </ol>
    </section>
  );
}
