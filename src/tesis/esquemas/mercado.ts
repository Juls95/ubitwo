import { z } from "zod";
import { DataMode, IsoDate } from "../../lib/esquemas";

export const MetricUnit = z.enum(["count", "pct", "pp", "usd", "usd2", "corr", "days", "index", "ratio"]);
export type MetricUnit = z.infer<typeof MetricUnit>;

/** Una vela diaria. Los precios están en USD; las filas deben ir en orden estrictamente ascendente por fecha. */
export const PriceBar = z
  .object({
    date: IsoDate,
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    volume: z.number().nonnegative(),
  })
  .refine((b) => b.high >= Math.max(b.open, b.close, b.low) && b.low <= Math.min(b.open, b.close), {
    message: "vela OHLC inconsistente",
  });
export type PriceBar = z.infer<typeof PriceBar>;

export const PriceSeries = z
  .object({
    mode: DataMode,
    symbol: z.enum(["NEAR", "BTC"]),
    /** De dónde vienen las velas. Las ejecuciones en vivo deben nombrar una fuente aprobada; las simuladas lo indican. */
    source: z.string().min(1),
    generated_at: z.string().min(1),
    bars: z.array(PriceBar).min(2),
  })
  .superRefine((s, ctx) => {
    for (let i = 1; i < s.bars.length; i++) {
      if ((s.bars[i] as PriceBar).date <= (s.bars[i - 1] as PriceBar).date) {
        ctx.addIssue({ code: "custom", message: `las velas deben ir en orden estrictamente ascendente (índice ${i})` });
        return;
      }
    }
  });
export type PriceSeries = z.infer<typeof PriceSeries>;

/** Un número citado por una mesa de trading en una fila de Notion. Es una afirmación de la mesa, nunca una medición. */
export const DeskFigure = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  value: z.number().finite(),
  unit: MetricUnit,
  as_of: IsoDate.nullable(),
  note: z.string().optional(),
});
export type DeskFigure = z.infer<typeof DeskFigure>;

export const DeskTopic = z.enum(["setup", "positioning", "exploit", "partnership", "price", "macro"]);

/**
 * Una afirmación parafraseada de una mesa. `claim` solo puede citar cifras mediante marcadores {{metric:desk_<id>}}, para que
 * el verificador de la tesis pueda demostrar que ningún número se escribió a mano.
 */
export const DeskObservation = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  date: IsoDate.nullable(),
  desk: z.string().min(1),
  topic: DeskTopic,
  claim: z.string().min(1).max(600),
});
export type DeskObservation = z.infer<typeof DeskObservation>;

export const DeskSnapshot = z.object({
  mode: DataMode,
  generated_at: z.string().min(1),
  source: z.literal("notion"),
  /** Cuentas públicas de X cuyas filas mencionan NEAR. */
  desks: z.array(z.string().min(1)),
  figures: z.array(DeskFigure),
  observations: z.array(DeskObservation),
});
export type DeskSnapshot = z.infer<typeof DeskSnapshot>;
