import type { DataMode } from "../../lib/esquemas";
import type { DeskObservation, MetricUnit } from "../esquemas/mercado";

export type { MetricUnit };

/** De dónde sale un número. Se muestra junto a cada cifra para que el lector sepa qué puede verificar. */
export type Provenance = "calculado" | "simulado" | "mesa" | "citado";

export type Metric = {
  id: string;
  label: string;
  value: number | null;
  unit: MetricUnit;
  source: string;
  provenance?: Provenance;
  note?: string;
};

export type Label = { id: string; value: string };

export type SpikeClass = "pico" | "cambio estructural";
export type SpikeEvent = { date: string; multiple: number; top10_share_pct: number; classification: SpikeClass };

export type Quadrant = "confirmación" | "espejismo" | "oportunidad no narrada" | "deterioro confirmado" | "neutral" | "sin datos";

export type Divergence = {
  week: string;
  from: string;
  reconstructed: boolean;
  sentiment_index: number | null;
  sentiment_delta: number | null;
  onchain_change_pct: number | null;
  quadrant: Quadrant;
};

export type LagPoint = { lag: number; forward: number | null; reverse: number | null; n: number };

export type ConfluenceItem = { id: string; text: string; met: boolean | null };
export type Npoc = { created: string; level: number; side: "upper" | "lower" };

export type Analysis = {
  mode: DataMode;
  generated_at: string;
  last_block_date: string | null;
  window: { start: string; end: string };
  metrics: Record<string, Metric>;
  labels: Record<string, Label>;
  spikes: SpikeEvent[];
  divergences: Divergence[];
  lag: LagPoint[];
  confluence: ConfluenceItem[];
  npocs: Npoc[];
  notion_themes: { id: string; title: string; count: number }[];
  desk_observations: DeskObservation[];
};
