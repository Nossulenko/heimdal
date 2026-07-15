package config

import (
	"encoding/base64"
	"testing"
)

const validKey = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"

func setValid(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://localhost/heimdal")
	t.Setenv("API_KEY_PEPPER", "pepper-long-enough")
	t.Setenv("SESSION_SECRET", "session-long-enough")
	t.Setenv("ENCRYPTION_KEY", validKey)
}

func TestLoadValid(t *testing.T) {
	setValid(t)
	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected valid config, got %v", err)
	}
	if len(cfg.EncryptionKey) != 32 {
		t.Errorf("encryption key length = %d, want 32", len(cfg.EncryptionKey))
	}
	if cfg.Addr != ":8080" {
		t.Errorf("default addr = %q", cfg.Addr)
	}
}

func TestLoadMissingDatabaseURL(t *testing.T) {
	setValid(t)
	t.Setenv("DATABASE_URL", "")
	if _, err := Load(); err == nil {
		t.Error("expected error for missing DATABASE_URL")
	}
}

func TestLoadInvalidEncryptionKey(t *testing.T) {
	setValid(t)
	t.Setenv("ENCRYPTION_KEY", "too-short")
	if _, err := Load(); err == nil {
		t.Error("expected error for invalid ENCRYPTION_KEY")
	}
}

func TestLoadShortPepper(t *testing.T) {
	setValid(t)
	t.Setenv("API_KEY_PEPPER", "short")
	if _, err := Load(); err == nil {
		t.Error("expected error for short API_KEY_PEPPER")
	}
}

func TestDecodeKeyBase64(t *testing.T) {
	b64 := base64.StdEncoding.EncodeToString(make([]byte, 32))
	key, err := decodeKey(b64)
	if err != nil {
		t.Fatal(err)
	}
	if len(key) != 32 {
		t.Errorf("len = %d, want 32", len(key))
	}
}
