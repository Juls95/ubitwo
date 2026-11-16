import { loadEnv } from "../src/config/env";
import { revisar } from "./check-env";

describe("check-env", () => {
  it("sin variables, todo queda pendiente y nombra lo que falta", () => {
    const r = revisar(loadEnv({}));
    expect(r.every((x) => !x.listo)).toBe(true);
    expect(r.find((x) => x.nombre.startsWith("Database"))?.faltan).toEqual(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  });

  it("nunca incluye valores en el informe", () => {
    const secreto = "sb-service-role-que-no-debe-salir";
    const env = loadEnv({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: secreto, GEMINI_API_KEY: "g-secreto", LLM_MODEL: "modelo" });
    const r = revisar(env);
    expect(JSON.stringify(r)).not.toContain(secreto);
    expect(JSON.stringify(r)).not.toContain("g-secreto");
    expect(r.find((x) => x.nombre.startsWith("Database"))?.listo).toBe(true);
    expect(r.find((x) => x.nombre.startsWith("AI"))?.listo).toBe(true);
  });
});
