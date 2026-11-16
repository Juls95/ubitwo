import { loadEnv, requireEnv } from "../../config/env";
import { isMain } from "../../lib/paths";
import { repositorioDeEscritura } from "../repositorio";
import { crearClienteNotion } from "./notion";
import { sincronizar } from "./sincronizar";

/** `pnpm noticias:sync [--dias 30]` · en Render corre como cron diario. */
export function leerDias(argv: readonly string[]): number {
  const i = argv.indexOf("--dias");
  const n = i >= 0 ? Number(argv[i + 1]) : 30;
  if (!Number.isInteger(n) || n < 1 || n > 3650) throw new Error("--dias debe ser un entero entre 1 y 3650");
  return n;
}

async function main() {
  const env = loadEnv();
  const { NOTION_TOKEN, NOTION_DB_RESUMENES } = requireEnv(env, ["NOTION_TOKEN", "NOTION_DB_RESUMENES"]);
  const repo = repositorioDeEscritura(env);
  const r = await sincronizar({
    notion: crearClienteNotion(NOTION_TOKEN, env.NOTION_VERSION),
    repo,
    databaseId: NOTION_DB_RESUMENES,
    propUsuario: env.NOTION_PROP_USUARIO,
    filtroUsuario: env.NOTION_FILTRO_USUARIO,
    dias: leerDias(process.argv),
  });
  process.stdout.write(
    `noticias:sync → ${repo.tipo} · leídas ${r.leidas} · guardadas ${r.guardadas} · sin cambios ${r.sin_cambios} · omitidas ${r.omitidas} · errores ${r.errores.length}\n`,
  );
  for (const e of r.errores) process.stdout.write(`  - ${e.pagina}: ${e.error}\n`);
  if (r.leidas > 0 && r.guardadas + r.sin_cambios === 0 && r.errores.length > 0) process.exitCode = 1;
}

if (isMain("src/noticias/sync/run.ts")) {
  main().catch((err: unknown) => {
    process.stderr.write(`noticias:sync falló: ${(err as Error).message}\n`);
    process.exitCode = 1;
  });
}
