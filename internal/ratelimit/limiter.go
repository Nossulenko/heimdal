// Package ratelimit implements a Redis-backed token-bucket limiter. The
// check-and-consume is done in a single Lua script so it is atomic across
// concurrent gateway instances.
package ratelimit

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// tokenBucketScript refills the bucket based on elapsed time, then consumes one
// token if available. Returns {allowed, remaining, retryAfterMs}.
var tokenBucketScript = redis.NewScript(`
local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])
local refill    = tonumber(ARGV[2])
local now       = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(bucket[1])
local ts     = tonumber(bucket[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

local delta = math.max(0, now - ts) / 1000.0
tokens = math.min(capacity, tokens + delta * refill)

local allowed = 0
if tokens >= requested then
  allowed = 1
  tokens = tokens - requested
end

redis.call('HSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, math.ceil(capacity / refill * 1000) + 1000)

local retry = 0
if allowed == 0 then
  retry = math.ceil((requested - tokens) / refill * 1000)
end
return {allowed, math.floor(tokens), retry}
`)

// Limiter enforces a token-bucket policy per key.
type Limiter struct {
	rdb          *redis.Client
	capacity     int
	refillPerSec float64
}

// Result is the outcome of an Allow check.
type Result struct {
	Allowed    bool
	Limit      int
	Remaining  int
	RetryAfter time.Duration
}

// New builds a limiter. capacity is the bucket size (burst); refillPerSec is
// the sustained rate.
func New(rdb *redis.Client, capacity int, refillPerSec float64) *Limiter {
	if capacity <= 0 {
		capacity = 60
	}
	if refillPerSec <= 0 {
		refillPerSec = 1
	}
	return &Limiter{rdb: rdb, capacity: capacity, refillPerSec: refillPerSec}
}

// Allow consumes one token for key, returning whether the request may proceed
// plus rate-limit metadata for response headers.
func (l *Limiter) Allow(ctx context.Context, key string) (Result, error) {
	now := time.Now().UnixMilli()
	res, err := tokenBucketScript.Run(ctx, l.rdb, []string{"rl:" + key},
		l.capacity, l.refillPerSec, now, 1).Int64Slice()
	if err != nil {
		return Result{}, err
	}
	return Result{
		Allowed:    res[0] == 1,
		Limit:      l.capacity,
		Remaining:  int(res[1]),
		RetryAfter: time.Duration(res[2]) * time.Millisecond,
	}, nil
}
