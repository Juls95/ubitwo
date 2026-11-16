import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { SECURITY_HEADERS } from "./src/config/security-headers";

const API = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

export default defineConfig({
  root: "site",
  // Rutas absolutas: el servidor también sirve la SPA en /acceso (retorno del enlace mágico).
  base: "/",
  plugins: [react()],
  // `pnpm dev` levanta Vite y reenvía la API al servidor de `pnpm dev:server`.
  server: { proxy: { "/api": API, "/healthz": API, "/readyz": API } },
  preview: { headers: SECURITY_HEADERS, proxy: { "/api": API } },
  build: {
    outDir: "../dist",
    chunkSizeWarningLimit: 900,
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        minify: { compress: { dropConsole: true, dropDebugger: true } },
      },
    },
  },
});
