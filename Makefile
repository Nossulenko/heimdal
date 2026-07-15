.DEFAULT_GOAL := help

# Load .env if present so `make run` etc. see the config.
ifneq (,$(wildcard ./.env))
include .env
export
endif

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.PHONY: run
run: ## Run the gateway locally
	go run ./cmd/gateway

.PHONY: build
build: ## Build binaries into ./bin
	go build -o bin/gateway ./cmd/gateway
	go build -o bin/migrate ./cmd/migrate
	go build -o bin/seed ./cmd/seed

.PHONY: test
test: ## Run tests with the race detector
	go test -race ./...

.PHONY: lint
lint: ## Run golangci-lint (if installed) plus go vet
	go vet ./...
	@command -v golangci-lint >/dev/null 2>&1 && golangci-lint run || echo "golangci-lint not installed; ran go vet only"

.PHONY: fmt
fmt: ## Format all Go code
	gofmt -w .

.PHONY: migrate-up
migrate-up: ## Apply database migrations
	go run ./cmd/migrate up

.PHONY: migrate-down
migrate-down: ## Roll back the last migration
	go run ./cmd/migrate down

.PHONY: seed
seed: ## Seed demo data (org, admin user, models, balance)
	go run ./cmd/seed

.PHONY: infra
infra: ## Start only Postgres + Redis
	docker compose up -d postgres redis

.PHONY: dev
dev: ## Start the full stack (Postgres + Redis + gateway) in Docker
	docker compose up --build

.PHONY: setup
setup: infra ## Start infra, apply migrations, and seed
	@echo "waiting for postgres..."; sleep 3
	$(MAKE) migrate-up
	$(MAKE) seed
