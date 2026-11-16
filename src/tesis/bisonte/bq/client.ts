import { readFileSync } from "node:fs";
import { createLogger } from "../../../lib/logger";
import { repoPath } from "../../../lib/paths";

const log = createLogger("bisonte:bq");

export type QueryParams = Record<string, string | number>;
export type QueryTypes = Record<string, "DATE" | "STRING" | "INT64">;

/** Superficie mínima del cliente de BigQuery para poder probar el control de costos sin GCP. */
export interface BqBackend {
  dryRun(sql: string, params: QueryParams, types: QueryTypes): Promise<number>;
  run(sql: string, params: QueryParams, types: QueryTypes, maxBytes: number): Promise<Record<string, unknown>[]>;
}

export class CostGuardError extends Error {
  constructor(readonly queryId: string, readonly bytes: number, readonly maxBytes: number) {
    super(`La consulta ${queryId} procesaría ${bytes} bytes, por encima de BQ_MAX_BYTES=${maxBytes}. Reduce la ventana o sube el tope de forma deliberada.`);
    this.name = "CostGuardError";
  }
}

const PARTITION_FILTER = /block_date\s*>=\s*@start_date[\s\S]*block_date\s*<\s*@end_date/;

export function loadQuery(id: string): string {
  if (!/^[a-z_]+$/.test(id)) throw new Error(`Id de consulta inválido: ${id}`);
  const sql = readFileSync(repoPath("src/tesis/bisonte/bq/queries", `${id}.sql`), "utf8");
  if (!PARTITION_FILTER.test(sql)) throw new Error(`La consulta ${id} debe filtrar por block_date con @start_date/@end_date`);
  return sql;
}

export type GuardedResult = { rows: Record<string, unknown>[]; bytesProcessed: number };

/** Primero una simulación (dry run); se niega a ejecutar lo que supere el tope de bytes; ejecuta con maximumBytesBilled como segunda barrera. */
export async function runGuarded(
  backend: BqBackend,
  queryId: string,
  params: QueryParams,
  types: QueryTypes,
  maxBytes: number,
): Promise<GuardedResult> {
  const sql = loadQuery(queryId);
  const bytes = await backend.dryRun(sql, params, types);
  log.info("simulación (dry run)", { queryId, bytes, maxBytes });
  if (bytes > maxBytes) throw new CostGuardError(queryId, bytes, maxBytes);
  const rows = await backend.run(sql, params, types, maxBytes);
  return { rows, bytesProcessed: bytes };
}

export async function createBigQueryBackend(projectId: string): Promise<BqBackend> {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId });
  return {
    async dryRun(sql, params, types) {
      const [job] = await bq.createQueryJob({ query: sql, params, types, location: "US", dryRun: true });
      return Number(job.metadata?.statistics?.totalBytesProcessed ?? 0);
    },
    async run(sql, params, types, maxBytes) {
      const [rows] = await bq.query({ query: sql, params, types, location: "US", maximumBytesBilled: String(maxBytes) });
      return rows as Record<string, unknown>[];
    },
  };
}
