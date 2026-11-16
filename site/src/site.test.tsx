/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, BannerDemo, Pagina } from "./App";
import { crearDemo } from "../../src/noticias/demo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BarraAcuerdo, InsigniaPostura } from "./components/Comunes";
import { TarjetaActivo } from "./components/TarjetaActivo";
import { api, ErrorApi, pedir, Estado as EsquemaEstado, type Estado } from "./lib/api";
import { Markdown } from "./lib/markdown";
import { parsearTesis, reiniciarCacheTesis, type Tesis } from "./lib/tesis";
import { safeHref } from "./lib/safe-url";
import { filtrarActivos } from "./pages/PaginaNoticias";
import { pasosDeConexion } from "./pages/PaginaEstado";
import { tokenEnLaUrl } from "./pages/PaginaAcceso";

jest.mock("vega-embed", () => ({ __esModule: true, default: jest.fn().mockResolvedValue({ finalize: jest.fn() }) }));

const registros = crearDemo(new Date("2026-11-16T12:00:00Z"));
const [hoy] = registros;
if (!hoy) throw new Error("la demo debe tener al menos un día");

const estado: Estado = {
  version: "test",
  fuente: "demo",
  demo: true,
  notion: false,
  ia: { disponible: false, proveedor: "gemini" },
  conexiones: { supabase: false, acceso: false, notion: false, ia: false, app_url: false },
};

const agente = (id: "oso" | "bisonte" | "toro", status: "pass" | "warn" | "fail" = "pass") => ({
  id, name: id[0]?.toUpperCase() + id.slice(1), role: `rol de ${id}`, does: ["hace algo"], inputs: ["entrada"], outputs: ["salida"],
  runs: [{ at: "2026-11-09", summary: "corrida", details: { filas: 3 } }],
  validations: [{ name: "control", status, detail: "detalle" }],
});

const tesis: Tesis = {
  mode: "mock",
  generated_at: "2026-11-09T06:00:00.000Z",
  thesis_md: "# Tesis\n\n## 1. Afirmación\n\nTexto **clave**.",
  hypothesis_verdict: "respaldada por los datos actuales",
  regime: "expansión",
  stance: "constructiva en la dirección; el momento no está confirmado",
  technical_bias: "neutral",
  desk: null,
  metrics: {},
  charts: [{ id: "daa", title: "Cuentas activas diarias", agent: "bisonte", query_file: "q.sql", endpoint: null, query_sql: "SELECT 1", sentence: "Frase sencilla.", spec: {} }],
  divergences: [{ week: "2026-W44", from: "2026-10-26", reconstructed: true, sentiment_index: 0.7, sentiment_delta: 0.5, onchain_change_pct: -8, quadrant: "espejismo" }],
  spikes: [],
  oso: { weeks: [], latest_posts: [], discard_reasons: { not_in_citations: 2 }, notion: null },
  agents: [agente("oso", "warn"), agente("bisonte"), agente("toro")],
};

type Respuestas = Record<string, { status?: number; body: unknown }>;

/** jsdom no trae fetch: este falso responde por prefijo de ruta y registra cada llamada. */
function fetchFalso(respuestas: Respuestas) {
  return jest.fn(async (entrada: RequestInfo | URL, _init?: RequestInit) => {
    const ruta = String(entrada);
    const clave = Object.keys(respuestas).filter((k) => ruta.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    const r = clave ? respuestas[clave] : { status: 404, body: { error: "Ruta no encontrada" } };
    const status = r?.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => r?.body } as Response;
  });
}

const base: Respuestas = {
  "/api/estado": { body: estado },
  "/api/sesion/salir": { body: { ok: true } },
  "/api/sesion": { body: { politica: "abierto-local", usuario: null, acceso_configurado: false } },
  "/api/resumenes": { body: { resumenes: registros } },
  "/api/estadisticas": { body: { resumenes: 5, desde: "2026-11-12", hasta: "2026-11-16", tickers: 8, cuentas: 4, sesgos: { alcista: 2, bajista: 1, neutral: 1, mixto: 1, "sin datos": 0 } } },
  "/data/tesis.json": { body: tesis },
};

beforeEach(() => {
  window.location.hash = "";
  window.history.replaceState(null, "", "/");
  reiniciarCacheTesis();
  global.fetch = fetchFalso(base);
  window.scrollTo = jest.fn();
});

