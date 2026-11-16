# Conectar ubitwo con Supabase, Notion y Render

ubitwo funciona sin nada de esto: sin variables arranca con noticias de demostración y la tesis simulada. Esta guía conecta tus datos reales en cuatro pasos. Al final, la página **Estado** del sitio (y `pnpm check-env` en tu computadora) debe mostrar todo con ✓.

> Nunca pegues un secreto en un archivo del repositorio, en un issue o en un chat. Van en `.env` (local) o en el panel de Render.

---

## 1. Supabase (base de datos e inicio de sesión)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **Crear la tabla.** Abre *SQL Editor*, pega el contenido de `supabase/migrations/0001_noticias.sql` y ejecútalo. Crea `resumenes_diarios` con RLS activado y sin políticas: nadie puede leerla con la clave pública; solo el servidor, con la service role.
3. **Copiar las claves.** En *Project Settings → API*:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY` (es pública; solo sirve para enviar el enlace mágico)
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: solo en el servidor y en el cron)
4. **Inicio de sesión con enlace mágico.** En *Authentication*:
   - *Sign In / Providers → Email*: activado. ubitwo solo deja entrar a los correos de `EMAILS_PERMITIDOS`, aunque alguien se registre por su cuenta en Supabase. Si además desactivas *Allow new users to sign up*, crea a cada persona a mano en *Authentication → Users → Add user*.
   - *URL Configuration*: `Site URL` = la URL de Render (paso 3). En *Redirect URLs* agrega `https://<tu-servicio>.onrender.com/acceso` y, para probar en local, `http://localhost:3000/acceso`.
5. Elige quién entra: `EMAILS_PERMITIDOS=tu@correo.com,otra@persona.com`. **Si la lista está vacía, nadie entra.**

## 2. Notion (de dónde salen las noticias)

1. En [notion.so/profile/integrations](https://www.notion.so/profile/integrations) crea una integración **interna** con permiso de solo lectura de contenido. Copia el token → `NOTION_TOKEN`.
2. Abre la base **Daily Market Digest** → menú `•••` → *Connections* → agrega tu integración. Su ID ya viene configurado: `NOTION_DB_RESUMENES=b9c8d51185c9473fb93ba810788cf536`.
3. Qué espera ubitwo de cada página (lo que ya escribe el bot):
   - Propiedades: título, `Fecha`, `Sesgo general` y `Estado` (las páginas en `pendiente` se omiten).
   - En el cuerpo, un bloque de código JSON con `"schema": "<algo>.digest.v1"`, el contexto y los activos. ubitwo lo valida y descarta lo que no cumpla.
4. Si varias personas escriben en la misma base, filtra por dueño: `NOTION_PROP_USUARIO=<nombre de la propiedad persona o correo>` y `NOTION_FILTRO_USUARIO=tu@correo.com`.
5. Para la tesis (opcional), comparte también **TickersInfo**, **X Creative Output** y **X Account Analyses** con la misma integración. Sus IDs están en `config/oso.notion.yaml`.

Prueba en local:

```bash
cp .env.example .env   # y llena SUPABASE_* y NOTION_TOKEN
pnpm check-env
pnpm noticias:sync --dias 30
```

Debe terminar con algo como `noticias:sync → supabase · leídas 30 · guardadas 30 …`.

## 3. Render (publicar)

1. Sube el repositorio a GitHub y en [dashboard.render.com](https://dashboard.render.com) elige **New → Blueprint** y selecciona el repo. Render lee `render.yaml` y crea:
   - **ubitwo** (servicio web): instala con el lockfile congelado, ejecuta `pnpm build` y luego `pnpm start`. Salud en `/healthz`.
   - **ubitwo-sync** (cron, cada hora): `pnpm noticias:sync --dias 3`.
2. Render te pedirá los valores marcados como secretos. Llénalos:

   | Variable | Servicio | Valor |
   | --- | --- | --- |
   | `SUPABASE_URL` | ambos | Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | ambos | service_role (secreta) |
   | `SUPABASE_ANON_KEY` | web | anon public |
   | `NOTION_TOKEN` | ambos | token de la integración |
   | `APP_URL` | web | `https://<tu-servicio>.onrender.com` |
   | `EMAILS_PERMITIDOS` | web | tus correos, separados por comas |
   | `GEMINI_API_KEY` | web | clave de Google AI Studio (opcional) |
   | `LLM_MODEL` | web | el modelo de Gemini que quieras usar (opcional) |
   | `NOTION_PROP_USUARIO`, `NOTION_FILTRO_USUARIO` | cron | solo si filtras por dueño |

   `SESSION_SECRET` lo genera Render solo. `NOTION_DB_RESUMENES` ya viene con su valor.
3. Cuando termine el primer deploy, copia la URL pública a `APP_URL` y a Supabase (*URL Configuration*, paso 1.4).
4. Ejecuta el cron una vez a mano (*ubitwo-sync → Trigger Run*) para cargar el historial: puedes cambiar temporalmente el comando a `pnpm noticias:sync --dias 90`.

> El plan *starter* es el mínimo que admite cron jobs. Si usas el plan gratuito para el web, el cron debe ir en un plan de pago o correr desde otro programador (GitHub Actions, por ejemplo) con las mismas variables.

## 4. IA (opcional)

«Pregunta» funciona sin IA: responde con los fragmentos más relevantes. Para respuestas redactadas:

- `GEMINI_API_KEY` y `LLM_MODEL` (Gemini es el proveedor por defecto).
- Cambiar de modelo es cambiar `LLM_MODEL`. Cambiar de proveedor: `LLM_PROVIDER=xai` + `XAI_API_KEY`.

## Comprobar

- En el sitio: **Estado** muestra cada conexión con ✓ o lo que falta (nunca muestra valores).
- En local: `pnpm check-env`.
- Si el sitio pide iniciar sesión y no te llega el correo: revisa que tu correo esté en `EMAILS_PERMITIDOS`, que `APP_URL` coincida con la URL real y que `/acceso` esté en las *Redirect URLs* de Supabase.

## Qué variable va dónde

| Variable | Navegador | Servidor web | Cron |
| --- | :-: | :-: | :-: |
| `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN`, `GEMINI_API_KEY`, `SESSION_SECRET` | nunca | sí | según el caso |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | no (el servidor hace de intermediario) | sí | `SUPABASE_URL` |

El navegador solo habla con tu servidor (`connect-src 'self'`); ninguna clave llega al bundle.
