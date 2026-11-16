import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ErrorApi, type Sesion } from "../lib/api";

/** Supabase token in the /acceso or /login fragment (implicit magic-link flow), or null. */
export function tokenEnLaUrl(): string | null {
  const path = window.location.pathname;
  if (path !== "/acceso" && path !== "/login") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("access_token");
}

function irA(hash: string) {
  // Clear the token from the address bar and history before navigating.
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
        irA("#/news");
      },
      (e: unknown) => {
        setVerificando(false);
        setError(e instanceof ErrorApi ? e.message : "Could not verify the link.");
        window.history.replaceState(null, "", "/#/login");
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
      setError(err instanceof ErrorApi ? err.message : "Could not send the link.");
    } finally {
      setEnviando(false);
    }
  };

  if (verificando) {
    return (
      <section className="page acceso">
        <p className="boot" role="status"><span className="live-dot" /> Verifying your link…</p>
      </section>
    );
  }

  return (
    <section className="page acceso">
      <header className="page-head">
        <h1>Sign in</h1>
        <p>We send a link to your email. Open it in this same browser and you are in: no passwords.</p>
      </header>

      {sesion?.usuario ? (
        <div className="aviso" role="status">
          You are signed in as <strong>{sesion.usuario}</strong>. <a href="#/news">Go to the news →</a>
        </div>
      ) : null}

      {sesion && !sesion.acceso_configurado ? (
        <div className="aviso" role="status">
          Email sign-in is not configured on this server yet. {sesion.politica === "abierto-local" ? "For now the desk is open because it is running on your machine." : null}{" "}
          <a href="#/status">See what is missing</a>
        </div>
      ) : (
        <form className="formulario" onSubmit={enviar}>
          <label htmlFor="email">Your email</label>
          <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button type="submit" className="cta" disabled={enviando}>
            {enviando ? "Sending…" : "Send me the link"}
          </button>
        </form>
      )}

      {mensaje ? <p className="ok-box" role="status">{mensaje}</p> : null}
      {error ? <p className="error-box" role="alert">{error}</p> : null}
      <p className="muted">Only emails authorized by whoever administers ubitwo can sign in. The link expires in one hour.</p>
    </section>
  );
}
