import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { SECURITY_HEADERS } from "./src/config/security-headers";

const API = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

export default defineConfig({
  root: "site",
  // Absolute paths: the server also serves the SPA at /login (magic-link return).
  base: "/",
  plugins: [react()],
  // `pnpm dev` starts Vite and proxies the API to the `pnpm dev:server` process.
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
