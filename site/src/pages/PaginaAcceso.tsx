import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ErrorApi, type Sesion } from "../lib/api";

/** Token de Supabase en el fragmento de /acceso (flujo implícito del enlace mágico), o null. */
export function tokenEnLaUrl(): string | null {
  if (window.location.pathname !== "/acceso") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("access_token");
}

function irA(hash: string) {
  // Borra el token de la barra de direcciones y del historial antes de navegar.
  window.history.replaceState(null, "", `/${hash}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

type Props = { sesion: Sesion | null; alCambiarSesion: () => void };

export function PaginaAcceso({ sesion, alCambiarSesion }: Props) {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(() => tokenEnLaUrl() !== null);
  const verificado = useRef(false);

  useEffect(() => {
    const token = tokenEnLaUrl();
    if (!token || verificado.current) return;
    verificado.current = true;
    api.verificar(token).then(
      () => {
        alCambiarSesion();
        irA("#/noticias");
      },
      (e: unknown) => {
        setVerificando(false);
        setError(e instanceof ErrorApi ? e.message : "No se pudo verificar el enlace.");
        window.history.replaceState(null, "", "/#/acceso");
      },
    );
  }, [alCambiarSesion]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setMensaje(null);
    try {
      const r = await api.pedirEnlace(email.trim());
      setMensaje(r.mensaje);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo enviar el enlace.");
    } finally {
      setEnviando(false);
    }
  };

  if (verificando) {
    return (
      <section className="page acceso">
        <p className="boot" role="status"><span className="live-dot" /> Verificando tu enlace…</p>
      </section>
    );
  }

  return (
    <section className="page acceso">
      <header className="page-head">
        <h1>Entrar</h1>
        <p>Te enviamos un enlace a tu correo. Ábrelo en este mismo navegador y listo: no hay contraseñas.</p>
      </header>

      {sesion?.usuario ? (
        <div className="aviso" role="status">
          Ya entraste como <strong>{sesion.usuario}</strong>. <a href="#/noticias">Ir a las noticias →</a>
        </div>
      ) : null}

      {sesion && !sesion.acceso_configurado ? (
        <div className="aviso" role="status">
          El acceso con correo todavía no está configurado en este servidor. {sesion.politica === "abierto-local" ? "Mientras tanto, el panel está abierto porque corre en tu computadora." : null}{" "}
          <a href="#/estado">Ver qué falta</a>
        </div>
      ) : (
        <form className="formulario" onSubmit={enviar}>
          <label htmlFor="email">Tu correo</label>
          <input id="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          <button type="submit" className="cta" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviarme el enlace"}
          </button>
        </form>
      )}

      {mensaje ? <p className="ok-box" role="status">{mensaje}</p> : null}
      {error ? <p className="error-box" role="alert">{error}</p> : null}
      <p className="muted">Solo los correos autorizados por quien administra ubitwo pueden entrar. El enlace caduca en una hora.</p>
    </section>
  );
}
