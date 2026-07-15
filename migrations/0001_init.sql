-- +goose Up
CREATE TABLE organizations (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name         text NOT NULL,
    key_hash     text NOT NULL UNIQUE,
    key_prefix   text NOT NULL,
    last_used_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    revoked_at   timestamptz
);
CREATE INDEX idx_api_keys_org ON api_keys(org_id);

CREATE TABLE provider_credentials (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid REFERENCES organizations(id) ON DELETE CASCADE,
    provider    text NOT NULL,
    ciphertext  bytea NOT NULL,
    nonce       bytea NOT NULL,
    key_version int NOT NULL DEFAULT 1,
    created_at  timestamptz NOT NULL DEFAULT now(),
    revoked_at  timestamptz
);
CREATE INDEX idx_provider_credentials_lookup ON provider_credentials(provider, org_id) WHERE revoked_at IS NULL;

CREATE TABLE models (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    logical_name           text NOT NULL,
    provider               text NOT NULL,
    provider_model_id      text NOT NULL,
    input_price_per_token  double precision NOT NULL DEFAULT 0,
    output_price_per_token double precision NOT NULL DEFAULT 0,
    priority               int NOT NULL DEFAULT 0,
    active                 boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (logical_name, provider, provider_model_id)
);
CREATE INDEX idx_models_active ON models(logical_name, priority) WHERE active;

CREATE TABLE usage_records (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    api_key_id        uuid REFERENCES api_keys(id) ON DELETE SET NULL,
    logical_model     text NOT NULL,
    provider          text NOT NULL,
    prompt_tokens     int NOT NULL DEFAULT 0,
    completion_tokens int NOT NULL DEFAULT 0,
    cost_micro_usd    bigint NOT NULL DEFAULT 0,
    latency_ms        int NOT NULL DEFAULT 0,
    status            text NOT NULL DEFAULT 'success',
    estimated         boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_org_time ON usage_records(org_id, created_at);
CREATE INDEX idx_usage_org_model_time ON usage_records(org_id, logical_model, created_at);

CREATE TABLE balances (
    org_id           uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    amount_micro_usd bigint NOT NULL DEFAULT 0,
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start     timestamptz NOT NULL,
    period_end       timestamptz NOT NULL,
    amount_micro_usd bigint NOT NULL DEFAULT 0,
    status           text NOT NULL DEFAULT 'open',
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_org ON invoices(org_id);

-- +goose Down
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS balances;
DROP TABLE IF EXISTS usage_records;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS provider_credentials;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
