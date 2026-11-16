import {
  ActivoCrudo,
  ESQUEMA,
  EnlaceSeguro,
  EvidenciaCruda,
  IntelCruda,
  ResumenCrudo,
  ResumenDiario,
  type Activo,
  type Estado,
  type Evidencia,
  type Postura,
  type Sesgo,
  type TipoActivo,
} from "./esquema";

export class ErrorResumen extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorResumen";
  }
}

const BLOQUE_JSON = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
// eslint-disable-next-line no-control-regex -- quitar caracteres de control de texto externo es justamente la intención
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const TICKER = /^[A-Z0-9][A-Z0-9 .\-/]{0,19}$/;

const CRIPTO = new Set([
  "BTC", "ETH", "SOL", "NEAR", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK", "BNB", "TON", "SUI", "APT", "ARB", "OP",
  "MATIC", "POL", "TRX", "LTC", "HYPE", "PEPE", "SHIB", "ATOM", "TIA", "INJ", "SEI", "FET", "RNDR", "TAO", "WIF", "BONK",
  "USDT", "USDC", "XLM", "HBAR", "ICP", "FIL", "UNI", "AAVE", "MKR", "ENA", "JUP", "PYTH", "ONDO", "STX", "KAS", "XMR",
]);
const INDICES = new Set(["SPX", "SPY", "NDX", "QQQ", "DXY", "VIX", "DJI", "IWM", "SP500", "NASDAQ", "US10Y", "GOLD", "OIL"]);

/** Texto externo: sin caracteres de control ni de dirección (evita texto que se disfrace en la UI), recortado y acotado. */
export function limpiarTexto(value: string, max: number): string {
  return value.replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function enlaceSeguro(value: string): string | null {
  const v = value.trim();
  return EnlaceSeguro.safeParse(v).success ? v : null;
}

export function normalizarTicker(value: string): string | null {
  const t = limpiarTexto(value, 40).replace(/^\$/, "").toUpperCase();
  return TICKER.test(t) ? t : null;
}

export function normalizarPostura(value: string): Postura | null {
  const v = value.trim().toLowerCase();
  if (["bullish", "alcista", "long", "positivo", "positive"].includes(v)) return "alcista";
  if (["bearish", "bajista", "short", "negativo", "negative"].includes(v)) return "bajista";
  if (["neutral", "neutro"].includes(v)) return "neutral";
  if (["mixed", "mixta", "mixto"].includes(v)) return "mixta";
  return null;
}

export function normalizarSesgo(value: string | null | undefined): Sesgo | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "vacío" || v === "vacio" || v === "empty" || v === "sin datos") return "sin datos";
  if (v === "mixto" || v === "mixta" || v === "mixed") return "mixto";
  const p = normalizarPostura(v);
  return p === "mixta" ? "mixto" : p;
}

export function normalizarEstado(value: string | null | undefined): Estado {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "en progreso" || v === "in progress") return "en progreso";
  if (v === "pendiente" || v === "pending" || v === "not started") return "pendiente";
  return "completado";
}

export function tipoDeActivo(ticker: string, declarado: string): TipoActivo {
  const d = declarado.trim().toLowerCase();
  if (d === "stock" || d === "accion" || d === "acción" || d === "equity") return "accion";
  if (d === "crypto" || d === "cripto") return "cripto";
  if (d === "index" || d === "indice" || d === "índice" || d === "etf") return "indice";
  if (CRIPTO.has(ticker) || /CRYPTO|CRIPTO/.test(ticker)) return "cripto";
  if (INDICES.has(ticker)) return "indice";
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(ticker)) return "accion";
  return "otro";
}

const clamp = (v: number | null, lo: number, hi: number) => (v === null ? null : Math.max(lo, Math.min(hi, v)));

function posturaDePuntuacion(score: number | null): Postura | null {
  if (score === null) return null;
  if (score > 0.15) return "alcista";
  if (score < -0.15) return "bajista";
  return "neutral";
}

/** Postura de un activo a partir de la de sus cuentas: si hay alcistas y bajistas a la vez, es mixta. */
export function posturaAgregada(posturas: readonly (Postura | null)[]): Postura {
  const c = { alcista: 0, bajista: 0, neutral: 0, mixta: 0 };
  for (const p of posturas) if (p) c[p]++;
  if (c.alcista > 0 && c.bajista > 0) return "mixta";
  if (c.mixta > 0 && c.alcista === 0 && c.bajista === 0) return "mixta";
  if (c.alcista > 0) return "alcista";
  if (c.bajista > 0) return "bajista";
  return c.mixta > 0 ? "mixta" : "neutral";
}

