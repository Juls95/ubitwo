# ubitwo

Tu panel de noticias de mercado y una tesis de inversión que rinde cuentas.

- **Noticias.** Cada día un bot escribe en Notion un resumen de lo que dicen las cuentas que sigues. ubitwo lo sincroniza con Supabase y lo muestra por día, por activo y por postura, con la evidencia enlazada. Puedes buscar y hacer preguntas.
- **Tesis.** Tres agentes ponen a prueba una hipótesis con datos reproducibles: **Oso** lee Notion y X, **Bisonte** consulta datos on-chain y **Toro** cruza ambas lecturas y escribe la tesis. Ninguna cifra se escribe a mano.

## Empezar en un minuto

Requisitos: Node 22 y pnpm 10 (`corepack enable`).

```bash
pnpm install --frozen-lockfile
pnpm demo            # construye el sitio y lo abre en http://localhost:3000 con datos de demostración
```

Para desarrollar con recarga en caliente, en dos terminales:

```bash
pnpm dev:server      # API en :3000
pnpm dev             # sitio en :5173 (reenvía /api al servidor)
```

## Conectar tus datos

Todo es opcional y ubitwo te dice qué falta:

```bash
cp .env.example .env
pnpm check-env
```

La guía paso a paso para **Supabase, Notion y Render** está en [`docs/conectar-render-notion-supabase.md`](docs/conectar-render-notion-supabase.md). En el sitio, la página **Estado** muestra lo mismo.

## Páginas

| Página | Qué ves |
| --- | --- |
| Inicio | El sesgo del día, el contexto y los activos destacados. |
| Noticias | Pestañas por día, filtros por postura y tipo, tarjetas con evidencia y buscador. |
| Tickers | Todo lo mencionado y el historial de cada ticker. |
| Pregunta | Preguntas en lenguaje natural sobre los resúmenes guardados. |
| Tesis | Veredicto, gráficas, lectura social y el expediente de cada agente. |
| Metodología | Fuentes, parámetros prerregistrados y límites. |
| Estado | Qué está conectado (sin mostrar valores). |

## Comandos

| Comando | Para qué |
| --- | --- |
| `pnpm demo` | Construir y servir con datos de demostración. |
| `pnpm build` / `pnpm start` | Construir (tesis + sitio) y servir. |
| `pnpm noticias:sync --dias 30` | Traer resúmenes de Notion a Supabase. |
| `pnpm tesis:refresh` | Datos reales de la tesis (requiere credenciales) y regenerarla. |
| `pnpm tesis:verificar` | Comprobar que la tesis no tiene cifras escritas a mano. |
| `pnpm check` | Lint (advertencias = errores), tipos y pruebas. |
| `pnpm check-env` | Qué funciones están activas con tus variables. |

## Arquitectura

```text
Notion (bot diario) ──noticias:sync──▶ Supabase (resumenes_diarios, RLS)
                                             │ service role (solo servidor)
navegador ──/api──▶ servidor node:http ──────┘
   ▲                 │  sesión firmada (Supabase Auth, enlace mágico)
   └── dist/ ◀── vite build ◀── tesis (Oso · Bisonte · Toro) ──▶ tesis.json
```

- `src/noticias`: esquema del resumen (zod), normalización, demo, repositorio (Supabase/local/memoria) y sincronización.
- `src/server`: API, estáticos, cabeceras de seguridad, límites de peticiones, acceso y preguntas.
- `src/llm`: capa de IA intercambiable (Gemini por defecto; cambiar de modelo = cambiar `LLM_MODEL`).
- `src/tesis`: el pipeline de los tres agentes.
- `site/`: la interfaz (React + Vite).

## Seguridad

Lee [`SEGURIDAD.md`](SEGURIDAD.md) y [`docs/politica-de-dependencias.md`](docs/politica-de-dependencias.md). En corto: versiones exactas con al menos 7 días de antigüedad, sin scripts de instalación, secretos solo en el servidor, contenido externo tratado como evidencia y nunca como instrucciones.

Esto no es asesoría financiera.