describe("cliente de la API", () => {
  it("valida la respuesta con zod y explica los errores en español", async () => {
    await expect(api.estado()).resolves.toMatchObject({ demo: true });
    global.fetch = fetchFalso({ "/api/estado": { body: { version: 1 } } });
    await expect(api.estado()).rejects.toThrow(/Respuesta inesperada/);
    global.fetch = fetchFalso({ "/api/tickers": { status: 401, body: { error: "Inicia sesión para ver los datos" } } });
    await expect(api.tickers()).rejects.toMatchObject({ status: 401, message: "Inicia sesión para ver los datos" });
  });

  it("convierte un fallo de red en un ErrorApi con estado 0", async () => {
    const caido = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(pedir("/api/estado", EsquemaEstado, { fetchImpl: caido })).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/No hay conexión/) });
  });
});

describe("tesis y utilidades", () => {
  it("rechaza un paquete con enlaces que no son https", () => {
    expect(() => parsearTesis(tesis)).not.toThrow();
    const malo = { ...tesis, oso: { ...tesis.oso, latest_posts: [{ url: "javascript:alert(1)" }] } };
    expect(() => parsearTesis(malo)).toThrow(/no es válido/);
  });

  it("safeHref solo deja pasar https", () => {
    expect(safeHref("https://x.com/a")).toBe("https://x.com/a");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("http://x.com")).toBeUndefined();
  });

  it("Markdown nunca interpreta HTML", () => {
    const { container } = render(<Markdown source={"# Título\n\n<img src=x onerror=alert(1)>"} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { name: "Título" })).toBeInTheDocument();
  });

  it("filtra activos por postura y tipo", () => {
    const todos = filtrarActivos(hoy, { postura: "todas", tipo: "todos" });
    const cripto = filtrarActivos(hoy, { postura: "todas", tipo: "cripto" });
    expect(cripto.length).toBeGreaterThan(0);
    expect(cripto.every((a) => a.tipo === "cripto")).toBe(true);
    expect(todos.length).toBe(hoy.resumen.activos.length);
  });

  it("lista las conexiones pendientes sin exponer valores", () => {
    const pasos = pasosDeConexion(estado);
    expect(pasos.map((p) => p.id)).toEqual(["supabase", "notion", "acceso", "app_url", "ia"]);
    expect(pasos.every((p) => !p.listo)).toBe(true);
  });

  it("solo reconoce el token del enlace mágico en /acceso", () => {
    window.history.replaceState(null, "", "/#access_token=abc");
    expect(tokenEnLaUrl()).toBeNull();
    window.history.replaceState(null, "", "/acceso#access_token=abc&type=magiclink");
    expect(tokenEnLaUrl()).toBe("abc");
  });
});