export function sesgoGeneral(activos: readonly Activo[]): Sesgo {
  if (activos.length === 0) return "sin datos";
  const al = activos.filter((a) => a.postura === "alcista").length;
  const ba = activos.filter((a) => a.postura === "bajista").length;
  if (al > ba * 2 && al > 0) return "alcista";
  if (ba > al * 2 && ba > 0) return "bajista";
  if (al === 0 && ba === 0) return "neutral";
  return "mixto";
}

/** El objeto JSON del cuerpo de una página de Notion: un bloque ```json o un cuerpo que solo es el objeto. */
export function extraerJson(cuerpo: string): unknown {
  const text = (cuerpo ?? "").trim();
  if (!text) throw new ErrorResumen("La página del resumen está vacía.");
  const match = BLOQUE_JSON.exec(text);
  const candidato = match?.[1] ?? text;
  if (!candidato.trimStart().startsWith("{")) {
    throw new ErrorResumen(`No se encontró un objeto JSON. El resumen debe incluir un bloque \`\`\`json con el esquema ${ESQUEMA}.`);
  }
  try {
    return JSON.parse(candidato) as unknown;
  } catch (err) {
    throw new ErrorResumen(`El JSON del resumen no se puede leer: ${(err as Error).message}`);
  }
}

export type MetaNotion = {
  fecha?: string | null;
  titulo?: string | null;
  sesgo?: string | null;
  estado?: string | null;
};

type Grupo = {
  ticker: string;
  declarado: string;
  posturas: (Postura | null)[];
  puntuacion: number | null;
  conviccion: number | null;
  horizonte: number | null;
  catalizador: string | null;
  invalidaciones: string[];
  resumenes: string[];
  acuerdo: { alcista: number; bajista: number; neutral: number } | null;
  evidencias: Evidencia[];
};

function evidenciaDe(raw: unknown): Evidencia | null {
  const e = EvidenciaCruda.safeParse(raw);
  if (!e.success) return null;
  const afirmacion = limpiarTexto(e.data.claim, 400);
  if (!afirmacion) return null;
  return { cuenta: limpiarTexto(e.data.account, 64), afirmacion, url: enlaceSeguro(e.data.url), postura: normalizarPostura(e.data.stance) };
}

/**
 * Convierte el JSON que escribe el bot (formato plano por cuenta o formato rico por activo) al resumen canónico.
 * Todo número se acota y todo ticker se valida: el texto lo produjo un modelo y no merece confianza ciega.
 */
