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
  { href: "#/", label: "Inicio" },
  { href: "#/noticias", label: "Noticias" },
  { href: "#/tickers", label: "Tickers" },
  { href: "#/preguntar", label: "Pregunta" },
  { href: "#/tesis", label: "Tesis" },
  { href: "#/metodologia", label: "Metodología" },
  { href: "#/estado", label: "Estado" },
];

// Supabase devuelve el enlace mágico a /acceso#access_token=…; ese fragmento no es una ruta hash y se atiende en PaginaAcceso.
const leerRuta = () => (tokenEnLaUrl() ? "/acceso" : window.location.hash.replace(/^#/, "") || "/");

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
  const tesis = /^\/tesis(?:\/(\w+))?(?:\/(\w+))?$/.exec(ruta);
  if (tesis) return <PaginaTesis seccion={tesis[1] ?? "resumen"} agente={tesis[2]} />;
  switch (ruta) {
    case "/noticias": return <PaginaNoticias />;
    case "/tickers": return <PaginaTickers />;
    case "/preguntar": return <PaginaPreguntar estado={p.estado} />;
    case "/metodologia": return <PaginaMetodologia />;
    case "/estado": return <PaginaEstado estado={p.estado} sesion={p.sesion} />;
    case "/acceso": return <PaginaAcceso sesion={p.sesion} alCambiarSesion={p.alCambiarSesion} />;
    default: return <PaginaInicio estado={p.estado} />;
  }
}

export function BannerDemo({ estado }: { estado: Estado | null }) {
  if (!estado?.demo) return null;
  return (
    <div className="mock-banner" role="status">
      DATOS DE DEMOSTRACIÓN · Las noticias que ves son ficticias. Conecta Supabase o Notion para ver las tuyas: <a href="#/estado">¿qué falta?</a>
    </div>
  );
}

function BotonSesion({ sesion, alSalir }: { sesion: Sesion | null; alSalir: () => void }) {
  if (!sesion || sesion.politica === "abierto" || sesion.politica === "abierto-local") return null;
  if (sesion.usuario) {
    return (
      <button type="button" className="enlace-boton sesion-boton" onClick={alSalir} title={`Sesión: ${sesion.usuario}`}>
        Salir
      </button>
    );
  }
  return <a className="sesion-boton" href="#/acceso">Entrar</a>;
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
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <BannerDemo estado={estado} />
      {!mundo && (
        <header className="topbar">
          <a href="#/" className="brand">ubitwo</a>
          <nav aria-label="Principal">
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
        <ErrorBoundary key={ruta} label="Página">
          <Pagina ruta={ruta} estado={estado} sesion={sesion} alCambiarSesion={() => setVuelta((v) => v + 1)} />
        </ErrorBoundary>
      </main>
      {!mundo && (
        <footer>
          <span>ubitwo {estado ? `· ${estado.version} · fuente: ${estado.fuente}` : ""}</span>
          <span>Esto no es asesoría financiera.</span>
        </footer>
      )}
    </div>
  );
}
