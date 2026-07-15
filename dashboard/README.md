# Heimdal dashboard

A decoupled, Notion-inspired dashboard for the **Heimdal** self-hostable LLM gateway.
Built with Next.js (App Router), TypeScript, TanStack Query, and **MUI** — using
[MUI System](https://mui.com/system/getting-started/) (`@mui/system`, the `sx` prop,
`styled()`, a custom `createTheme` + `ThemeProvider`, `CssBaseline`) for styling,
`@mui/material` for components, `@mui/icons-material` for icons, and
[`@mui/x-charts`](https://mui.com/x/react-charts/) for all graphs.

There is no Tailwind — every color, spacing value, and component default is centralized
in the theme (`src/theme.ts`) and applied via the `sx` prop.

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

| Variable                | Default                 | Description                                                               |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8080` | Base URL of the Heimdal Go backend.                                       |
| `NEXT_PUBLIC_USE_MOCKS` | `false`                 | When `true`, all data comes from an in-memory mock — no backend required. |

Both are `NEXT_PUBLIC_*` values, so they are read in the browser and inlined at build time.

## Mock mode (standalone demo)

To run the UI without the backend:

```bash
NEXT_PUBLIC_USE_MOCKS=true pnpm dev
```

In mock mode any email + password logs you in, and every page renders realistic sample
data (keys, models, usage charts, provider keys, balance). Creating/revoking keys and
adding/removing provider keys mutate the in-memory store so the flows feel real.

## Styling: MUI System + a custom theme

- **Theme** (`src/theme.ts`) — a light, Notion-ish `createTheme`: near-white
  backgrounds (`#fafafa`/`#fff`), near-black text (`#1a1a1a`), a dark near-black primary
  (`#111`), subtle 1px dividers (`#e5e5e5`), 8px rounded corners, no heavy shadows
  (cards are `variant="outlined"`), and an Inter/system font stack. Component defaults
  (buttons, cards, tables, dialogs, inputs, sidebar list items) are overridden here so
  pages stay declarative.
- **SSR emotion cache** — MUI's styles are injected on the server via
  `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`, wrapped around
  `ThemeProvider` + `CssBaseline` in `src/app/layout.tsx`. `src/theme.ts` is a
  `"use client"` module so the theme crosses the server→client boundary as a client
  reference (no serialization of theme functions), and styles are inlined into the
  initial HTML — no flash of unstyled content.
- **Charts** — `@mui/x-charts` `LineChart` (daily cost) and stacked `BarChart` (daily
  prompt vs completion tokens).

## Auth model

- `POST /api/auth/login` returns `{ token, org }`.
- The token is stored in a cookie (SSR-friendly) **and** mirrored in memory, and sent as
  `Authorization: Bearer <token>` on every management request.
- A client-side guard redirects unauthenticated visitors to `/login`; logging out clears
  the cookie.

## Resilience

The app builds and renders **without the backend running**. Unreachable-API and `401`
responses surface as tasteful empty/error states rather than crashes. `pnpm build`
succeeds with no backend and no environment configured.

## Money formatting

All monetary values from the API are micro-USD integers (divide by 1,000,000 for USD).
Costs render as USD with up to 4 decimals; model prices are shown per **1M tokens**
(`pricePerToken × 1e6`). See `src/lib/format.ts`.

## Structure

```
src/
  theme.ts                Custom MUI theme (palette, typography, component defaults)
  app/
    layout.tsx            AppRouterCacheProvider + ThemeProvider + CssBaseline + Query provider
    providers.tsx         TanStack Query client
    globals.css           Minimal global CSS (full-height layout only)
    login/                Email + password sign-in
    (dashboard)/          Authenticated shell (sidebar + guard)
      page.tsx            Overview
      keys/               API keys
      usage/              Usage charts + per-model breakdown
      models/             Model registry (read-only)
      credentials/        Provider keys (write-only secrets)
      billing/            Balance + statement (payments stubbed)
  components/             Sidebar, page header, MUI X charts, states, stat card, dialogs
  lib/                    Typed API client, mocks, hooks, auth, formatting (unchanged data layer)
```

## Pages

- **Overview** `/` — balance, 30-day spend and tokens, daily-cost line chart, top models.
- **API Keys** `/keys` — list, create (plaintext shown once in a copyable dialog), revoke.
- **Usage** `/usage` — 7/30/90-day presets, cost + token charts, per-model table.
- **Models** `/models` — read-only registry with per-1M-token pricing.
- **Provider Keys** `/credentials` — masked list, add (provider + secret), delete.
- **Billing** `/billing` — balance, statement placeholder, disabled "Add funds".
