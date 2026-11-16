import { z } from "zod";
import { IsoDate } from "../lib/esquemas";

/** Versión canónica del resumen diario. Se aceptan otros prefijos (`*.digest.v1`) por compatibilidad con bots existentes. */
export const ESQUEMA = "ubitwo.digest.v1";

export const Postura = z.enum(["alcista", "bajista", "neutral", "mixta"]);
export type Postura = z.infer<typeof Postura>;

export const Sesgo = z.enum(["alcista", "bajista", "neutral", "mixto", "sin datos"]);
export type Sesgo = z.infer<typeof Sesgo>;

export const Estado = z.enum(["completado", "en progreso", "pendiente"]);
export type Estado = z.infer<typeof Estado>;

export const TipoActivo = z.enum(["accion", "cripto", "indice", "otro"]);
export type TipoActivo = z.infer<typeof TipoActivo>;

/** Solo enlaces https: el contenido viene de un bot y de Notion, y es evidencia, nunca instrucciones ni código. */
export const EnlaceSeguro = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "se esperaba una URL https");

export const Evidencia = z.object({
  cuenta: z.string().max(64),
  afirmacion: z.string().max(400),
  url: EnlaceSeguro.nullable(),
  postura: Postura.nullable(),
});
export type Evidencia = z.infer<typeof Evidencia>;

export const Activo = z.object({
  ticker: z.string().min(1).max(20),
  tipo: TipoActivo,
  postura: Postura,
  puntuacion: z.number().min(-1).max(1).nullable(),
  conviccion: z.number().min(0).max(1).nullable(),
  catalizador: z.string().max(40).nullable(),
  horizonte_dias: z.number().int().min(0).max(3650).nullable(),
  invalidacion: z.string().max(400),
  resumen: z.string().max(900),
  que_hace: z.string().max(400).nullable(),
  precio: z.string().max(60).nullable(),
  ultima_noticia: z.string().max(400).nullable(),
  fuente: EnlaceSeguro.nullable(),
  acuerdo: z.object({ alcista: z.number().int().min(0), bajista: z.number().int().min(0), neutral: z.number().int().min(0) }),
  evidencias: z.array(Evidencia).max(12),
});
export type Activo = z.infer<typeof Activo>;

export const ResumenDiario = z.object({
  esquema: z.literal(ESQUEMA),
  fecha: IsoDate,
  titulo: z.string().max(200),
  sesgo: Sesgo,
  estado: Estado,
  cuentas: z.array(z.string().max(64)).max(60),
  contexto: z.string().max(2000),
  activos: z.array(Activo).max(60),
  conflictos: z.array(z.string().max(300)).max(12),
  alertas: z.array(z.string().max(60)).max(8),
});
export type ResumenDiario = z.infer<typeof ResumenDiario>;

/** Un resumen tal como se guarda: el contenido más su origen. */
export const RegistroResumen = z.object({
  fecha: IsoDate,
  notion_page_id: z.string().max(64).nullable(),
  resumen: ResumenDiario,
  actualizado: z.string(),
});
export type RegistroResumen = z.infer<typeof RegistroResumen>;

// ---------------------------------------------------------------------------
// Entrada cruda: lo que escribe el bot en el bloque ```json de cada página de Notion.
// Es permisiva a propósito (el bot y este código cambian en momentos distintos); `normalizar` la convierte
// al formato canónico y descarta lo que no se puede usar.
// ---------------------------------------------------------------------------

const texto = z.unknown().optional().transform((v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : ""));
const numero = z.unknown().optional().transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null));
const lista = <T extends z.ZodType>(item: T) => z.unknown().optional().transform((v) => (Array.isArray(v) ? v : [])).pipe(z.array(item));

export const EvidenciaCruda = z.looseObject({ account: texto, claim: texto, url: texto, stance: texto });

export const ActivoCrudo = z.looseObject({
  ticker: texto,
  asset_type: texto,
  stance: texto,
  stance_score: numero,
  conviction: numero,
  novelty: numero,
  horizon_days: numero,
  catalyst_type: texto,
  invalidation: texto,
  summary: texto,
  claim: texto,
  account: texto,
  url: texto,
  agreement: z.unknown().optional().transform((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})),
  evidence: lista(z.unknown()),
});

export const IntelCruda = z.looseObject({ ticker: texto, what_it_does: texto, price: texto, last_news: texto, source: texto });

export const ResumenCrudo = z.looseObject({
  schema: texto,
  date: texto,
  username: texto,
  accounts: lista(z.unknown()),
  market_context: texto,
  assets: lista(z.unknown()),
  ticker_intel: lista(z.unknown()),
  conflicts: lista(z.unknown()),
  flags: lista(z.unknown()),
});
export type ResumenCrudo = z.infer<typeof ResumenCrudo>;
