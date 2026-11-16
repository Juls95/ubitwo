/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import embed from "vega-embed";
import { App, BannerDemo, leerRuta, Pagina } from "./App";
import { crearDemo } from "../../src/noticias/demo";
import { Chart } from "./components/Chart";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BarraAcuerdo, InsigniaPostura } from "./components/Comunes";
import { TarjetaActivo } from "./components/TarjetaActivo";
import { api, ErrorApi, pedir, Estado as EsquemaEstado, type Estado } from "./lib/api";
import { Markdown } from "./lib/markdown";
import { parsearTesis, reiniciarCacheTesis, type Tesis } from "./lib/tesis";
import { safeHref } from "./lib/safe-url";
import { filtrarActivos } from "./pages/PaginaNoticias";
import { pasosDeConexion } from "./pages/PaginaEstado";
import { errorDeEnlace, tokenEnLaUrl } from "./pages/PaginaAcceso";

jest.mock("vega-embed", () => ({ __esModule: true, default: jest.fn().mockResolvedValue({ finalize: jest.fn() }) }));

const registros = crearDemo(new Date("2026-11-16T12:00:00Z"));
const [hoy] = registros;
if (!hoy) throw new Error("demo must have at least one day");

const estado: Estado = {
  version: "test",
  fuente: "demo",
  demo: true,
  notion: false,
  ia: { disponible: false, proveedor: "gemini" },
  conexiones: { supabase: false, acceso: false, notion: false, ia: false, app_url: false },
};

const agente = (id: "oso" | "bisonte" | "toro", status: "pass" | "warn" | "fail" = "pass") => ({
  id, name: id[0]?.toUpperCase() + id.slice(1), role: `role of ${id}`, does: ["does something"], inputs: ["input"], outputs: ["output"],
  runs: [{ at: "2026-11-09", summary: "run", details: { rows: 3 } }],
  validations: [{ name: "check", status, detail: "detail" }],
});

const tesis: Tesis = {
  mode: "mock",
  generated_at: "2026-11-09T06:00:00.000Z",
  thesis_md: "# Thesis\n\n## 1. Claim\n\n**Key** text.",
  hypothesis_verdict: "supported by current data",
  regime: "expansion",
  stance: "constructive on direction; timing not confirmed",
  technical_bias: "neutral",
  desk: null,
  metrics: {},
  charts: [{ id: "daa", title: "Daily active accounts", agent: "bisonte", query_file: "q.sql", endpoint: null, query_sql: "SELECT 1", sentence: "Plain sentence.", spec: {} }],
  divergences: [{ week: "2026-W44", from: "2026-10-26", reconstructed: true, sentiment_index: 0.7, sentiment_delta: 0.5, onchain_change_pct: -8, quadrant: "mirage" }],
  spikes: [],
  oso: { weeks: [], latest_posts: [], discard_reasons: { not_in_citations: 2 }, notion: null },
  agents: [agente("oso", "warn"), agente("bisonte"), agente("toro")],
};

type Respuestas = Record<string, { status?: number; body: unknown }>;

