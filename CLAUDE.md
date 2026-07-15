# CLAUDE.md

This file gives Claude Code the persistent context it needs to work on this project. Keep it short, accurate, and updated as the project evolves.

## Project

**Name:** Heimdal
**What it is:** A self-hostable LLM gateway. It exposes an OpenAI-compatible API and routes requests to multiple upstream providers (OpenAI, Anthropic, Google, etc.) behind one unified interface, with API-key management, usage/cost metering, rate limiting, fallback routing, and a billing dashboard.

**This is a clean-room, original implementation.** We do not copy code from any existing project. We may read public docs (OpenAI/Anthropic API specs, provider docs) and reason about general architecture, but all code here is written from scratch and owned by us. Do not paste, port, or lightly-edit code from other repositories.

**Reference-use boundary (decided):** The existing `llmgateway` (TypeScript) project may be consulted at the **behavior/spec level only** — to understand *what* a gateway does, and to confirm provider behaviors — never to copy code, file layout, naming, or structure. All code here is written from first principles + official provider docs.

## Stack

- **Gateway core:** Go (latest stable). Standard library `net/http` for the server; `chi` for routing/middleware. Module path `github.com/nossulenko/heimdal`.
- **Data:** PostgreSQL (accounts, API keys, usage records, billing) via `pgx` (no ORM). Redis (rate-limit counters).
- **Migrations:** `goose` with embedded SQL.
- **Frontend/dashboard:** decoupled Next.js App Router app in `dashboard/`, styled with **MUI System** (`@mui/system`) and **MUI X Charts** (`@mui/x-charts`). Not coupled to the core.
- **Config:** environment variables, validated at startup. No secrets in code or git.

## Conventions

- Idiomatic Go: `gofmt`, `go vet` must pass. Errors are wrapped with context, never swallowed.
- Every exported type/function has a doc comment.
- Providers implement a shared `Provider` interface so adding one is additive, never a rewrite.
- Streaming (SSE) is a first-class path, not an afterthought — test it explicitly.
- API keys are stored **hashed** (HMAC-SHA-256 + pepper); provider credentials are encrypted at rest (AES-256-GCM). Never logged.
- No `panic` in request paths. Graceful shutdown on SIGTERM.

## Commands

```
make run          # run the gateway locally
make test         # go test ./... with race detector
make lint         # go vet (+ golangci-lint if installed)
make migrate-up   # apply DB migrations
make dev          # docker compose up (postgres + redis + gateway)
```

## Working style for Claude Code

- Work in small, reviewable increments. When a design decision has real tradeoffs, surface options with a recommendation rather than silently picking.
- Write the test alongside the code, not after.
- Never introduce a dependency without noting why the stdlib isn't enough.
- If you're unsure how an upstream provider behaves, check their official docs — never guess at a wire format.