export function normalizar(entrada: unknown, meta: MetaNotion = {}): ResumenDiario {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new ErrorResumen("El resumen no es un objeto JSON.");
  const raw = ResumenCrudo.parse(entrada);
  const schema = raw.schema.trim();
  if (schema && !/(^|\.)digest\.v1$/.test(schema)) {
    throw new ErrorResumen(`El esquema del resumen es "${limpiarTexto(schema, 60)}"; esta versión lee "${ESQUEMA}".`);
  }

  const fecha = [raw.date, meta.fecha ?? ""].map((f) => f.trim().slice(0, 10)).find((f) => /^\d{4}-\d{2}-\d{2}$/.test(f));
  if (!fecha) throw new ErrorResumen("El resumen no tiene una fecha válida (AAAA-MM-DD).");

  const grupos = new Map<string, Grupo>();
  for (const item of raw.assets.slice(0, 200)) {
    const a = ActivoCrudo.safeParse(item);
    if (!a.success) continue;
    const ticker = normalizarTicker(a.data.ticker);
    if (!ticker) continue;
    const g =
      grupos.get(ticker) ??
      ({
        ticker, declarado: a.data.asset_type, posturas: [], puntuacion: null, conviccion: null, horizonte: null,
        catalizador: null, invalidaciones: [], resumenes: [], acuerdo: null, evidencias: [],
      } satisfies Grupo);
    const score = clamp(a.data.stance_score, -1, 1);
    const postura = normalizarPostura(a.data.stance) ?? posturaDePuntuacion(score);
    g.posturas.push(postura);
    g.puntuacion ??= score;
    g.conviccion ??= clamp(a.data.conviction, 0, 1);
    g.horizonte ??= a.data.horizon_days === null ? null : Math.round(clamp(a.data.horizon_days, 0, 3650) as number);
    const cat = limpiarTexto(a.data.catalyst_type, 40).toUpperCase();
    if (!g.catalizador && cat && cat !== "NONE") g.catalizador = cat;
    const inv = limpiarTexto(a.data.invalidation, 400);
    if (inv && !g.invalidaciones.includes(inv)) g.invalidaciones.push(inv);
    const sum = limpiarTexto(a.data.summary, 900);
    if (sum) g.resumenes.push(sum);
    const ag = a.data.agreement;
    if (Object.keys(ag).length > 0) {
      const n = (k: string) => Math.max(0, Math.round(Number(ag[k]) || 0));
      g.acuerdo = { alcista: n("bullish"), bajista: n("bearish"), neutral: n("neutral") };
    }
    // Formato plano: cada entrada es la afirmación de una cuenta sobre un ticker.
    const plana = evidenciaDe({ account: a.data.account, claim: a.data.claim, url: a.data.url, stance: a.data.stance });
    if (plana) g.evidencias.push(plana);
    for (const e of a.data.evidence.slice(0, 12)) {
      const ev = evidenciaDe(e);
      if (ev) g.evidencias.push(ev);
    }
    grupos.set(ticker, g);
  }

  const intel = new Map<string, { que_hace: string | null; precio: string | null; ultima_noticia: string | null; fuente: string | null }>();
  for (const item of raw.ticker_intel.slice(0, 100)) {
    const i = IntelCruda.safeParse(item);
    if (!i.success) continue;
    const ticker = normalizarTicker(i.data.ticker);
    if (!ticker) continue;
    intel.set(ticker, {
      que_hace: limpiarTexto(i.data.what_it_does, 400) || null,
      precio: limpiarTexto(i.data.price, 60) || null,
      ultima_noticia: limpiarTexto(i.data.last_news, 400) || null,
      fuente: enlaceSeguro(i.data.source),
    });
  }

  const activos: Activo[] = [...grupos.values()].slice(0, 60).map((g) => {
    const evid = g.evidencias.slice(0, 12);
    const conteo = (p: Postura) => evid.filter((e) => e.postura === p).length;
    const info = intel.get(g.ticker);
    return {
      ticker: g.ticker,
      tipo: tipoDeActivo(g.ticker, g.declarado),
      postura: posturaAgregada(g.posturas),
      puntuacion: g.puntuacion,
      conviccion: g.conviccion,
      catalizador: g.catalizador,
      horizonte_dias: g.horizonte,
      invalidacion: g.invalidaciones.join(" · ").slice(0, 400),
      resumen: (g.resumenes[0] ?? evid[0]?.afirmacion ?? "").slice(0, 900),
      que_hace: info?.que_hace ?? null,
      precio: info?.precio ?? null,
      ultima_noticia: info?.ultima_noticia ?? null,
      fuente: info?.fuente ?? null,
      acuerdo: g.acuerdo ?? { alcista: conteo("alcista"), bajista: conteo("bajista"), neutral: conteo("neutral") },
      evidencias: evid,
    };
  });

  const cuentas = [
    ...new Set([...raw.accounts.map((c) => limpiarTexto(String(c ?? ""), 64)), ...activos.flatMap((a) => a.evidencias.map((e) => e.cuenta))].filter(Boolean)),
  ].slice(0, 60);

  const sesgo = normalizarSesgo(meta.sesgo) ?? sesgoGeneral(activos);
  const resumen: ResumenDiario = {
    esquema: ESQUEMA,
    fecha,
    titulo: limpiarTexto(meta.titulo ?? "", 200) || `Resumen del ${fecha}`,
    sesgo: activos.length === 0 ? "sin datos" : sesgo,
    estado: normalizarEstado(meta.estado),
    cuentas,
    contexto: limpiarTexto(raw.market_context, 2000),
    activos,
    conflictos: raw.conflicts.map((c) => limpiarTexto(String(c ?? ""), 300)).filter(Boolean).slice(0, 12),
    alertas: raw.flags.map((f) => limpiarTexto(String(f ?? ""), 60)).filter(Boolean).slice(0, 8),
  };
  return ResumenDiario.parse(resumen);
}
