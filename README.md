# relaygw

A self-hostable **LLM gateway**. It exposes an OpenAI-compatible API and routes
requests to multiple upstream providers (OpenAI, Anthropic, …) behind one
unified interface, with API-key management, usage/cost metering, prepaid
billing, rate limiting, and fallback routing.

This is a **clean-room, original implementation** written from first principles
and the providers' own public API docs. See `docs/DESIGN.md` for the full design.

## What works today

- **OpenAI-compatible surface**: `POST /v1/chat/completions`, buffered and
  streaming (SSE), with an OpenAI-shaped canonical representation internally.
- **Providers**: OpenAI (near-passthrough) and Anthropic (full translation of
  the `/v1/messages` shape and typed event stream → canonical chunks).
- **Routing**: logical model → ordered provider candidates, with fallback on
  transient failures, per-provider circuit breaking, and explicit-only
  cross-provider fallback. Fallback happens only before the first streamed byte.
- **Auth**: gateway API keys hashed with HMAC-SHA-256 (+ server pepper);
  dashboard users with bcrypt passwords; stateless signed session tokens.
- **Provider credentials**: encrypted at rest with AES-256-GCM (`key_version`
  for rotation); never logged.
- **Rate limiting**: Redis token bucket via an atomic Lua script (per org).
- **Metering**: async, off the response path; per-request tokens/cost/latency,
  provider-reported usage with a heuristic fallback flagged `estimated`.
- **Billing**: prepaid balance in micro-USD integers, hard cutoff at zero;
  payments stubbed behind an interface (no live secrets in code).
- **Management API**: login, API keys, provider credentials, model registry,
  usage aggregation, balance/invoices — all org-scoped from the session.
- **Dashboard**: a decoupled Notion-style Next.js app in `dashboard/`.

## Quickstart (Docker)

```bash
cp .env.example .env          # dev defaults; change secrets for real use
make dev                      # postgres + redis + gateway (runs migrate + seed)
```

The gateway listens on `:8080`. Seeded dashboard login: `admin@example.com` /
`changeme`, with a $10 starting balance.

## Quickstart (local Go)

```bash
cp .env.example .env
make infra                    # just postgres + redis in Docker
make setup                    # migrate + seed
make run                      # go run ./cmd/gateway
```

> If a native Postgres already owns `localhost:5432`, drop a
> `docker-compose.override.yml` remapping the port (e.g. `5433:5432`) and point
> `DATABASE_URL` at it — no need to stop your local Postgres.

### Try it

```bash
# 1. log in -> session token
TOKEN=$(curl -s localhost:8080/api/auth/login -d '{"email":"admin@example.com","password":"changeme"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# 2. add an upstream credential (your real OpenAI key)
curl -s localhost:8080/api/credentials -H "Authorization: Bearer $TOKEN" \
  -d '{"provider":"openai","apiKey":"sk-..."}'

# 3. mint a gateway API key (plaintext shown once)
KEY=$(curl -s localhost:8080/api/keys -H "Authorization: Bearer $TOKEN" -d '{"name":"dev"}' \
  | sed -n 's/.*"plaintext":"\([^"]*\)".*/\1/p')

# 4. call it like OpenAI
curl -sN localhost:8080/v1/chat/completions -H "Authorization: Bearer $KEY" \
  -d '{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"hi"}]}'
```

## Commands

| Command | Description |
|---|---|
| `make run` | Run the gateway locally |
| `make build` | Build `bin/gateway`, `bin/migrate`, `bin/seed` |
| `make test` | `go test -race ./...` |
| `make lint` | `go vet` (+ golangci-lint if installed) |
| `make migrate-up` / `migrate-down` | Apply / roll back migrations |
| `make seed` | Seed demo org, admin user, models, balance |
| `make infra` | Start only Postgres + Redis |
| `make dev` | Full stack in Docker |
| `make setup` | infra + migrate + seed |

## Project layout

```
cmd/gateway        server entrypoint (graceful shutdown)
cmd/migrate        migration runner (goose, embedded SQL)
cmd/seed           demo data
internal/config    env config + startup validation
internal/llm       canonical types + Provider interface
  llm/openai       OpenAI adapter
  llm/anthropic    Anthropic adapter (translation + stream state machine)
internal/sse       SSE reader
internal/router    registry, fallback dispatch, circuit breaker
internal/auth      API-key + session auth middleware
internal/cryptox   HMAC key hashing, bcrypt, AES-GCM
internal/store     Postgres repositories (pgx, no ORM)
internal/ratelimit Redis token-bucket limiter
internal/usage     async metering writer
internal/billing   cost math + prepaid rules + payment stub
internal/gateway   /v1 chat handler (buffered + streaming)
internal/api       management/dashboard JSON API
internal/server    wiring, middleware, health/readiness
migrations         goose SQL migrations (embedded)
dashboard          Notion-style Next.js frontend (decoupled)
docs/DESIGN.md     design document
```

## Testing

`make test` runs the unit suite (config validation, crypto round-trips, SSE
parsing, both provider adapters against mocked upstreams, router fallback +
circuit breaker, billing math, session tokens, and the lossless async recorder)
with the race detector.

## Security notes

- API keys and provider credentials are never stored or logged in plaintext.
- Every management endpoint derives the org from the authenticated session,
  never from the request body.
- Config is validated at startup; missing/invalid secrets fail fast.
- No `panic` in request paths; graceful shutdown drains the metering buffer.
