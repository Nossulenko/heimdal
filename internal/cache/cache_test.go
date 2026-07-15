package cache

import (
	"testing"
	"time"

	"github.com/nossulenko/heimdal/internal/llm"
)

func req(model, content string) *llm.ChatRequest {
	return &llm.ChatRequest{Model: model, Messages: []llm.Message{{Role: llm.RoleUser, Content: content}}}
}

func TestKeyDeterministic(t *testing.T) {
	k1 := Key("org1", req("gpt-4o-mini", "hi"))
	k2 := Key("org1", req("gpt-4o-mini", "hi"))
	if k1 != k2 {
		t.Error("key is not deterministic for identical inputs")
	}
	if Key("org2", req("gpt-4o-mini", "hi")) == k1 {
		t.Error("different orgs must not share a cache key")
	}
	if Key("org1", req("gpt-4o-mini", "bye")) == k1 {
		t.Error("different content must not share a cache key")
	}
	if Key("org1", req("claude-3-5-haiku", "hi")) == k1 {
		t.Error("different model must not share a cache key")
	}
}

func TestEnabled(t *testing.T) {
	if New(nil, 0).Enabled() {
		t.Error("zero TTL should be disabled")
	}
	if !New(nil, time.Minute).Enabled() {
		t.Error("positive TTL should be enabled")
	}
	var nilCache *ResponseCache
	if nilCache.Enabled() {
		t.Error("nil cache should be disabled")
	}
}
