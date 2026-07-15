// Package cache implements a Redis-backed response cache for non-streaming
// completions. It is keyed on the org plus the canonical request, so identical
// deterministic requests can be served without an upstream call. Caching is
// gated by a TTL (zero disables it) and is applied only to deterministic
// requests (temperature 0 or unset) by the caller.
package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/nossulenko/heimdal/internal/llm"
)

// ResponseCache stores completions in Redis.
type ResponseCache struct {
	rdb *redis.Client
	ttl time.Duration
}

// New returns a response cache. A non-positive ttl leaves it disabled.
func New(rdb *redis.Client, ttl time.Duration) *ResponseCache {
	return &ResponseCache{rdb: rdb, ttl: ttl}
}

// Enabled reports whether caching is active.
func (c *ResponseCache) Enabled() bool { return c != nil && c.ttl > 0 }

// keyPayload is the subset of a request that defines a cache identity.
type keyPayload struct {
	Org         string        `json:"org"`
	Model       string        `json:"model"`
	Messages    []llm.Message `json:"messages"`
	MaxTokens   *int          `json:"max_tokens"`
	Temperature *float64      `json:"temperature"`
}

// Key derives the cache key for an org + request. Struct field order is fixed,
// so the JSON (and therefore the hash) is deterministic.
func Key(orgID string, req *llm.ChatRequest) string {
	payload, _ := json.Marshal(keyPayload{
		Org:         orgID,
		Model:       req.Model,
		Messages:    req.Messages,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
	})
	sum := sha256.Sum256(payload)
	return "cache:" + hex.EncodeToString(sum[:])
}

// Get returns a cached response and true on a hit.
func (c *ResponseCache) Get(ctx context.Context, key string) (*llm.ChatResponse, bool, error) {
	raw, err := c.rdb.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	var resp llm.ChatResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, false, err
	}
	return &resp, true, nil
}

// Set stores a response under the key with the configured TTL.
func (c *ResponseCache) Set(ctx context.Context, key string, resp *llm.ChatResponse) error {
	raw, err := json.Marshal(resp)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, raw, c.ttl).Err()
}
