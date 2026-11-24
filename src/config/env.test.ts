import { hasLlm, hasSupabase, loadEnv, requireEnv } from "./env";

describe("loadEnv", () => {
  it("aplica valores por defecto seguros", () => {
    const env = loadEnv({});
    expect(env.DATA_MODE).toBe("live");
    expect(env.LLM_PROVIDER).toBe("gemini");
    expect(env.PORT).toBe(3000);
    expect(env.ESPACIO_ID).toBe("principal");
    expect(env.NOTION_TOKEN).toBeUndefined();
    expect(env.EMAILS_PERMITIDOS).toEqual([]);
  });

  it("trata las variables vacías como no definidas", () => {
    const env = loadEnv({ SUPABASE_URL: "", PORT: "", NOTION_TOKEN: "" });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.PORT).toBe(3000);
    expect(hasSupabase(env)).toBe(false);
  });

  it("cambia de proveedor LLM con una sola variable", () => {
    expect(loadEnv({ LLM_PROVIDER: "xai" }).LLM_PROVIDER).toBe("xai");
    expect(hasLlm(loadEnv({ LLM_PROVIDER: "xai", XAI_API_KEY: "k" }))).toBe(true);
    expect(hasLlm(loadEnv({ GEMINI_API_KEY: "k" }))).toBe(false);
  });

  it("normaliza la lista de correos permitidos", () => {
    expect(loadEnv({ EMAILS_PERMITIDOS: " Ana@Example.org, bo@example.org ," }).EMAILS_PERMITIDOS).toEqual([
      "ana@example.org",
      "bo@example.org",
    ]);
  });

  it("falla rápido con valores inválidos", () => {
    expect(() => loadEnv({ DATA_MODE: "prod" })).toThrow(/Invalid environment/);
    expect(() => loadEnv({ SESSION_SECRET: "corto" })).toThrow(/32 characters/);
    expect(() => loadEnv({ EMAILS_PERMITIDOS: "no-es-correo" })).toThrow(/Invalid environment/);
    expect(() => loadEnv({ ESPACIO_ID: "Con Espacios" })).toThrow(/Invalid environment/);
  });
});

describe("requireEnv", () => {
  it("nombra cada variable que falta", () => {
    expect(() => requireEnv(loadEnv({}), ["GCP_PROJECT_ID", "INTENTS_JWT"])).toThrow("GCP_PROJECT_ID, INTENTS_JWT");
  });

  it("devuelve el entorno acotado cuando están presentes", () => {
    expect(requireEnv(loadEnv({ INTENTS_JWT: "x" }), ["INTENTS_JWT"]).INTENTS_JWT).toBe("x");
  });
});