/** jsdom has no fetch: this stub responds by path prefix and records each call. */
function fetchFalso(respuestas: Respuestas) {
  return jest.fn(async (entrada: RequestInfo | URL, _init?: RequestInit) => {
    const ruta = String(entrada);
    const clave = Object.keys(respuestas).filter((k) => ruta.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    const r = clave ? respuestas[clave] : { status: 404, body: { error: "Route not found" } };
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

describe("API client", () => {
  it("validates the response with zod and explains errors in English", async () => {
    await expect(api.estado()).resolves.toMatchObject({ demo: true });
    global.fetch = fetchFalso({ "/api/estado": { body: { version: 1 } } });
    await expect(api.estado()).rejects.toThrow(/Unexpected response/);
    global.fetch = fetchFalso({ "/api/tickers": { status: 401, body: { error: "Sign in to view the data" } } });
    await expect(api.tickers()).rejects.toMatchObject({ status: 401, message: "Sign in to view the data" });
  });

  it("turns a network failure into an ErrorApi with status 0", async () => {
    const caido = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(pedir("/api/estado", EsquemaEstado, { fetchImpl: caido })).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/No connection/) });
  });
});

describe("thesis and utilities", () => {
  it("rejects a bundle with non-https links", () => {
    expect(() => parsearTesis(tesis)).not.toThrow();
    const malo = { ...tesis, oso: { ...tesis.oso, latest_posts: [{ url: "javascript:alert(1)" }] } };
    expect(() => parsearTesis(malo)).toThrow(/invalid/);
  });

  it("safeHref only allows https", () => {
    expect(safeHref("https://x.com/a")).toBe("https://x.com/a");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("http://x.com")).toBeUndefined();
  });

  it("Markdown never interprets HTML", () => {
    const { container } = render(<Markdown source={"# Title\n\n<img src=x onerror=alert(1)>"} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
  });

  it("filters assets by stance and type", () => {
    const todos = filtrarActivos(hoy, { postura: "todas", tipo: "todos" });
    const cripto = filtrarActivos(hoy, { postura: "todas", tipo: "cripto" });
    expect(cripto.length).toBeGreaterThan(0);
    expect(cripto.every((a) => a.tipo === "cripto")).toBe(true);
    expect(todos.length).toBe(hoy.resumen.activos.length);
  });

  it("lists pending connections without exposing values", () => {
    const pasos = pasosDeConexion(estado);
    expect(pasos.map((p) => p.id)).toEqual(["supabase", "notion", "acceso", "app_url", "ia"]);
    expect(pasos.every((p) => !p.listo)).toBe(true);
  });

  it("only recognizes the magic-link token on /acceso or /login", () => {
    window.history.replaceState(null, "", "/#access_token=abc");
    expect(tokenEnLaUrl()).toBeNull();
    window.history.replaceState(null, "", "/acceso#access_token=abc&type=magiclink");
    expect(tokenEnLaUrl()).toBe("abc");
    window.history.replaceState(null, "", "/login#access_token=xyz&type=magiclink");
    expect(tokenEnLaUrl()).toBe("xyz");
    window.history.replaceState(null, "", "/login#/news");
    expect(tokenEnLaUrl()).toBeNull();
  });

  it("treats hashless /login and an expired link as sign-in", () => {
    window.history.replaceState(null, "", "/login");
    expect(leerRuta()).toBe("/login");
    expect(tokenEnLaUrl()).toBeNull();
    expect(errorDeEnlace()).toBeNull();
    window.history.replaceState(null, "", "/acceso");
    expect(leerRuta()).toBe("/login");
    window.history.replaceState(null, "", "/login#error=access_denied&error_code=otp_expired");
    expect(leerRuta()).toBe("/login");
    expect(errorDeEnlace()).toMatch(/expired/);
    window.history.replaceState(null, "", "/login#/news");
    expect(leerRuta()).toBe("/news");
    window.history.replaceState(null, "", "/#/login");
    expect(leerRuta()).toBe("/login");
    window.history.replaceState(null, "", "/");
    expect(leerRuta()).toBe("/");
  });
});

describe("components", () => {
  it("stance badge is stable", () => {
    const { container } = render(<InsigniaPostura postura="alcista" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("agreement bar describes the split in text", () => {
    render(<BarraAcuerdo alcista={3} neutral={1} bajista={0} />);
    expect(screen.getByRole("img", { name: "3 bullish, 1 neutral, 0 bearish" })).toBeInTheDocument();
  });

  it("asset card shows evidence on demand and links only https", () => {
    const activo = hoy.resumen.activos.find((a) => a.evidencias.length > 0);
    if (!activo) throw new Error("demo must have evidence");
    render(<TarjetaActivo activo={activo} />);
    expect(screen.getByRole("link", { name: activo.ticker })).toHaveAttribute("href", `#/tickers/${encodeURIComponent(activo.ticker)}`);
    fireEvent.click(screen.getByRole("button", { name: /Show \d+ evidence/ }));
    for (const a of screen.getAllByRole("link").filter((l) => l.getAttribute("target") === "_blank")) {
      expect(a.getAttribute("href")).toMatch(/^https:/);
      expect(a).toHaveAttribute("rel", "noreferrer noopener");
    }
  });

  it("ErrorBoundary isolates a failing view and emits ubitwo:error", () => {
    const escucha = jest.fn();
    window.addEventListener("ubitwo:error", escucha);
    const Falla = () => {
      throw new Error("boom");
    };
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary label="Chart">
        <Falla />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Chart: could not be displayed.");
    expect(escucha).toHaveBeenCalled();
    window.removeEventListener("ubitwo:error", escucha);
  });

  it("demo banner only appears with fictional data", () => {
    const { rerender } = render(<BannerDemo estado={estado} />);
    expect(screen.getByRole("status")).toHaveTextContent(/DEMO DATA/);
    rerender(<BannerDemo estado={{ ...estado, demo: false, fuente: "supabase" }} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("pages", () => {
  const props = { estado, sesion: null, alCambiarSesion: () => undefined };

  it("home: shows the day's bias and links to news", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: /agora/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See today's news" })).toHaveAttribute("href", "#/news");
    await waitFor(() => expect(screen.getByText(hoy.resumen.contexto)).toBeInTheDocument());
  });

  it("news: switches days with tabs and searches", async () => {
    global.fetch = fetchFalso({ ...base, "/api/buscar": { body: { consulta: "btc", resultados: [{ fecha: "2026-11-16", ticker: "BTC", texto: "BTC breaks highs", url: "https://example.com/x", cuenta: "@demo_mercados" }] } } });
    render(<Pagina ruta="/news" {...props} />);
    const pestanas = await screen.findAllByRole("tab");
    expect(pestanas).toHaveLength(registros.length);
    expect(pestanas[0]).toHaveAttribute("aria-selected", "true");
    const segundo = pestanas[1];
    if (!segundo) throw new Error("expected two days");
    fireEvent.click(segundo);
    expect(segundo).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: registros[1]?.resumen.titulo })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "btc" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("BTC breaks highs")).toHaveAttribute("href", "https://example.com/x");
  });

  it("news: if session is missing, invites to sign in", async () => {
    global.fetch = fetchFalso({ ...base, "/api/resumenes": { status: 401, body: { error: "Sign in to view the data" } } });
    render(<Pagina ruta="/news" {...props} />);
    expect(await screen.findByText("You need to sign in.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "#/login");
  });

  it("thesis: shows the verdict and agents with their dossiers", async () => {
    const { unmount } = render(<Pagina ruta="/thesis" {...props} />);
    expect(await screen.findByText("supported by current data")).toBeInTheDocument();
    expect(screen.getByText(/Thesis with simulated data/)).toBeInTheDocument();
    unmount();
    render(<Pagina ruta="/thesis/agents" {...props} />);
    expect(await screen.findByRole("link", { name: "Bear's dossier →" })).toHaveAttribute("href", "#/thesis/agents/oso");
    expect(screen.getByText("mirage")).toBeInTheDocument();
  });

  it("status: lists what still needs connecting", () => {
    render(<Pagina ruta="/status" {...props} />);
    expect(screen.getByText(/0 of 5 connections ready/)).toBeInTheDocument();
    expect(screen.getByText("Database (Supabase)")).toBeInTheDocument();
  });

  it("login: explains when email is not configured yet", () => {
    render(<Pagina ruta="/login" {...props} sesion={{ politica: "abierto-local", usuario: null, acceso_configurado: false }} />);
    expect(screen.getByText(/not configured on this server yet/)).toBeInTheDocument();
  });

  it("login: /login without a token shows sign-in, not the agora", async () => {
    window.history.replaceState(null, "", "/login");
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: /agora/ })).not.toBeInTheDocument();
  });

  it("login: an expired magic link explains the failure", () => {
    window.history.replaceState(null, "", "/login#error=access_denied&error_code=otp_expired");
    render(<Pagina ruta="/login" {...props} />);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid or has expired/);
  });

  it("chart: finalizes a vega view that resolves after unmount", async () => {
    const finalize = jest.fn();
    let resolveEmbed: (value: { finalize: () => void }) => void = () => undefined;
    const embedMock = embed as unknown as jest.Mock;
    embedMock.mockImplementation(
      () =>
        new Promise<{ finalize: () => void }>((resolve) => {
          resolveEmbed = resolve;
        }),
    );
    const chart = tesis.charts[0];
    if (!chart) throw new Error("missing chart");
    const { unmount } = render(<Chart chart={chart} />);
    await waitFor(() => expect(embedMock).toHaveBeenCalled());
    unmount();
    resolveEmbed({ finalize });
    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    embedMock.mockResolvedValue({ finalize: jest.fn() });
  });

  it("login: redeems the link token and clears it from the URL", async () => {
    window.history.replaceState(null, "", "/acceso#access_token=tok123&type=magiclink");
    const f = fetchFalso({ ...base, "/api/sesion/verificar": { body: { ok: true, usuario: "me@example.com" } } });
    global.fetch = f;
    const alCambiar = jest.fn();
    render(<Pagina ruta="/login" {...props} alCambiarSesion={alCambiar} />);
    await waitFor(() => expect(alCambiar).toHaveBeenCalled());
    const llamada = f.mock.calls.find(([r]) => String(r) === "/api/sesion/verificar");
    expect(JSON.parse(String((llamada?.[1] as RequestInit).body))).toEqual({ access_token: "tok123" });
    expect(window.location.href).not.toContain("tok123");
    expect(window.location.hash).toBe("#/news");
  });

  it("ask: a server error is shown without breaking the page", async () => {
    global.fetch = fetchFalso({ ...base, "/api/preguntar": { status: 500, body: { error: "Internal error. Check the server logs." } } });
    render(<Pagina ruta="/ask" {...props} />);
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "What happened with BTC?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText(/Internal error/)).toBeInTheDocument();
    expect(ErrorApi).toBeDefined();
  });
});
