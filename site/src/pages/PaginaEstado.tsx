import type { Estado, Sesion } from "../lib/api";

type Paso = { id: string; titulo: string; listo: boolean; para: string; como: string };

const POLITICA: Record<Sesion["politica"], string> = {
  abierto: "Open: anyone with the link can see the desk.",
  "abierto-local": "Open only because it is running on your machine. When published, it will require sign-in.",
  sesion: "Private: only authorized emails can enter.",
  bloqueado: "Blocked: access is not configured, so nobody can see the data.",
};

export function pasosDeConexion(estado: Estado): Paso[] {
  const c = estado.conexiones ?? { supabase: false, acceso: false, notion: estado.notion, ia: estado.ia.disponible, app_url: false };
  return [
    { id: "supabase", titulo: "Database (Supabase)", listo: c.supabase, para: "Store digests and share them between the server and sync.", como: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and apply supabase/migrations/0001_noticias.sql." },
    { id: "notion", titulo: "News (Notion)", listo: c.notion, para: "Pull the daily digest the bot writes.", como: "NOTION_TOKEN and NOTION_DB_RESUMENES; share the database with your Notion integration." },
    { id: "acceso", titulo: "Sign-in", listo: c.acceso, para: "So only you (and whoever you authorize) can see the published desk.", como: "SUPABASE_ANON_KEY, SESSION_SECRET (32+ characters), and EMAILS_PERMITIDOS." },
    { id: "app_url", titulo: "Public URL", listo: c.app_url, para: "So the magic link returns to your site.", como: "APP_URL with the Render URL, also in Supabase → Auth → URL Configuration." },
    { id: "ia", titulo: "AI (Gemini)", listo: c.ia, para: "Written answers on Ask. Without AI, ubitwo replies with fragments.", como: "GEMINI_API_KEY and LLM_MODEL (changing the model means changing that variable)." },
  ];
}

export function PaginaEstado({ estado, sesion }: { estado: Estado | null; sesion: Sesion | null }) {
  if (!estado) {
    return (
      <section className="page">
        <h1>Status</h1>
        <div className="error-box" role="alert">No connection to the server. If you are on your machine, run <code>pnpm dev</code> or <code>pnpm start</code>.</div>
      </section>
    );
  }
  const pasos = pasosDeConexion(estado);
  const listos = pasos.filter((p) => p.listo).length;
  return (
    <section className="page">
      <header className="page-head">
        <span className="eyebrow">Status</span>
        <h1>What is connected</h1>
        <p>{listos === pasos.length ? "All set." : `${listos} of ${pasos.length} connections ready. ubitwo still works with what is missing: it uses demo data or answers without AI.`}</p>
      </header>

      <div className="stat-row">
        <div className="stat"><span>News source</span><strong>{estado.fuente === "demo" ? "demo" : estado.fuente}</strong></div>
        <div className="stat"><span>Version</span><strong>{estado.version}</strong></div>
        <div className="stat"><span>AI</span><strong>{estado.ia.disponible ? estado.ia.proveedor : "no AI"}</strong></div>
      </div>

      {sesion ? <p className="aviso">{POLITICA[sesion.politica]}{sesion.usuario ? ` Signed in as ${sesion.usuario}.` : ""}</p> : null}

      <ol className="checklist">
        {pasos.map((p) => (
          <li key={p.id} className={p.listo ? "listo" : "falta"}>
            <span className="check" aria-hidden="true">{p.listo ? "✓" : "○"}</span>
            <div>
              <strong>{p.titulo}</strong> <span className="muted">{p.listo ? "· connected" : "· missing"}</span>
              <p>{p.para}</p>
              {!p.listo ? <p className="muted">Configure: {p.como}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="muted">The step-by-step guide is in <code>docs/conectar-render-notion-supabase.md</code>. This page only shows whether something is configured; it never shows values.</p>
    </section>
  );
}
