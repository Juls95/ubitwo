import { z } from "zod";
import { HttpsUrl } from "../../../src/lib/esquemas";
import type { AgentCard } from "../../../src/tesis/toro/agents";
import type { Divergence, Metric, SpikeEvent } from "../../../src/tesis/toro/types";
import type { DeskSnapshot } from "../../../src/tesis/esquemas/mercado";
import type { OsoNotionSnapshot, OsoWeekly, ScoredPost } from "../../../src/tesis/esquemas/oso";

export type ChartView = {
  id: string;
  title: string;
  agent: "bisonte" | "oso" | "toro";
  query_file: string | null;
  endpoint: string | null;
  query_sql: string | null;
  sentence: string;
  spec: Record<string, unknown>;
};

export type Tesis = {
  mode: "mock" | "live";
  generated_at: string;
  thesis_md: string;
  hypothesis_verdict: string | null;
  regime: string | null;
  stance: string | null;
  technical_bias: string | null;
  desk: DeskSnapshot | null;
  metrics: Record<string, Metric>;
  charts: ChartView[];
  divergences: Divergence[];
  spikes: SpikeEvent[];
  oso: {
    weeks: OsoWeekly[];
    latest_posts: ScoredPost[];
    discard_reasons: Record<string, number>;
    notion: OsoNotionSnapshot | null;
  };
  agents: AgentCard[];
};

/** Shallow validation: fail fast if the bundle is missing or from an incompatible version. */
const Forma = z.looseObject({
  mode: z.enum(["mock", "live"]),
  generated_at: z.string(),
  thesis_md: z.string(),
  charts: z.array(z.looseObject({ id: z.string(), spec: z.record(z.string(), z.unknown()) })),
  agents: z.array(z.looseObject({ id: z.enum(["oso", "bisonte", "toro"]) })).length(3),
  // The build already requires https; re-check so a tampered artifact cannot sneak another scheme into a link.
  oso: z.looseObject({
    weeks: z.array(z.looseObject({ claims_to_verify: z.array(z.looseObject({ url: HttpsUrl })) })),
    latest_posts: z.array(z.looseObject({ url: HttpsUrl })),
  }),
});

export function parsearTesis(json: unknown): Tesis {
  const r = Forma.safeParse(json);
  if (!r.success) throw new Error(`Thesis bundle is invalid: ${r.error.issues[0]?.message ?? "unknown shape"}`);
  return json as Tesis;
}

let cache: Promise<Tesis> | null = null;

export function cargarTesis(fetchImpl: typeof fetch = fetch): Promise<Tesis> {
  cache ??= fetchImpl("/data/tesis.json")
    .then(async (res) => {
      if (!res.ok) throw new Error(`Could not load the thesis (${res.status}). Run pnpm build.`);
      return parsearTesis(await res.json());
    })
    .catch((err: unknown) => {
      cache = null;
      throw err;
    });
  return cache;
}

export function reiniciarCacheTesis(): void {
  cache = null;
}
