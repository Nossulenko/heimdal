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

	resp, route, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{})
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

	_, route, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{})
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
	_, _, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "nope"}, Options{})
	if !errors.Is(err, ErrModelNotFound) {
		t.Errorf("err = %v, want ErrModelNotFound", err)
	}
}

func TestNoFallbackOption(t *testing.T) {
	a := &fakeProvider{name: "a", err: &llm.ProviderError{Provider: "a", Retryable: true, Message: "503"}}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{}, NewBreakers(5, time.Minute), discardLog())

	// With NoFallback the primary's retryable failure is returned; b is never tried.
	_, _, err := rt.Chat(context.Background(), "org",
		&llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{NoFallback: true})
	if err == nil {
		t.Fatal("expected error when primary fails and fallback is disabled")
	}
	if a.calls != 1 {
		t.Errorf("primary calls = %d, want 1", a.calls)
	}
	if b.calls != 0 {
		t.Errorf("fallback should not be called, got %d", b.calls)
	}
}

func TestSkipMissingCredential(t *testing.T) {
	a := &fakeProvider{name: "a", resp: okResp()}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{errs: map[string]error{"a": ErrNoCredential}}, NewBreakers(5, time.Minute), discardLog())

	_, route, err := rt.Chat(context.Background(), "org", &llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{})
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

func TestProviderPinning(t *testing.T) {
	a := &fakeProvider{name: "a", resp: okResp()}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{}, NewBreakers(5, time.Minute), discardLog())

	// "b/b-model" pins provider b directly, bypassing logical "m" (whose primary
	// is a) and recovering b-model's pricing from the registry.
	_, route, err := rt.Chat(context.Background(), "org",
		&llm.ChatRequest{Model: "b/b-model", Messages: []llm.Message{{Content: "hi"}}}, Options{})
	if err != nil {
		t.Fatal(err)
	}
	if route.Provider != "b" || route.ProviderModelID != "b-model" {
		t.Errorf("route = %+v, want provider b / b-model", route)
	}
	if a.calls != 0 || b.calls != 1 {
		t.Errorf("calls a=%d b=%d, want a=0 b=1", a.calls, b.calls)
	}
}

func pricedRegistry() *Registry {
	reg := NewRegistry()
	reg.Load([]store.Model{
		{LogicalName: "m", Provider: "a", ProviderModelID: "am", Priority: 0, InputPricePerToken: 1.0, OutputPricePerToken: 1.0, Active: true},
		{LogicalName: "m", Provider: "b", ProviderModelID: "bm", Priority: 1, InputPricePerToken: 0.1, OutputPricePerToken: 0.1, Active: true},
	})
	return reg
}

func TestSortByCost(t *testing.T) {
	// Default (priority order): the primary "a" is used.
	a := &fakeProvider{name: "a", resp: okResp()}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(pricedRegistry(), map[string]llm.Provider{"a": a, "b": b}, fakeResolver{}, NewBreakers(5, time.Minute), discardLog())
	_, route, err := rt.Chat(context.Background(), "org",
		&llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{})
	if err != nil || route.Provider != "a" {
		t.Fatalf("default route = %q err=%v, want a", route.Provider, err)
	}

	// SortByCost: "b" is cheaper, so it is tried first.
	a2 := &fakeProvider{name: "a", resp: okResp()}
	b2 := &fakeProvider{name: "b", resp: okResp()}
	rt2 := New(pricedRegistry(), map[string]llm.Provider{"a": a2, "b": b2}, fakeResolver{}, NewBreakers(5, time.Minute), discardLog())
	_, route2, err := rt2.Chat(context.Background(), "org",
		&llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{SortByCost: true})
	if err != nil {
		t.Fatal(err)
	}
	if route2.Provider != "b" {
		t.Errorf("cost route = %q, want b (cheapest)", route2.Provider)
	}
	if a2.calls != 0 || b2.calls != 1 {
		t.Errorf("calls a=%d b=%d, want a=0 b=1", a2.calls, b2.calls)
	}
}

func TestSortByLatency(t *testing.T) {
	a := &fakeProvider{name: "a", resp: okResp()}
	b := &fakeProvider{name: "b", resp: okResp()}
	rt := New(twoCandidateRegistry(), map[string]llm.Provider{"a": a, "b": b},
		fakeResolver{}, NewBreakers(5, time.Minute), discardLog())

	// Seed history: primary "a" is slow, "b" is fast.
	rt.latency.Record("a", 500)
	rt.latency.Record("b", 50)

	_, route, err := rt.Chat(context.Background(), "org",
		&llm.ChatRequest{Model: "m", Messages: []llm.Message{{Content: "hi"}}}, Options{SortByLatency: true})
	if err != nil {
		t.Fatal(err)
	}
	if route.Provider != "b" {
		t.Errorf("latency route = %q, want b (fastest)", route.Provider)
	}
	if a.calls != 0 || b.calls != 1 {
		t.Errorf("calls a=%d b=%d, want a=0 b=1", a.calls, b.calls)
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
