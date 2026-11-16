import type { ReactNode } from "react";
import type { Postura, Sesgo } from "../../../src/noticias/esquema";
import type { Validation } from "../../../src/tesis/toro/agents";
import type { ErrorApi } from "../lib/api";
import { ETIQUETA_POSTURA, ETIQUETA_SESGO, ICONO_POSTURA } from "../lib/formato";
import { safeHref } from "../lib/safe-url";

export function InsigniaPostura({ postura }: { postura: Postura }) {
  return (
    <span className={`insignia insignia-${postura}`} title={`${ETIQUETA_POSTURA[postura]} stance`}>
      <span aria-hidden="true">{ICONO_POSTURA[postura]}</span> {ETIQUETA_POSTURA[postura]}
    </span>
  );
}

export function InsigniaSesgo({ sesgo }: { sesgo: Sesgo }) {
  const clase = sesgo === "mixto" ? "mixta" : sesgo === "sin datos" ? "neutral" : sesgo;
  return <span className={`insignia insignia-${clase}`}>{ETIQUETA_SESGO[sesgo]}</span>;
}

/** Agreement bar across accounts: bullish, neutral, and bearish, in proportion. */
export function BarraAcuerdo({ alcista, neutral, bajista }: { alcista: number; neutral: number; bajista: number }) {
  const total = alcista + neutral + bajista;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="barra-acuerdo" role="img" aria-label={`${alcista} bullish, ${neutral} neutral, ${bajista} bearish`}>
      <span className="b-alcista" style={{ width: pct(alcista) }} />
      <span className="b-neutral" style={{ width: pct(neutral) }} />
      <span className="b-bajista" style={{ width: pct(bajista) }} />
    </div>
  );
}

/** External link only if https; otherwise plain text. Always new tab, no referrer. */
export function EnlaceExterno({ url, children }: { url: string | null | undefined; children: ReactNode }) {
  const href = safeHref(url);
  return href ? (
    <a href={href} rel="noreferrer noopener" target="_blank">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

export function Cargando({ texto = "Loading…" }: { texto?: string }) {
  return (
    <p className="boot" role="status">
      <span className="live-dot" /> {texto}
    </p>
  );
}

/** Explained API error: if session is missing, invite to sign in; otherwise offer retry. */
export function CajaError({ error, reintentar }: { error: ErrorApi; reintentar?: () => void }) {
  if (error.status === 401) {
    return (
      <div className="aviso" role="alert">
        <strong>You need to sign in.</strong> <span>{error.message}</span>{" "}
        <a className="cta cta-chica" href="#/login">Sign in</a>
      </div>
    );
  }
  return (
    <div className="error-box" role="alert">
      <strong>Could not load.</strong> <span>{error.message}</span>{" "}
      {reintentar ? (
        <button type="button" className="enlace-boton" onClick={reintentar}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

const ESTADO: Record<Validation["status"], string> = { pass: "OK", warn: "Warning", fail: "Fail", "n/a": "N/A" };

export function Status({ status }: { status: Validation["status"] }) {
  return <span className={`status status-${status.replace("/", "")}`}>{ESTADO[status]}</span>;
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="vacio">
      <strong>{titulo}</strong>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
