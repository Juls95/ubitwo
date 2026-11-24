import type { Activo, Postura, RegistroResumen, Sesgo, TipoActivo } from "./esquema";

export type ResumenTicker = {
  ticker: string;
  tipo: TipoActivo;
  dias: number;
  ultima_fecha: string;
  ultima_postura: Postura;
  posturas: Record<Postura, number>;
  cuentas: number;
  ultimo_resumen: string;
};

export type DiaTicker = { fecha: string; sesgo_del_dia: Sesgo; activo: Activo };

export type Estadisticas = {
  resumenes: number;
  desde: string | null;
  hasta: string | null;
  tickers: number;
  cuentas: number;
  sesgos: Record<Sesgo, number>;
};

const ordenDesc = (a: RegistroResumen, b: RegistroResumen) => b.fecha.localeCompare(a.fecha);

/** Lista de tickers con su historia condensada, más mencionados primero. */
export function resumenTickers(registros: readonly RegistroResumen[]): ResumenTicker[] {
  const porTicker = new Map<string, { dias: { fecha: string; activo: Activo }[]; cuentas: Set<string> }>();
  for (const r of [...registros].sort(ordenDesc)) {
    for (const a of r.resumen.activos) {
      const t = porTicker.get(a.ticker) ?? { dias: [], cuentas: new Set<string>() };
      t.dias.push({ fecha: r.fecha, activo: a });
      for (const e of a.evidencias) if (e.cuenta) t.cuentas.add(e.cuenta.toLowerCase());
      porTicker.set(a.ticker, t);
    }
  }
  return [...porTicker.entries()]
    .map(([ticker, t]) => {
      const ultimo = t.dias[0] as { fecha: string; activo: Activo };
      const posturas: Record<Postura, number> = { alcista: 0, bajista: 0, neutral: 0, mixta: 0 };
      for (const d of t.dias) posturas[d.activo.postura]++;
      return {
        ticker,
        tipo: ultimo.activo.tipo,
        dias: t.dias.length,
        ultima_fecha: ultimo.fecha,
        ultima_postura: ultimo.activo.postura,
        posturas,
        cuentas: t.cuentas.size,
        ultimo_resumen: ultimo.activo.resumen,
      };
    })
    .sort((a, b) => b.dias - a.dias || b.ultima_fecha.localeCompare(a.ultima_fecha) || a.ticker.localeCompare(b.ticker));
}

/** Historia día a día de un ticker, más reciente primero. */
export function historialTicker(registros: readonly RegistroResumen[], ticker: string): DiaTicker[] {
  const t = ticker.toUpperCase();
  return [...registros]
    .sort(ordenDesc)
    .flatMap((r) => r.resumen.activos.filter((a) => a.ticker === t).map((activo) => ({ fecha: r.fecha, sesgo_del_dia: r.resumen.sesgo, activo })));
}

export function estadisticas(registros: readonly RegistroResumen[]): Estadisticas {
  const fechas = registros.map((r) => r.fecha).sort();
  const sesgos: Record<Sesgo, number> = { alcista: 0, bajista: 0, neutral: 0, mixto: 0, "sin datos": 0 };
  for (const r of registros) sesgos[r.resumen.sesgo]++;
  return {
    resumenes: registros.length,
    desde: fechas[0] ?? null,
    hasta: fechas.at(-1) ?? null,
    tickers: new Set(registros.flatMap((r) => r.resumen.activos.map((a) => a.ticker))).size,
    cuentas: new Set(registros.flatMap((r) => r.resumen.cuentas.map((c) => c.toLowerCase()))).size,
    sesgos,
  };
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export type Coincidencia = { fecha: string; ticker: string | null; texto: string; url: string | null; cuenta: string | null };

/** Búsqueda de texto simple (sin acentos, sin mayúsculas) en contexto, resúmenes y afirmaciones. */
export function buscar(registros: readonly RegistroResumen[], consulta: string, limite = 50): Coincidencia[] {
  const terminos = sinAcentos(consulta).split(/\s+/).filter((t) => t.length >= 2);
  if (terminos.length === 0) return [];
  const coincide = (s: string) => {
    const n = sinAcentos(s);
    return terminos.every((t) => n.includes(t));
  };
  const out: Coincidencia[] = [];
  for (const r of [...registros].sort(ordenDesc)) {
    if (coincide(r.resumen.contexto)) out.push({ fecha: r.fecha, ticker: null, texto: r.resumen.contexto, url: null, cuenta: null });
    for (const a of r.resumen.activos) {
      if (coincide(`${a.ticker} ${a.resumen} ${a.ultima_noticia ?? ""}`)) out.push({ fecha: r.fecha, ticker: a.ticker, texto: a.resumen, url: a.fuente, cuenta: null });
      for (const e of a.evidencias) {
        if (coincide(`${a.ticker} ${e.cuenta} ${e.afirmacion}`)) out.push({ fecha: r.fecha, ticker: a.ticker, texto: e.afirmacion, url: e.url, cuenta: e.cuenta });
      }
    }
    if (out.length >= limite) break;
  }
  return out.slice(0, limite);
}
