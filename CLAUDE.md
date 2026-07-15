# CLAUDE.md

This file gives Claude Code the persistent context it needs to work on this project. Keep it short, accurate, and updated as the project evolves.

## Project

**Name:** relaygw
**What it is:** A self-hostable LLM gateway. It exposes an OpenAI-compatible API and routes requests to multiple upstream providers (OpenAI, Anthropic, Google, etc.) behind one unified interface, with API-key management, usage/cost metering, rate limiting, fallback routing, and a billing dashboard.

**This is a clean-room, original implementation.** We do not copy code from any existing project. We may read public docs (OpenAI/Anthropic API specs, provider docs) and reason about general architecture, but all code here is written from scratch and owned by us. Do not paste, port, or lightly-edit code from other repositories.

**Reference-use boundary (decided):** The existing `llmgateway` (TypeScript) project may be consulted at the **behavior/spec level only** — to understand *what* a gateway does, and to confirm provider behaviors — never to copy code, file layout, naming, or structure. All code here is written from first principles + official provider docs.

## Stack

- **Gateway core:** Go (latest stable). Standard library `net/http` for the server; avoid heavy frameworks. Use `chi` for routing only if it earns its place.
- **Data:** PostgreSQL (accounts, API keys, usage records, billing). Redis (rate-limit counters, response/route caching).
- **Migrations:** `goose` or `golang-migrate` — pick one and stay consistent.
- **Frontend/dashboard:** separate service, built later. Do not couple it to the core.
- **Config:** environment variables, validated at startup. No secrets in code or git.

## Conventions

- Idiomatic Go: `gofmt`, `go vet`, `golangci-lint` must pass. Errors are wrapped with context, never swallowed.
- Every exported type/function has a doc comment.
- Providers implement a shared `Provider` interface so adding one is additive, never a rewrite.
- Streaming (SSE) is a first-class path, not an afterthought — test it explicitly.
- API keys are stored **hashed** (never plaintext). Provider credentials are encrypted at rest.
- No `panic` in request paths. Graceful shutdown on SIGTERM.

## Commands

```
make run          # run the gateway locally
make test         # go test ./... with race detector
make lint         # golangci-lint run
make migrate-up   # apply DB migrations
make dev          # docker-compose up (postgres + redis + gateway)
```

(Define these in the Makefile as you build them out.)

## Working style for Claude Code

- Work in small, reviewable increments — one phase / one PR-sized chunk at a time. Stop and let me review before moving on.
- Write the test alongside the code, not after.
- When a design decision has real tradeoffs, surface 2–3 options with a recommendation rather than silently picking.
- Never introduce a dependency without noting why the stdlib isn't enough.
- If you're unsure how an upstream provider behaves, say so — don't guess at their wire format. We verify against their real docs.
