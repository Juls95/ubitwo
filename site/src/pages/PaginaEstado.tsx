import type { Estado, Sesion } from "../lib/api";

type Paso = { id: string; titulo: string; listo: boolean; para: string; como: string };

const POLITICA: Record<Sesion["politica"], string> = {
  abierto: "Abierto: cualquiera con el enlace puede ver el panel.",
  "abierto-local": "Abierto solo porque corre en tu computadora. Publicado, pedirá iniciar sesión.",
  sesion: "Privado: solo entran los correos autorizados.",
  bloqueado: "Bloqueado: falta configurar el acceso, así que nadie puede ver los datos.",
};

export function pasosDeConexion(estado: Estado): Paso[] {
  const c = estado.conexiones ?? { supabase: false, acceso: false, notion: estado.notion, ia: estado.ia.disponible, app_url: false };
  return [
    { id: "supabase", titulo: "Base de datos (Supabase)", listo: c.supabase, para: "Guardar los resúmenes y compartirlos entre el servidor y la sincronización.", como: "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, y aplica supabase/migrations/0001_noticias.sql." },
    { id: "notion", titulo: "Noticias (Notion)", listo: c.notion, para: "Traer el resumen diario que escribe el bot.", como: "NOTION_TOKEN y NOTION_DB_RESUMENES; comparte la base con tu integración de Notion." },
    { id: "acceso", titulo: "Inicio de sesión", listo: c.acceso, para: "Que solo tú (y quien autorices) vea el panel publicado.", como: "SUPABASE_ANON_KEY, SESSION_SECRET (32+ caracteres) y EMAILS_PERMITIDOS." },
    { id: "app_url", titulo: "Dirección pública", listo: c.app_url, para: "Que el enlace mágico regrese a tu sitio.", como: "APP_URL con la URL de Render, también en Supabase → Auth → URL Configuration." },
    { id: "ia", titulo: "IA (Gemini)", listo: c.ia, para: "Respuestas redactadas en «Pregunta». Sin IA, ubitwo responde con fragmentos.", como: "GEMINI_API_KEY y LLM_MODEL (cambiar de modelo es cambiar esa variable)." },
  ];
}

export function PaginaEstado({ estado, sesion }: { estado: Estado | null; sesion: Sesion | null }) {
  if (!estado) {
    return (
      <section className="page">
        <h1>Estado</h1>
        <div className="error-box" role="alert">No hay conexión con el servidor. Si estás en tu computadora, ejecuta <code>pnpm dev</code> o <code>pnpm start</code>.</div>
      </section>
    );
  }
  const pasos = pasosDeConexion(estado);
  const listos = pasos.filter((p) => p.listo).length;
  return (
    <section className="page">
      <header className="page-head">
        <span className="eyebrow">Estado</span>
        <h1>Qué está conectado</h1>
        <p>{listos === pasos.length ? "Todo listo." : `${listos} de ${pasos.length} conexiones listas. ubitwo funciona igual con lo que falte: usa datos de demostración o responde sin IA.`}</p>
      </header>

      <div className="stat-row">
        <div className="stat"><span>Fuente de noticias</span><strong>{estado.fuente === "demo" ? "demostración" : estado.fuente}</strong></div>
        <div className="stat"><span>Versión</span><strong>{estado.version}</strong></div>
        <div className="stat"><span>IA</span><strong>{estado.ia.disponible ? estado.ia.proveedor : "sin IA"}</strong></div>
      </div>

      {sesion ? <p className="aviso">{POLITICA[sesion.politica]}{sesion.usuario ? ` Sesión: ${sesion.usuario}.` : ""}</p> : null}

      <ol className="checklist">
        {pasos.map((p) => (
          <li key={p.id} className={p.listo ? "listo" : "falta"}>
            <span className="check" aria-hidden="true">{p.listo ? "✓" : "○"}</span>
            <div>
              <strong>{p.titulo}</strong> <span className="muted">{p.listo ? "· conectado" : "· falta"}</span>
              <p>{p.para}</p>
              {!p.listo ? <p className="muted">Configura: {p.como}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="muted">La guía paso a paso está en <code>docs/conectar-render-notion-supabase.md</code>. Esta página solo muestra si algo está configurado; nunca muestra valores.</p>
    </section>
  );
}
