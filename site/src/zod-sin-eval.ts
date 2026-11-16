import { z } from "zod";

// Without this, zod tries `new Function` to compile validators and CSP (no unsafe-eval) reports a violation.
// Own module, imported first: zod consults this when building schemas, which happens on import.
z.config({ jitless: true });
