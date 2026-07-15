# relaygw dashboard

A decoupled, Notion-inspired dashboard for the **relaygw** self-hostable LLM gateway.
Built with Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query, recharts,
and lucide-react.

## Requirements

- Node.js 22+
- pnpm

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional — sensible defaults are used otherwise
pnpm dev                     # http://localhost:3000
```

Build and run in production mode:

```bash
pnpm build
pnpm start
```

## Environment variables

| Variable                 | Default                 | Description                                                                 |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`    | `http://localhost:8080` | Base URL of the relaygw Go backend.                                         |
| `NEXT_PUBLIC_USE_MOCKS`  | `false`                 | When `true`, all data comes from an in-memory mock — no backend required.   |

Both are `NEXT_PUBLIC_*` values, so they are read in the browser and inlined at build time.

## Mock mode (standalone demo)

To run the UI without the backend:

```bash
NEXT_PUBLIC_USE_MOCKS=true pnpm dev
```

In mock mode any email + password logs you in, and every page renders realistic sample
data (keys, models, usage charts, provider keys, balance). Creating/revoking keys and
adding/removing provider keys mutate the in-memory store so the flows feel real.

## Auth model

- `POST /api/auth/login` returns `{ token, org }`.
- The token is stored in a cookie (`relaygw_token`, SSR-friendly) **and** mirrored in
  memory, and sent as `Authorization: Bearer <token>` on every management request.
- A client-side guard redirects unauthenticated visitors to `/login`; logging out clears
  the cookie.

## Resilience

The app builds and renders **without the backend running**. Unreachable-API and `401`
responses surface as tasteful empty/error states rather than crashes. `pnpm build`
succeeds with no backend and no environment configured.

## Money formatting

All monetary values from the API are micro-USD integers (divide by 1,000,000 for USD).
Costs render as USD with up to 4 decimals; model prices are shown per **1M tokens**
(`pricePerToken × 1e6`).

## Structure

```
src/
  app/
    layout.tsx            Root layout + TanStack Query provider
    login/                Email + password sign-in
    (dashboard)/          Authenticated shell (sidebar + guard)
      page.tsx            Overview
      keys/               API keys
      usage/              Usage charts + per-model breakdown
      models/             Model registry (read-only)
      credentials/        Provider keys (write-only secrets)
      billing/            Balance + statement (payments stubbed)
  components/             Sidebar, page header, charts, states, UI primitives
  lib/                    Typed API client, mocks, hooks, auth, formatting
```

## Pages

- **Overview** `/` — balance, 30-day spend and tokens, daily-cost chart, top models.
- **API Keys** `/keys` — list, create (plaintext shown once in a copyable modal), revoke.
- **Usage** `/usage` — 7/30/90-day presets, cost + token charts, per-model table.
- **Models** `/models` — read-only registry with per-1M-token pricing.
- **Provider Keys** `/credentials` — masked list, add (provider + secret), delete.
- **Billing** `/billing` — balance, statement placeholder, disabled "Add funds".
