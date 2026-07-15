// Command seed inserts a demo organization, an admin dashboard user, a starting
// prepaid balance, and a small model registry. It is idempotent.
package main

import (
	"context"
	"errors"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nossulenko/heimdal/internal/cryptox"
)

const (
	demoOrgName  = "Demo Org"
	demoEmail    = "admin@example.com"
	demoPassword = "changeme"
	startBalance = 10_000_000 // $10.00 in micro-USD
)

type modelSeed struct {
	logical  string
	provider string
	modelID  string
	inPrice  float64
	outPrice float64
	priority int
}

// Prices are USD per token (published $/M divided by 1e6). Illustrative demo
// catalog — operators adjust to current provider pricing.
var seedModels = []modelSeed{
	{"gpt-4o-mini", "openai", "gpt-4o-mini", 0.15e-6, 0.60e-6, 0},
	{"gpt-4o", "openai", "gpt-4o", 2.50e-6, 10.00e-6, 0},
	{"gpt-4.1-mini", "openai", "gpt-4.1-mini", 0.40e-6, 1.60e-6, 0},
	{"claude-3-5-haiku", "anthropic", "claude-3-5-haiku-latest", 0.80e-6, 4.00e-6, 0},
	{"claude-sonnet-4-5", "anthropic", "claude-sonnet-4-5", 3.00e-6, 15.00e-6, 0},
	{"gemini-2.5-flash", "google", "gemini-2.5-flash", 0.30e-6, 2.50e-6, 0},
	{"gemini-2.5-pro", "google", "gemini-2.5-pro", 1.25e-6, 10.00e-6, 0},
	// A logical "auto" model spanning providers (explicit candidates, priority
	// order). Combine with the "x-route: cost" header to pick the cheapest.
	{"auto", "openai", "gpt-4o-mini", 0.15e-6, 0.60e-6, 0},
	{"auto", "google", "gemini-2.5-flash", 0.30e-6, 2.50e-6, 1},
	{"auto", "anthropic", "claude-3-5-haiku-latest", 0.80e-6, 4.00e-6, 2},
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	var orgID string
	err = pool.QueryRow(ctx, `SELECT id FROM organizations WHERE name = $1`, demoOrgName).Scan(&orgID)
	if errors.Is(err, pgx.ErrNoRows) {
		if err = pool.QueryRow(ctx, `INSERT INTO organizations (name) VALUES ($1) RETURNING id`, demoOrgName).Scan(&orgID); err != nil {
			log.Fatalf("insert org: %v", err)
		}
	} else if err != nil {
		log.Fatalf("select org: %v", err)
	}

	hash, err := cryptox.HashPassword(demoPassword)
	if err != nil {
		log.Fatalf("hash password: %v", err)
	}
	if _, err = pool.Exec(ctx,
		`INSERT INTO users (org_id, email, password_hash) VALUES ($1, $2, $3)
		 ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
		orgID, demoEmail, hash); err != nil {
		log.Fatalf("upsert user: %v", err)
	}

	if _, err = pool.Exec(ctx,
		`INSERT INTO balances (org_id, amount_micro_usd) VALUES ($1, $2)
		 ON CONFLICT (org_id) DO NOTHING`,
		orgID, startBalance); err != nil {
		log.Fatalf("seed balance: %v", err)
	}

	for _, m := range seedModels {
		if _, err = pool.Exec(ctx,
			`INSERT INTO models (logical_name, provider, provider_model_id, input_price_per_token, output_price_per_token, priority, active)
			 VALUES ($1, $2, $3, $4, $5, $6, true)
			 ON CONFLICT (logical_name, provider, provider_model_id)
			 DO UPDATE SET input_price_per_token = EXCLUDED.input_price_per_token,
			               output_price_per_token = EXCLUDED.output_price_per_token,
			               priority = EXCLUDED.priority,
			               active = true`,
			m.logical, m.provider, m.modelID, m.inPrice, m.outPrice, m.priority); err != nil {
			log.Fatalf("seed model %s: %v", m.logical, err)
		}
	}

	log.Printf("seeded org %q (%s)", demoOrgName, orgID)
	log.Printf("dashboard login: %s / %s", demoEmail, demoPassword)
	log.Printf("starting balance: $%.2f", float64(startBalance)/1_000_000)
	log.Printf("add a provider credential (real OpenAI/Anthropic key) via the dashboard to make live calls")
}
