// Package config loads and validates all runtime configuration from the
// environment at startup. Invalid or missing required values cause a fast,
// explicit failure rather than a surprise later in a request path.
package config

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the fully-validated runtime configuration.
type Config struct {
	Env              string
	Addr             string
	DatabaseURL      string
	RedisURL         string
	APIKeyPepper     []byte
	EncryptionKey    []byte
	EncryptionKeyVer int
	SessionSecret    []byte
	OpenAIBaseURL    string
	AnthropicBaseURL string
	GoogleBaseURL    string
	LogLevel         slog.Level
	CORSOrigins      []string
	RequestTimeout   time.Duration
	ShutdownTimeout  time.Duration
	CacheTTL         time.Duration
}

// Load reads configuration from the environment and validates it. All
// validation errors are collected and returned together.
func Load() (*Config, error) {
	var errs []string
	req := func(key string) string {
		v := os.Getenv(key)
		if v == "" {
			errs = append(errs, fmt.Sprintf("%s is required", key))
		}
		return v
	}
	opt := func(key, def string) string {
		if v := os.Getenv(key); v != "" {
			return v
		}
		return def
	}

	c := &Config{
		Env:              opt("ENV", "development"),
		Addr:             opt("ADDR", ":8080"),
		DatabaseURL:      req("DATABASE_URL"),
		RedisURL:         opt("REDIS_URL", "redis://localhost:6379/0"),
		OpenAIBaseURL:    os.Getenv("OPENAI_BASE_URL"),
		AnthropicBaseURL: os.Getenv("ANTHROPIC_BASE_URL"),
		GoogleBaseURL:    os.Getenv("GOOGLE_BASE_URL"),
		CORSOrigins:      splitCSV(opt("CORS_ORIGINS", "http://localhost:3000")),
		RequestTimeout:   durationEnv("REQUEST_TIMEOUT", 120*time.Second, &errs),
		ShutdownTimeout:  durationEnv("SHUTDOWN_TIMEOUT", 15*time.Second, &errs),
		CacheTTL:         durationEnv("CACHE_TTL", 0, &errs),
	}

	if pepper := req("API_KEY_PEPPER"); pepper != "" {
		if len(pepper) < 16 {
			errs = append(errs, "API_KEY_PEPPER must be at least 16 characters")
		}
		c.APIKeyPepper = []byte(pepper)
	}

	if secret := req("SESSION_SECRET"); secret != "" {
		if len(secret) < 16 {
			errs = append(errs, "SESSION_SECRET must be at least 16 characters")
		}
		c.SessionSecret = []byte(secret)
	}

	if raw := req("ENCRYPTION_KEY"); raw != "" {
		key, err := decodeKey(raw)
		if err != nil {
			errs = append(errs, fmt.Sprintf("ENCRYPTION_KEY invalid: %v", err))
		} else {
			c.EncryptionKey = key
		}
	}
	c.EncryptionKeyVer = intEnv("ENCRYPTION_KEY_VERSION", 1)

	c.LogLevel = parseLevel(opt("LOG_LEVEL", "info"))

	if len(errs) > 0 {
		return nil, fmt.Errorf("config: %s", strings.Join(errs, "; "))
	}
	return c, nil
}

// decodeKey accepts a 32-byte key encoded as either 64 hex characters or
// standard base64.
func decodeKey(raw string) ([]byte, error) {
	if len(raw) == 64 {
		if b, err := hex.DecodeString(raw); err == nil && len(b) == 32 {
			return b, nil
		}
	}
	if b, err := base64.StdEncoding.DecodeString(raw); err == nil && len(b) == 32 {
		return b, nil
	}
	return nil, fmt.Errorf("must decode (hex or base64) to exactly 32 bytes")
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func intEnv(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func durationEnv(key string, def time.Duration, errs *[]string) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		*errs = append(*errs, fmt.Sprintf("%s invalid duration: %v", key, err))
		return def
	}
	return d
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
