import { useState } from "react";
import type { Activo } from "../../../src/noticias/esquema";
import { ETIQUETA_TIPO, plural } from "../lib/formato";
import { BarraAcuerdo, EnlaceExterno, InsigniaPostura } from "./Comunes";

export function TarjetaActivo({ activo }: { activo: Activo }) {
  const [abierta, setAbierta] = useState(false);
  const { acuerdo } = activo;
  return (
    <article className={`tarjeta-activo postura-${activo.postura}`}>
      <header>
        <a className="ticker" href={`#/tickers/${encodeURIComponent(activo.ticker)}`} title={`${activo.ticker} history`}>
          {activo.ticker}
        </a>
        <span className="tipo">{ETIQUETA_TIPO[activo.tipo]}</span>
        <InsigniaPostura postura={activo.postura} />
      </header>
      <p className="resumen">{activo.resumen || "No summary."}</p>
      {activo.que_hace ? <p className="muted que-hace">{activo.que_hace}</p> : null}
      <BarraAcuerdo {...acuerdo} />
      <dl className="datos">
        {activo.conviccion !== null ? (
          <div><dt>Conviction</dt><dd>{Math.round(activo.conviccion * 100)} %</dd></div>
        ) : null}
        {activo.horizonte_dias !== null ? (
          <div><dt>Horizon</dt><dd>{plural(activo.horizonte_dias, "day", "days")}</dd></div>
        ) : null}
        {activo.precio !== null ? (
          <div><dt>Cited price</dt><dd>{activo.precio}</dd></div>
        ) : null}
        {activo.catalizador ? (
          <div><dt>Catalyst</dt><dd>{activo.catalizador}</dd></div>
        ) : null}
        {activo.invalidacion ? (
          <div><dt>Invalidated if</dt><dd>{activo.invalidacion}</dd></div>
        ) : null}
      </dl>
      {activo.ultima_noticia ? (
        <p className="ultima-noticia">
          <strong>Latest news:</strong> <EnlaceExterno url={activo.fuente}>{activo.ultima_noticia}</EnlaceExterno>
        </p>
      ) : null}
      {activo.evidencias.length > 0 ? (
        <>
          <button type="button" className="enlace-boton" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
            {abierta ? "Hide" : "Show"} {plural(activo.evidencias.length, "evidence item", "evidence items")}
          </button>
          {abierta ? (
            <ul className="evidencias">
              {activo.evidencias.map((e, i) => (
                <li key={`${e.cuenta}-${i}`}>
                  {e.postura ? <InsigniaPostura postura={e.postura} /> : null}{" "}
                  <strong>{e.cuenta}</strong>: <EnlaceExterno url={e.url}>{e.afirmacion}</EnlaceExterno>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
