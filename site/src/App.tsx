import { useEffect, useState, type ReactNode } from "react";
import { api, type Estado, type Sesion } from "./lib/api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PaginaInicio } from "./pages/PaginaInicio";
import { PaginaNoticias } from "./pages/PaginaNoticias";
import { PaginaTickers } from "./pages/PaginaTickers";
import { PaginaTicker } from "./pages/PaginaTicker";
import { PaginaPreguntar } from "./pages/PaginaPreguntar";
import { PaginaTesis } from "./pages/PaginaTesis";
import { PaginaMetodologia } from "./pages/PaginaMetodologia";
import { PaginaEstado } from "./pages/PaginaEstado";
import { PaginaAcceso, tokenEnLaUrl } from "./pages/PaginaAcceso";

export const NAV = [
  { href: "#/", label: "Home" },
  { href: "#/news", label: "News" },
  { href: "#/tickers", label: "Tickers" },
  { href: "#/ask", label: "Ask" },
  { href: "#/thesis", label: "Thesis" },
  { href: "#/methodology", label: "Methodology" },
  { href: "#/status", label: "Status" },
];

// Supabase returns the magic link to /acceso or /login#access_token=…; that fragment is not a hash route and is handled in PaginaAcceso.
const leerRuta = () => (tokenEnLaUrl() ? "/login" : window.location.hash.replace(/^#/, "") || "/");

export function useRuta(): string {
  const [ruta, setRuta] = useState(leerRuta);
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leerRuta());
      const reducido = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reducido ? "auto" : "smooth" });
    };
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);
  return ruta;
}

type Props = { estado: Estado | null; sesion: Sesion | null; alCambiarSesion: () => void };

export function Pagina({ ruta, ...p }: Props & { ruta: string }): ReactNode {
  const ticker = /^\/tickers\/([^/]+)$/.exec(ruta);
  if (ticker) return <PaginaTicker ticker={decodeURIComponent(ticker[1] ?? "")} />;
  const tesis = /^\/thesis(?:\/(\w+))?(?:\/(\w+))?$/.exec(ruta);
  if (tesis) return <PaginaTesis seccion={tesis[1] ?? "summary"} agente={tesis[2]} />;
  switch (ruta) {
    case "/news": return <PaginaNoticias />;
    case "/tickers": return <PaginaTickers />;
    case "/ask": return <PaginaPreguntar estado={p.estado} />;
    case "/methodology": return <PaginaMetodologia />;
    case "/status": return <PaginaEstado estado={p.estado} sesion={p.sesion} />;
    case "/login": return <PaginaAcceso sesion={p.sesion} alCambiarSesion={p.alCambiarSesion} />;
    default: return <PaginaInicio estado={p.estado} />;
  }
}

export function BannerDemo({ estado }: { estado: Estado | null }) {
  if (!estado?.demo) return null;
  return (
    <div className="mock-banner" role="status">
      DEMO DATA · The news you see is fictional. Connect Supabase or Notion to see yours: <a href="#/status">what&apos;s missing?</a>
    </div>
  );
}

function BotonSesion({ sesion, alSalir }: { sesion: Sesion | null; alSalir: () => void }) {
  if (!sesion || sesion.politica === "abierto" || sesion.politica === "abierto-local") return null;
  if (sesion.usuario) {
    return (
      <button type="button" className="enlace-boton sesion-boton" onClick={alSalir} title={`Signed in as ${sesion.usuario}`}>
        Sign out
      </button>
    );
  }
  return <a className="sesion-boton" href="#/login">Sign in</a>;
}

export function App() {
  const ruta = useRuta();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const mundo = ruta === "/";

  useEffect(() => {
    api.estado().then(setEstado, () => setEstado(null));
    api.sesion().then(setSesion, () => setSesion(null));
  }, [vuelta]);

  const salir = () => {
    void api.salir().finally(() => setVuelta((v) => v + 1));
  };

  return (
    <div className={`shell ${mundo ? "is-world" : ""}`}>
      <a className="saltar" href="#contenido">Skip to content</a>
      <BannerDemo estado={estado} />
      {!mundo && (
        <header className="topbar">
          <a href="#/" className="brand">ubitwo</a>
          <nav aria-label="Main">
            {NAV.map((n) => {
              const activa = n.href === "#/" ? ruta === "/" : `#${ruta}`.startsWith(n.href);
              return (
                <a key={n.href} href={n.href} aria-current={activa ? "page" : undefined}>
                  {n.label}
                </a>
              );
            })}
            <BotonSesion sesion={sesion} alSalir={salir} />
          </nav>
        </header>
      )}
      <main id="contenido">
        <ErrorBoundary key={ruta} label="Page">
          <Pagina ruta={ruta} estado={estado} sesion={sesion} alCambiarSesion={() => setVuelta((v) => v + 1)} />
        </ErrorBoundary>
      </main>
      {!mundo && (
        <footer>
          <span>ubitwo {estado ? `· ${estado.version} · source: ${estado.fuente}` : ""}</span>
          <span>This is not financial advice.</span>
        </footer>
      )}
    </div>
  );
}
