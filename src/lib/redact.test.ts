import { REDACTED, redactDeep, redactHeaders, redactString, scrubPii } from "./redact";

describe("redact", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl";

  it("quita tokens bearer, JWT, tokens de Notion y claves en la query", () => {
    const out = redactString(`Bearer abc123 ${jwt} ntn_${"a".repeat(30)} https://x.test/?key=secret&other=1`);
    expect(out).not.toMatch(/abc123|secret|eyJ|ntn_a/);
    expect(out).toContain("other=1");
  });

  it("quita correos del texto publicado y de los logs", () => {
    expect(scrubPii("Escribe a a.b+c@sub.example.org hoy")).toBe("Escribe a [email] hoy");
    expect(redactString("el usuario jane@example.org falló")).toBe("el usuario [email] falló");
    expect(scrubPii("sin dirección, @cuenta está bien")).toBe("sin dirección, @cuenta está bien");
  });

  it("redacta cabeceras secretas por nombre, incluida la apikey de Supabase", () => {
    expect(redactHeaders({ Authorization: "Bearer t", apikey: "k", "x-goog-api-key": "k", Accept: "json" })).toEqual({
      Authorization: REDACTED,
      apikey: REDACTED,
      "x-goog-api-key": REDACTED,
      Accept: "json",
    });
  });

  it("redacta claves secretas anidadas y deja intactos los datos", () => {
    expect(redactDeep({ request: { api_key: "k", service_role: "s", rows: [1, 2] }, note: jwt })).toEqual({
      request: { api_key: REDACTED, service_role: REDACTED, rows: [1, 2] },
      note: REDACTED,
    });
  });
});
