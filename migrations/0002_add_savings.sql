-- +goose Up
ALTER TABLE usage_records ADD COLUMN savings_micro_usd bigint NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE usage_records DROP COLUMN savings_micro_usd;
