import { repositorioMemoria } from "../repositorio";
import { crearClienteNotion, textoBloque, textoPropiedad, type ClienteNotion, type Pagina } from "./notion";
import { construirFiltro, esDelUsuario, metaDePagina, sincronizar } from "./sincronizar";
import { leerDias } from "./run";

const rt = (s: string) => [{ plain_text: s }];
const pagina = (id: string, props: Record<string, unknown>, editada = "2026-11-15T10:00:00.000Z"): Pagina => ({ id, last_edited_time: editada, properties: props });
const props = (fecha: string, extra: Record<string, unknown> = {}) => ({
  Título: { type: "title", title: rt(`Resumen ${fecha}`) },
  Fecha: { type: "date", date: { start: fecha } },
  "Sesgo general": { type: "select", select: { name: "Alcista" } },
  Estado: { type: "status", status: { name: "Completado" } },
  Usuario: { type: "email", email: "Ana@Example.org" },
  ...extra,
});
const cuerpoValido = (fecha: string, ticker = "BTC") =>
  "Notas\n```json\n" + JSON.stringify({ schema: "ubitwo.digest.v1", date: fecha, assets: [{ ticker, account: "@a", claim: "sube", stance: "bullish" }] }) + "\n```";

function notionFalso(paginas: Pagina[], cuerpos: Record<string, string>): ClienteNotion & { filtros: unknown[] } {
  const filtros: unknown[] = [];
  return {
    filtros,
    consultar: async (_db, filtro) => {
      filtros.push(filtro);
      return paginas;
    },
    cuerpo: async (id) => cuerpos[id] ?? "",
  };
}

describe("propiedades y bloques de Notion", () => {
  it("lee status, select, email, date y people", () => {
    expect(textoPropiedad({ type: "status", status: { name: "En progreso" } })).toBe("En progreso");
    expect(textoPropiedad({ type: "date", date: { start: "2026-11-10T08:00:00Z" } })).toBe("2026-11-10");
    expect(textoPropiedad({ type: "people", people: [{ person: { email: "a@b.co" } }] })).toBe("a@b.co");
    expect(textoPropiedad(null)).toBe("");
  });

  it("reconstruye bloques de código JSON", () => {
    expect(textoBloque({ id: "1", type: "code", code: { language: "json", rich_text: rt('{"a":1}') } })).toBe('```json\n{"a":1}\n```');
    expect(textoBloque({ id: "2", type: "paragraph", paragraph: { rich_text: rt("hola") } })).toBe("hola");
  });

  it("toma título y fecha aunque las columnas se llamen distinto", () => {
    const m = metaDePagina(pagina("p", { Nombre: { type: "title", title: rt("Día") }, Día: { type: "date", date: { start: "2026-11-01" } } }));
    expect(m).toMatchObject({ titulo: "Día", fecha: "2026-11-01", sesgo: null, propietario: null });
  });
});

describe("construirFiltro", () => {
  it("filtra por última edición y deja el dueño para después (email o people)", () => {
    const hoy = new Date("2026-11-16T00:00:00Z");
    expect(construirFiltro({ dias: 7, hoy })).toEqual({ timestamp: "last_edited_time", last_edited_time: { on_or_after: "2026-11-09" } });
    expect(esDelUsuario("ana@example.org", "Ana@Example.org")).toBe(true);
    expect(esDelUsuario("ana@example.org, otro@example.org", "otro@example.org")).toBe(true);
    expect(esDelUsuario("otro@example.org", "ana@example.org")).toBe(false);
    expect(esDelUsuario(null, "ana@example.org")).toBe(false);
    expect(esDelUsuario(null, undefined)).toBe(true);
  });
});

