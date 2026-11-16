import { resolve } from "node:path";

/** Todo comando corre desde la raíz del repo (scripts de pnpm, CI, Render), así que las rutas se resuelven desde cwd. */
export const repoPath = (...parts: string[]) => resolve(process.cwd(), ...parts);

export const isMain = (relativeFile: string) => Boolean(process.argv[1]) && resolve(process.argv[1] ?? "") === repoPath(relativeFile);
