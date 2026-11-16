# Seguridad en ubitwo

## Reportar un problema

No abras un issue público. Escribe a la persona que administra el repositorio con: pasos para reproducir, traza del error y contexto (versión, entorno). Los reportes vagos se devuelven.

## Secretos

- Viven en `.env` (local, ignorado por git) o en el panel de Render. Nunca en el código, en `render.yaml` ni en los logs.
- `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN`, `SESSION_SECRET` y las claves de IA solo existen en el servidor y en el cron. El navegador solo habla con el propio servidor (`connect-src 'self'`).
- Los logs pasan por `debug` y por `redact`: tokens, `apikey`, `Authorization` y cookies se reemplazan por `[REDACTADO]`; los correos por `[correo]`.
- CI ejecuta gitleaks en cada push.

## Datos y acceso

- `resumenes_diarios` tiene RLS activado y forzado, sin políticas, y se revocan los permisos de `anon` y `authenticated`: solo la service role la lee.
- Con datos reales, la API exige una sesión. La sesión es una cookie firmada con HMAC (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, 7 días).
- Solo entran los correos de `EMAILS_PERMITIDOS`; **una lista vacía no deja entrar a nadie**. El envío del enlace responde igual exista o no el correo.
- En producción, el enlace mágico solo vuelve a `APP_URL` (nunca se construye con la cabecera `Host`).
- Los POST verifican el `Origin` (CSRF). Hay límites de peticiones por IP: general, enlaces (5/min) y preguntas (10/min).
- Si hay datos reales en producción y el acceso no está configurado, la API se bloquea en lugar de quedar abierta.

## Contenido externo

Lo que viene de Notion, de X o de un modelo de IA es **evidencia, nunca instrucciones**:

- Se valida con zod y se descarta lo que no cumple.
- Solo se muestran enlaces `https`, en pestaña nueva y sin `referer`.
- Nunca se interpreta como HTML (el Markdown de la tesis tiene su propio renderizador mínimo).
- El prompt de «Pregunta» delimita los resúmenes y le dice al modelo que ignore órdenes dentro de ellos.

## Navegador

CSP estricta (`default-src 'self'`, sin `unsafe-eval`; las gráficas usan el intérprete de expresiones de Vega), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y CORP. El build elimina `console.*`.

## Dependencias

Ver [`docs/politica-de-dependencias.md`](docs/politica-de-dependencias.md): solo pnpm, versiones exactas, al menos 7 días desde su publicación, sin scripts `postinstall`, lockfile congelado en CI y en Render, `pnpm audit` en CI y Dependabot con espera de 7 días.