describe("sincronizar", () => {
  it("guarda páginas válidas, omite pendientes, reporta errores y es idempotente", async () => {
    const paginas = [
      pagina("a", props("2026-11-15")),
      pagina("b", props("2026-11-14")),
      pagina("c", props("2026-11-13", { Estado: { type: "status", status: { name: "Pendiente" } } })),
      pagina("d", props("2026-11-12")),
    ];
    const notion = notionFalso(paginas, { a: cuerpoValido("2026-11-15"), b: cuerpoValido("2026-11-14", "ETH"), d: "sin json" });
    const repo = repositorioMemoria([], "local");
    const guardar = jest.spyOn(repo, "guardar");

    const r1 = await sincronizar({ notion, repo, databaseId: "db", propUsuario: "Usuario", dias: 30 });
    expect(r1).toMatchObject({ leidas: 4, guardadas: 2, sin_cambios: 0, omitidas: 1 });
    expect(r1.errores).toEqual([{ pagina: "d", error: expect.stringMatching(/JSON/) as unknown as string }]);
    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ fecha: "2026-11-15", notion_page_id: "a" }), "ana@example.org");
    expect((await repo.obtener("2026-11-15"))?.resumen.sesgo).toBe("alcista");

    const r2 = await sincronizar({ notion, repo, databaseId: "db", dias: 30 });
    expect(r2).toMatchObject({ guardadas: 0, sin_cambios: 2 });
  });

  it("omite borradores en inglés y dueños que no coinciden (people o email)", async () => {
    const paginas = [
      pagina("pending", props("2026-11-15", { Estado: { type: "status", status: { name: "Pending" } } })),
      pagina("not-started", props("2026-11-14", { Estado: { type: "status", status: { name: "Not started" } } })),
      pagina("mia", props("2026-11-13", { Usuario: { type: "people", people: [{ person: { email: "Ana@Example.org" } }] } })),
      pagina("otra", props("2026-11-12", { Usuario: { type: "people", people: [{ person: { email: "otro@example.org" } }] } })),
      pagina("mail", props("2026-11-11", { Usuario: { type: "email", email: "otro@example.org" } })),
    ];
    const notion = notionFalso(paginas, { mia: cuerpoValido("2026-11-13", "SOL") });
    const repo = repositorioMemoria([], "local");
    const r = await sincronizar({ notion, repo, databaseId: "db", propUsuario: "Usuario", filtroUsuario: "ana@example.org", dias: 30 });
    expect(notion.filtros[0]).toEqual({ timestamp: "last_edited_time", last_edited_time: { on_or_after: expect.any(String) } });
    expect(notion.filtros[0]).not.toHaveProperty("and");
    expect(r).toMatchObject({ leidas: 5, guardadas: 1, omitidas: 4, errores: [] });
    expect((await repo.obtener("2026-11-13"))?.resumen.activos[0]?.ticker).toBe("SOL");
    expect(await repo.obtener("2026-11-12")).toBeNull();
  });

  it("si dos páginas tienen la misma fecha gana la editada más recientemente", async () => {
    const notion = notionFalso([pagina("nueva", props("2026-11-15")), pagina("vieja", props("2026-11-15"))], {
      nueva: cuerpoValido("2026-11-15", "SOL"),
      vieja: cuerpoValido("2026-11-15", "ETH"),
    });
    const repo = repositorioMemoria([], "local");
    const r = await sincronizar({ notion, repo, databaseId: "db", dias: 30 });
    expect(r).toMatchObject({ guardadas: 1, omitidas: 1 });
    expect((await repo.obtener("2026-11-15"))?.resumen.activos[0]?.ticker).toBe("SOL");
  });
});

describe("cliente HTTP de Notion", () => {
  it("pagina la consulta y los bloques con el token en la cabecera", async () => {
    const respuestas = [
      { results: [{ id: "p1" }], has_more: true, next_cursor: "c1" },
      { results: [{ id: "p2" }], has_more: false, next_cursor: null },
      { results: [{ id: "b1", type: "paragraph", paragraph: { rich_text: rt("hola") } }], has_more: false, next_cursor: null },
    ];
    const fetchImpl = jest.fn().mockImplementation(async () => new Response(JSON.stringify(respuestas.shift()))) as jest.Mock;
    const cliente = crearClienteNotion("ntn_token", "2022-06-28", fetchImpl as unknown as typeof fetch, async () => undefined);
    expect((await cliente.consultar("db")).map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(await cliente.cuerpo("p1")).toBe("hola");
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ntn_token");
    expect(JSON.parse(String(init.body))).toMatchObject({ page_size: 100 });
  });
});

describe("leerDias", () => {
  it("valida el argumento --dias", () => {
    expect(leerDias([])).toBe(30);
    expect(leerDias(["--dias", "7"])).toBe(7);
    expect(() => leerDias(["--dias", "0"])).toThrow(/integer/);
  });
});
