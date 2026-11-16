import { createReadStream, existsSync, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/** Resuelve una ruta pública dentro de `raiz`; devuelve null ante cualquier intento de salir de ella. */
export function resolverDentro(raiz: string, rutaUrl: string): string | null {
  let ruta: string;
  try {
    ruta = decodeURIComponent(rutaUrl);
  } catch {
    return null;
  }
  if (ruta.includes("\0")) return null;
  const base = resolve(raiz);
  const destino = resolve(base, `.${sep}${normalize(ruta)}`);
  return destino === base || destino.startsWith(base + sep) ? destino : null;
}

/**
 * Sirve `dist/`. Las rutas sin extensión devuelven index.html (la SPA resuelve la vista).
 * Los recursos con hash de Vite se cachean un año; el resto se revalida siempre.
 */
export function servirEstatico(raiz: string, rutaUrl: string, res: ServerResponse, metodo: string): boolean {
  const indice = join(raiz, "index.html");
  let archivo = resolverDentro(raiz, rutaUrl === "/" ? "/index.html" : rutaUrl);
  if (archivo === null) return false;
  if (!existsSync(archivo) || !statSync(archivo).isFile()) {
    if (extname(rutaUrl) !== "" || !existsSync(indice)) return false;
    archivo = indice;
  }
  const inmutable = rutaUrl.startsWith("/assets/");
  res.writeHead(200, {
    "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream",
    "Cache-Control": inmutable ? "public, max-age=31536000, immutable" : "no-cache",
    "Content-Length": statSync(archivo).size,
  });
  if (metodo === "HEAD") res.end();
  else createReadStream(archivo).pipe(res);
  return true;
}