describe("componentes", () => {
  it("la insignia de postura es estable", () => {
    const { container } = render(<InsigniaPostura postura="alcista" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("la barra de acuerdo describe el reparto en texto", () => {
    render(<BarraAcuerdo alcista={3} neutral={1} bajista={0} />);
    expect(screen.getByRole("img", { name: "3 alcistas, 1 neutrales, 0 bajistas" })).toBeInTheDocument();
  });

  it("la tarjeta de un activo muestra evidencias al pedirlas y enlaza solo https", () => {
    const activo = hoy.resumen.activos.find((a) => a.evidencias.length > 0);
    if (!activo) throw new Error("la demo debe tener evidencias");
    render(<TarjetaActivo activo={activo} />);
    expect(screen.getByRole("link", { name: activo.ticker })).toHaveAttribute("href", `#/tickers/${encodeURIComponent(activo.ticker)}`);
    fireEvent.click(screen.getByRole("button", { name: /Ver \d+ evidencia/ }));
    for (const a of screen.getAllByRole("link").filter((l) => l.getAttribute("target") === "_blank")) {
      expect(a.getAttribute("href")).toMatch(/^https:/);
      expect(a).toHaveAttribute("rel", "noreferrer noopener");
    }
  });

  it("ErrorBoundary aísla una vista que falla y emite ubitwo:error", () => {
    const escucha = jest.fn();
    window.addEventListener("ubitwo:error", escucha);
    const Falla = () => {
      throw new Error("boom");
    };
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary label="Gráfica">
        <Falla />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Gráfica: no se pudo mostrar.");
    expect(escucha).toHaveBeenCalled();
    window.removeEventListener("ubitwo:error", escucha);
  });

  it("el aviso de demostración solo aparece con datos ficticios", () => {
    const { rerender } = render(<BannerDemo estado={estado} />);
    expect(screen.getByRole("status")).toHaveTextContent(/DATOS DE DEMOSTRACIÓN/);
    rerender(<BannerDemo estado={{ ...estado, demo: false, fuente: "supabase" }} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("páginas", () => {
  const props = { estado, sesion: null, alCambiarSesion: () => undefined };

  it("inicio: muestra el sesgo del día y lleva a las noticias", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: /ágora/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver las noticias de hoy" })).toHaveAttribute("href", "#/noticias");
    await waitFor(() => expect(screen.getByText(hoy.resumen.contexto)).toBeInTheDocument());
  });

  it("noticias: cambia de día con las pestañas y busca", async () => {
    global.fetch = fetchFalso({ ...base, "/api/buscar": { body: { consulta: "btc", resultados: [{ fecha: "2026-11-16", ticker: "BTC", texto: "BTC rompe máximos", url: "https://example.com/x", cuenta: "@demo_mercados" }] } } });
    render(<Pagina ruta="/noticias" {...props} />);
    const pestanas = await screen.findAllByRole("tab");
    expect(pestanas).toHaveLength(registros.length);
    expect(pestanas[0]).toHaveAttribute("aria-selected", "true");
    const segundo = pestanas[1];
    if (!segundo) throw new Error("se esperaban dos días");
    fireEvent.click(segundo);
    expect(segundo).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: registros[1]?.resumen.titulo })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), { target: { value: "btc" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("BTC rompe máximos")).toHaveAttribute("href", "https://example.com/x");
  });

  it("noticias: si falta sesión, invita a entrar", async () => {
    global.fetch = fetchFalso({ ...base, "/api/resumenes": { status: 401, body: { error: "Inicia sesión para ver los datos" } } });
    render(<Pagina ruta="/noticias" {...props} />);
    expect(await screen.findByText("Necesitas iniciar sesión.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "#/acceso");
  });

  it("tesis: muestra el veredicto y los agentes con su expediente", async () => {
    const { unmount } = render(<Pagina ruta="/tesis" {...props} />);
    expect(await screen.findByText("respaldada por los datos actuales")).toBeInTheDocument();
    expect(screen.getByText(/Tesis con datos simulados/)).toBeInTheDocument();
    unmount();
    render(<Pagina ruta="/tesis/agentes" {...props} />);
    expect(await screen.findByRole("link", { name: "Expediente de Oso →" })).toHaveAttribute("href", "#/tesis/agentes/oso");
    expect(screen.getByText("espejismo")).toBeInTheDocument();
  });

  it("estado: lista lo que falta conectar", () => {
    render(<Pagina ruta="/estado" {...props} />);
    expect(screen.getByText(/0 de 5 conexiones listas/)).toBeInTheDocument();
    expect(screen.getByText("Base de datos (Supabase)")).toBeInTheDocument();
  });

  it("acceso: explica cuando el correo aún no está configurado", () => {
    render(<Pagina ruta="/acceso" {...props} sesion={{ politica: "abierto-local", usuario: null, acceso_configurado: false }} />);
    expect(screen.getByText(/todavía no está configurado/)).toBeInTheDocument();
  });

  it("acceso: canjea el token del enlace y lo borra de la URL", async () => {
    window.history.replaceState(null, "", "/acceso#access_token=tok123&type=magiclink");
    const f = fetchFalso({ ...base, "/api/sesion/verificar": { body: { ok: true, usuario: "yo@example.com" } } });
    global.fetch = f;
    const alCambiar = jest.fn();
    render(<Pagina ruta="/acceso" {...props} alCambiarSesion={alCambiar} />);
    await waitFor(() => expect(alCambiar).toHaveBeenCalled());
    const llamada = f.mock.calls.find(([r]) => String(r) === "/api/sesion/verificar");
    expect(JSON.parse(String((llamada?.[1] as RequestInit).body))).toEqual({ access_token: "tok123" });
    expect(window.location.href).not.toContain("tok123");
    expect(window.location.hash).toBe("#/noticias");
  });

  it("preguntar: un error del servidor se muestra sin romper la página", async () => {
    global.fetch = fetchFalso({ ...base, "/api/preguntar": { status: 500, body: { error: "Error interno. Revisa los logs del servidor." } } });
    render(<Pagina ruta="/preguntar" {...props} />);
    fireEvent.change(screen.getByLabelText("Tu pregunta"), { target: { value: "¿Qué pasó con BTC?" } });
    fireEvent.click(screen.getByRole("button", { name: "Preguntar" }));
    expect(await screen.findByText(/Error interno/)).toBeInTheDocument();
    expect(ErrorApi).toBeDefined();
  });
});
