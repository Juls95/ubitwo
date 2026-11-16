import { z } from "zod";

// Sin esto, zod prueba `new Function` para compilar validadores y la CSP (sin unsafe-eval) lo reporta como violación.
// Va en su propio módulo, importado primero: zod lo consulta al construir esquemas, que ocurre al importar.
z.config({ jitless: true });
