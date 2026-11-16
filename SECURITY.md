# Security in ubitwo

## Report a problem

Do not open a public issue. Write to the person who administers the repository with: steps to reproduce, the error trace, and context (version, environment). Vague reports are returned.

## Secrets

- Live in `.env` (local, gitignored) or in the Render dashboard. Never in code, in `render.yaml`, or in logs.
- `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN`, `SESSION_SECRET`, and AI keys exist only on the server and in the cron. The browser talks only to the same-origin server (`connect-src 'self'`).
- Logs go through `debug` and `redact`: tokens, `apikey`, `Authorization`, and cookies become `[REDACTED]`; emails become `[email]`.
- CI runs gitleaks on every push.

## Data and access

- `resumenes_diarios` has RLS enabled and forced, with no policies, and privileges for `anon` and `authenticated` are revoked: only the service role can read it.
- With real data, the API requires a session. The session is an HMAC-signed cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production, 7 days).
- Only emails in `EMAILS_PERMITIDOS` can sign in; **an empty list lets nobody in**. The magic-link send response looks the same whether the email exists or not.
- In production, the magic link only returns to `APP_URL` (never built from the `Host` header).
- POSTs check `Origin` (CSRF). There are per-IP rate limits: general, links (5/min), and questions (10/min).
- If there is real data in production and access is not configured, the API blocks instead of staying open.

## External content

Anything from Notion, X, or an AI model is **evidence, never instructions**:

- Validated with zod; anything that fails is discarded.
- Only `https` links are shown, in a new tab, without `referer`.
- Never interpreted as HTML (thesis Markdown has its own minimal renderer).
- The Ask prompt delimits digests and tells the model to ignore orders inside them.

## Browser

Strict CSP (`default-src 'self'`, no `unsafe-eval`; charts use Vega's expression interpreter), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, and CORP. The build strips `console.*`.

## Dependencies

See [`docs/politica-de-dependencias.md`](docs/politica-de-dependencias.md): pnpm only, exact versions, at least 7 days since publish, no `postinstall` scripts, frozen lockfile in CI and on Render, `pnpm audit` in CI, and Dependabot with a 7-day wait.
