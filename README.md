# ubitwo

Your market-news desk and an investment thesis that accounts for itself.

- **News.** Each day a bot writes a Notion digest of what the accounts you follow are saying. ubitwo syncs it to Supabase and shows it by day, asset, and stance, with linked evidence. You can search and ask questions.
- **Thesis.** Three agents stress-test a hypothesis with reproducible data: **Bear** reads Notion and X, **Bison** queries on-chain data, and **Bull** crosses both readings and writes the thesis. No figure is typed by hand.

## Start in a minute

Requirements: Node 22 and pnpm 10 (`corepack enable`).

```bash
pnpm install --frozen-lockfile
pnpm demo            # builds the site and opens it at http://localhost:3000 with demo data
```

For hot reload during development, use two terminals:

```bash
pnpm dev:server      # API on :3000
pnpm dev             # site on :5173 (proxies /api to the server)
```

## Connect your data

Everything is optional and ubitwo tells you what is missing:

```bash
cp .env.example .env
pnpm check-env
```

The step-by-step guide for **Supabase, Notion, and Render** is in [`docs/conectar-render-notion-supabase.md`](docs/conectar-render-notion-supabase.md). On the site, the **Status** page shows the same.

## Pages

| Page | What you see |
| --- | --- |
| Home | The day's bias, context, and highlighted assets. |
| News | Day tabs, stance and type filters, evidence cards, and search. |
| Tickers | Everything mentioned and each ticker's history. |
| Ask | Natural-language questions over the saved digests. |
| Thesis | Verdict, charts, social reading, and each agent's dossier. |
| Methodology | Sources, pre-registered parameters, and limits. |
| Status | What is connected (never values). |

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm demo` | Build and serve with demo data. |
| `pnpm build` / `pnpm start` | Build (thesis + site) and serve. |
| `pnpm noticias:sync --dias 30` | Pull digests from Notion into Supabase. |
| `pnpm tesis:refresh` | Live thesis data (needs credentials) and regenerate. |
| `pnpm tesis:verificar` | Check that the thesis has no hand-typed figures. |
| `pnpm check` | Lint (warnings = errors), types, and tests. |
| `pnpm check-env` | Which features are active with your variables. |

## Architecture

```text
Notion (daily bot) ──noticias:sync──▶ Supabase (resumenes_diarios, RLS)
                                             │ service role (server only)
browser ──/api──▶ node:http server ──────────┘
   ▲                 │  signed session (Supabase Auth, magic link)
   └── dist/ ◀── vite build ◀── thesis (Bear · Bison · Bull) ──▶ tesis.json
```

- `src/noticias`: digest schema (zod), normalization, demo, repository (Supabase/local/memory), and sync.
- `src/server`: API, statics, security headers, rate limits, access, and Ask.
- `src/llm`: swappable AI layer (Gemini by default; changing models = changing `LLM_MODEL`).
- `src/tesis`: the three-agent pipeline.
- `site/`: the UI (React + Vite).

## Security

Read [`SECURITY.md`](SECURITY.md) and [`docs/politica-de-dependencias.md`](docs/politica-de-dependencias.md). In short: exact versions at least 7 days old, no install scripts, secrets only on the server, external content treated as evidence never as instructions.

This is not financial advice.
