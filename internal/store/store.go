// Package store is the PostgreSQL persistence layer. It owns the connection
// pool and exposes typed repository methods; there is no ORM. All SQL uses
// snake_case columns.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a lookup matches no row.
var ErrNotFound = errors.New("store: not found")

// Store wraps a pgx connection pool.
type Store struct {
	pool *pgxpool.Pool
}

// New opens a connection pool to the given Postgres URL and verifies
// connectivity with a ping.
func New(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{pool: pool}, nil
}

// Close releases the pool.
func (s *Store) Close() { s.pool.Close() }

// Pool exposes the underlying pool for advanced callers (e.g. migrations).
func (s *Store) Pool() *pgxpool.Pool { return s.pool }

func norows(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// Organization is a top-level tenant.
type Organization struct {
	ID        string
	Name      string
	CreatedAt time.Time
}

// User is a dashboard login (not the request path).
type User struct {
	ID           string
	OrgID        string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

// APIKey is a gateway bearer credential. KeyHash is the HMAC of the plaintext.
type APIKey struct {
	ID         string
	OrgID      string
	Name       string
	KeyHash    string
	KeyPrefix  string
	LastUsedAt *time.Time
	CreatedAt  time.Time
	RevokedAt  *time.Time
}

// ProviderCredential is an encrypted upstream API key. OrgID is nil for a
// system-wide credential.
type ProviderCredential struct {
	ID         string
	OrgID      *string
	Provider   string
	Ciphertext []byte
	Nonce      []byte
	KeyVersion int
	CreatedAt  time.Time
	RevokedAt  *time.Time
}

// Model is a registry row mapping a logical name to a provider model + pricing.
// Prices are USD per token.
type Model struct {
	ID                  string
	LogicalName         string
	Provider            string
	ProviderModelID     string
	InputPricePerToken  float64
	OutputPricePerToken float64
	Priority            int
	Active              bool
	CreatedAt           time.Time
}

// UsageRecord is one metered request. Money is micro-USD.
type UsageRecord struct {
	ID               string
	OrgID            string
	APIKeyID         *string
	LogicalModel     string
	Provider         string
	PromptTokens     int
	CompletionTokens int
	CostMicroUSD     int64
	LatencyMS        int
	Status           string
	Estimated        bool
	CreatedAt        time.Time
}

// Balance is an org's prepaid balance in micro-USD.
type Balance struct {
	OrgID          string
	AmountMicroUSD int64
	UpdatedAt      time.Time
}

// Invoice is a period statement in micro-USD.
type Invoice struct {
	ID             string
	OrgID          string
	PeriodStart    time.Time
	PeriodEnd      time.Time
	AmountMicroUSD int64
	Status         string
	CreatedAt      time.Time
}
