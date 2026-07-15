package router

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/nossulenko/heimdal/internal/llm"
	"github.com/nossulenko/heimdal/internal/store"
)

type fakeProvider struct {
	name  string
	resp  *llm.ChatResponse
	err   error
	calls int
}

func (f *fakeProvider) Name() string { return f.name }
func (f *fakeProvider) Chat(ctx context.Context, apiKey string, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.resp, nil
}
func (f *fakeProvider) StreamChat(ctx context.Context, apiKey string, req *llm.ChatRequest) (llm.ChatStream, error) {
	f.calls++
	return nil, f.err
}

type fakeResolver struct {
	errs map[string]error
}

func (r fakeResolver) Resolve(ctx context.Context, orgID, provider string) (string, error) {
	if r.errs != nil {
		if e := r.errs[provider]; e != nil {
			return "", e
		}
	}
	return "key-" + provider, nil
}

func discardLog() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

func twoCandidateRegistry() *Registry {
	reg := NewRegistry()
	reg.Load([]store.Model{
		{LogicalName: "m", Provider: "a", ProviderModelID: "a-model", Priority: 0, Active: true},
		{LogicalName: "m", Provider: "b", ProviderModelID: "b-model", Priority: 1, Active: true},
	})
	return reg
}

func okResp() *llm.ChatResponse {
	return &llm.ChatResponse{ID: "x", Choices: []llm.Choice{{Message: llm.Message{Content: "ok"}}}}
}

func TestFallbackOnRetryable(t *testing.T) {
	a := &fakeProvider{name: "a", err: &llm.ProviderError{Provider: "a", Retryable: true, Message: "503"}}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{}, NewBreakers(5, time.Minute), discardLog())

	resp, route, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}})
	if err != nil {
		t.Fatal(err)
	}
	if route.Provider != "b" {
		t.Errorf("route provider = %q, want b", route.Provider)
	}
	if resp.Choices[0].Message.Content != "ok" {
		t.Errorf("resp = %+v", resp)
	}
	if a.calls != 1 || b.calls != 1 {
		t.Errorf("calls a=%d b=%d", a.calls, b.calls)
	}
}

func TestTerminalErrorNoFallback(t *testing.T) {
	a := &fakeProvider{name: "a", err: &llm.ProviderError{Provider: "a", Retryable: false, StatusCode: 400, Message: "bad"}}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{}, NewBreakers(5, time.Minute), discardLog())

	_, route, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}})
	if err == nil {
		t.Fatal("expected terminal error")
	}
	if route.Provider != "a" {
		t.Errorf("route = %q, want a", route.Provider)
	}
	if b.calls != 0 {
		t.Errorf("b should not be called, got %d", b.calls)
	}
}

func TestModelNotFound(t *testing.T) {
	rt := New(NewRegistry(), map[string]llm.Provider{}, fakeResolver{}, NewBreakers(5, time.Minute), discardLog())
	_, _, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "nope"})
	if !errors.Is(err, ErrModelNotFound) {
		t.Errorf("err = %v, want ErrModelNotFound", err)
	}
}

func TestSkipMissingCredential(t *testing.T) {
	a := &fakeProvider{name: "a", resp: okResp()}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{errs: map[string]error{"a": ErrNoCredential}}, NewBreakers(5, time.Minute), discardLog())

	_, route, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}})
	if err != nil {
		t.Fatal(err)
	}
	if route.Provider != "b" {
		t.Errorf("route = %q, want b (a had no credential)", route.Provider)
	}
	if a.calls != 0 {
		t.Errorf("a should be skipped, got %d calls", a.calls)
	}
}

func TestCircuitBreakerLifecycle(t *testing.T) {
	now := time.Unix(1000, 0)
	b := NewBreakers(2, time.Minute)
	b.now = func() time.Time { return now }

	if !b.Allow("a") {
		t.Fatal("fresh breaker should allow")
	}
	b.RecordFailure("a")
	if !b.Allow("a") {
		t.Fatal("one failure should not open")
	}
	b.RecordFailure("a") // reaches threshold -> open
	if b.Allow("a") {
		t.Fatal("breaker should be open after threshold")
	}

	now = now.Add(2 * time.Minute) // past cooldown
	if !b.Allow("a") {
		t.Fatal("breaker should allow a half-open trial after cooldown")
	}
	b.RecordSuccess("a") // trial succeeds -> closed
	if !b.Allow("a") {
		t.Fatal("breaker should be closed after successful trial")
	}
}
