package router

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/nossulenko/heimdal/internal/cryptox"
	"github.com/nossulenko/heimdal/internal/llm"
	"github.com/nossulenko/heimdal/internal/store"
)

// Router-level errors.
var (
	ErrModelNotFound     = errors.New("router: model not found")
	ErrNoCredential      = errors.New("router: no credential for provider")
	ErrAllCandidatesFail = errors.New("router: all candidates failed")
	ErrProviderNotWired  = errors.New("router: provider not registered")
)

// CredentialResolver returns the decrypted upstream API key for an org+provider.
type CredentialResolver interface {
	Resolve(ctx context.Context, orgID, provider string) (string, error)
}

// Router dispatches canonical requests to providers with fallback + breaking.
type Router struct {
	registry  *Registry
	providers map[string]llm.Provider
	creds     CredentialResolver
	breakers  *Breakers
	log       *slog.Logger
}

// New builds a Router. providers maps provider name -> adapter.
func New(reg *Registry, providers map[string]llm.Provider, creds CredentialResolver, breakers *Breakers, log *slog.Logger) *Router {
	return &Router{registry: reg, providers: providers, creds: creds, breakers: breakers, log: log}
}

// isRetryable reports whether an error should trigger a fallback to the next
// candidate. Provider errors carry their own classification; context
// cancellation is never retried.
func isRetryable(err error) bool {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	var pe *llm.ProviderError
	if errors.As(err, &pe) {
		return pe.Retryable
	}
	return false
}

// candidate runs one closure against the ordered candidate list, applying
// credential resolution, circuit breaking, and fallback. It returns the Route
// that succeeded. The closure performs the actual provider call.
func (r *Router) dispatch(ctx context.Context, orgID string, logicalModel string, call func(p llm.Provider, apiKey string, rt Route) error) (Route, error) {
	routes, ok := r.registry.Resolve(logicalModel)
	if !ok {
		return Route{}, ErrModelNotFound
	}

	var lastErr error
	for _, rt := range routes {
		p, ok := r.providers[rt.Provider]
		if !ok {
			lastErr = fmt.Errorf("%w: %s", ErrProviderNotWired, rt.Provider)
			continue
		}
		if !r.breakers.Allow(rt.Provider) {
			r.log.Warn("circuit open, skipping candidate", "provider", rt.Provider, "model", logicalModel)
			lastErr = fmt.Errorf("circuit open for %s", rt.Provider)
			continue
		}
		apiKey, err := r.creds.Resolve(ctx, orgID, rt.Provider)
		if err != nil {
			r.log.Warn("no credential, skipping candidate", "provider", rt.Provider, "err", err)
			lastErr = err
			continue
		}

		err = call(p, apiKey, rt)
		if err == nil {
			r.breakers.RecordSuccess(rt.Provider)
			return rt, nil
		}
		if isRetryable(err) {
			r.breakers.RecordFailure(rt.Provider)
			r.log.Warn("retryable provider error, falling back", "provider", rt.Provider, "err", err)
			lastErr = err
			continue
		}
		// Terminal error (e.g. 400/401/policy): another provider won't help,
		// and it is not the provider's health at fault, so don't trip the
		// breaker. Return immediately.
		return rt, err
	}
	if lastErr == nil {
		lastErr = ErrAllCandidatesFail
	}
	return Route{}, fmt.Errorf("%w: %v", ErrAllCandidatesFail, lastErr)
}

// Chat resolves and dispatches a non-streaming completion.
func (r *Router) Chat(ctx context.Context, orgID string, req *llm.ChatRequest) (*llm.ChatResponse, Route, error) {
	var resp *llm.ChatResponse
	route, err := r.dispatch(ctx, orgID, req.Model, func(p llm.Provider, apiKey string, rt Route) error {
		preq := *req
		preq.Model = rt.ProviderModelID
		out, err := p.Chat(ctx, apiKey, &preq)
		if err != nil {
			return err
		}
		resp = out
		return nil
	})
	return resp, route, err
}

// StreamChat resolves and dispatches a streaming completion. Because a stream
// is opened (and its first bytes not yet flushed) inside the candidate loop, a
// failure to open still falls back; once the returned stream is handed back,
// the caller owns it and mid-stream failures are not retried.
func (r *Router) StreamChat(ctx context.Context, orgID string, req *llm.ChatRequest) (llm.ChatStream, Route, error) {
	var stream llm.ChatStream
	route, err := r.dispatch(ctx, orgID, req.Model, func(p llm.Provider, apiKey string, rt Route) error {
		preq := *req
		preq.Model = rt.ProviderModelID
		s, err := p.StreamChat(ctx, apiKey, &preq)
		if err != nil {
			return err
		}
		stream = s
		return nil
	})
	return stream, route, err
}

// StoreResolver resolves upstream credentials from the store, decrypting them
// with the configured AES-GCM key.
type StoreResolver struct {
	Store *store.Store
	Key   []byte
}

// Resolve implements CredentialResolver.
func (s *StoreResolver) Resolve(ctx context.Context, orgID, provider string) (string, error) {
	cred, err := s.Store.GetActiveCredential(ctx, orgID, provider)
	if errors.Is(err, store.ErrNotFound) {
		return "", ErrNoCredential
	}
	if err != nil {
		return "", err
	}
	plaintext, err := cryptox.Decrypt(s.Key, cred.Ciphertext, cred.Nonce)
	if err != nil {
		return "", fmt.Errorf("decrypt credential: %w", err)
	}
	return string(plaintext), nil
}
