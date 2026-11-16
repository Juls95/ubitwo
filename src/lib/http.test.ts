import { z } from "zod";
import { isSafeUrl, requestJson } from "./http";

const schema = z.object({ ok: z.boolean() });
const respond = (body: string, status = 200): typeof fetch =>
  jest.fn().mockImplementation(async () => new Response(body, { status })) as unknown as typeof fetch;

describe("requestJson", () => {
  it("se niega a enviar credenciales sin https antes de tocar la red", async () => {
    const fetchImpl = respond(JSON.stringify({ ok: true }));
    await expect(
      requestJson({ url: "http://api.example.org/x?token=abc", headers: { Authorization: "Bearer secret" }, schema, fetchImpl }),
    ).rejects.toThrow(/https/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("permite http solo en loopback (Supabase local)", () => {
    expect(isSafeUrl("http://127.0.0.1:54321/rest/v1")).toBe(true);
    expect(isSafeUrl("http://localhost:54321")).toBe(true);
    expect(isSafeUrl("http://supabase.example.org")).toBe(false);
  });

  it("no filtra secretos de la query en los mensajes de error", async () => {
    const fetchImpl = respond("{}", 500);
    await expect(requestJson({ url: "https://api.example.org/x?api_key=topsecret&q=1", schema, fetchImpl })).rejects.toThrow(/REDACTADO/);
    await expect(requestJson({ url: "https://api.example.org/x?api_key=topsecret", schema, fetchImpl })).rejects.not.toThrow(/topsecret/);
  });

  it("devuelve datos validados", async () => {
    await expect(requestJson({ url: "https://api.example.org/x", schema, fetchImpl: respond(JSON.stringify({ ok: true })) })).resolves.toEqual({
      ok: true,
    });
  });

  it("trata un cuerpo vacío como null", async () => {
    await expect(requestJson({ url: "https://api.example.org/x", schema: z.null(), fetchImpl: respond("", 201) })).resolves.toBeNull();
  });

  it("falla rápido si la respuesta no cumple el esquema", async () => {
    await expect(requestJson({ url: "https://api.example.org/x", schema, fetchImpl: respond(JSON.stringify({ ok: "sí" })) })).rejects.toThrow(
      /esquema/,
    );
  });

  it("convierte un error de red en HttpError con estado 0", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch;
    await expect(requestJson({ url: "https://api.example.org/x", schema, fetchImpl })).rejects.toMatchObject({ status: 0 });
  });
});
