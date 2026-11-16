import { CSP, SECURITY_HEADERS } from "./security-headers";

describe("cabeceras de seguridad", () => {
  it("la CSP prohíbe scripts inline y eval, plugins, iframes y secuestro de <base>", () => {
    expect(CSP).toMatch(/script-src 'self'(;|$)/);
    expect(CSP).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
    for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'", "connect-src 'self'"]) {
      expect(CSP).toContain(d);
    }
  });

  it("el navegador no habla con terceros", () => {
    expect(CSP).not.toMatch(/https?:\/\//);
  });

  it("incluye HSTS, nosniff y DENY", () => {
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
  });
});
