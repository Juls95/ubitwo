import type { ReactNode } from "react";
import type { Postura, Sesgo } from "../../../src/noticias/esquema";
import type { Validation } from "../../../src/tesis/toro/agents";
import type { ErrorApi } from "../lib/api";
import { ETIQUETA_POSTURA, ETIQUETA_SESGO, ICONO_POSTURA } from "../lib/formato";
import { safeHref } from "../lib/safe-url";

export function InsigniaPostura({ postura }: { postura: Postura }) {
  return (
    <span className={`insignia insignia-${postura}`} title={`Postura ${ETIQUETA_POSTURA[postura].toLowerCase()}`}>
      <span aria-hidden="true">{ICONO_POSTURA[postura]}</span> {ETIQUETA_POSTURA[postura]}
    </span>
  );
}

export function InsigniaSesgo({ sesgo }: { sesgo: Sesgo }) {
  const clase = sesgo === "mixto" ? "mixta" : sesgo === "sin datos" ? "neutral" : sesgo;
  return <span className={`insignia insignia-${clase}`}>{ETIQUETA_SESGO[sesgo]}</span>;
}

/** Barra de acuerdo entre cuentas: alcistas, neutrales y bajistas, en proporción. */
export function BarraAcuerdo({ alcista, neutral, bajista }: { alcista: number; neutral: number; bajista: number }) {
  const total = alcista + neutral + bajista;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="barra-acuerdo" role="img" aria-label={`${alcista} alcistas, ${neutral} neutrales, ${bajista} bajistas`}>
      <span className="b-alcista" style={{ width: pct(alcista) }} />
      <span className="b-neutral" style={{ width: pct(neutral) }} />
      <span className="b-bajista" style={{ width: pct(bajista) }} />
    </div>
  );
}

/** Enlace externo solo si es https; si no, texto plano. Siempre en pestaña nueva y sin referer. */
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

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <p className="boot" role="status">
      <span className="live-dot" /> {texto}
    </p>
  );
}

/** Error de la API explicado: si falta sesión, invita a entrar; si no, permite reintentar. */
export function CajaError({ error, reintentar }: { error: ErrorApi; reintentar?: () => void }) {
  if (error.status === 401) {
    return (
      <div className="aviso" role="alert">
        <strong>Necesitas iniciar sesión.</strong> <span>{error.message}</span>{" "}
        <a className="cta cta-chica" href="#/acceso">Entrar</a>
      </div>
    );
  }
  return (
    <div className="error-box" role="alert">
      <strong>No se pudo cargar.</strong> <span>{error.message}</span>{" "}
      {reintentar ? (
        <button type="button" className="enlace-boton" onClick={reintentar}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

const ESTADO: Record<Validation["status"], string> = { pass: "OK", warn: "Aviso", fail: "Falla", "n/a": "N/A" };

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
