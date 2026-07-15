// Package llm defines the canonical, OpenAI-shaped request/response types that
// flow through the gateway, plus the Provider interface every upstream adapter
// implements. Everything inside the gateway speaks these types; adapters
// translate to and from each provider's native wire format at the edge.
package llm

import (
	"context"
	"fmt"
)

// Canonical message roles.
const (
	RoleSystem    = "system"
	RoleUser      = "user"
	RoleAssistant = "assistant"
)

// Message is a single chat message in the canonical (OpenAI) shape.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the canonical chat-completion request. By the time an adapter
// receives it, Model is already the provider-native model id (the router
// resolved the logical name first).
type ChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   *int      `json:"max_tokens,omitempty"`
	Temperature *float64  `json:"temperature,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
}

// Choice is one completion choice in a non-streaming response.
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage holds token accounting for a request. Estimated is internal-only and
// records whether the counts were derived from a heuristic rather than reported
// by the upstream; it is never serialized to clients.
type Usage struct {
	PromptTokens     int  `json:"prompt_tokens"`
	CompletionTokens int  `json:"completion_tokens"`
	TotalTokens      int  `json:"total_tokens"`
	Estimated        bool `json:"-"`
}

// ChatResponse is the canonical non-streaming response.
type ChatResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

// Delta is the incremental content in a streaming chunk.
type Delta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

// StreamChoice is one choice within a streaming chunk.
type StreamChoice struct {
	Index        int     `json:"index"`
	Delta        Delta   `json:"delta"`
	FinishReason *string `json:"finish_reason"`
}

// ChatChunk is a single canonical streaming chunk, shaped like an OpenAI
// chat.completion.chunk so the HTTP layer can emit an OpenAI-compatible SSE
// stream regardless of the upstream provider.
type ChatChunk struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []StreamChoice `json:"choices"`
	Usage   *Usage         `json:"usage,omitempty"`
}

// Provider is implemented once per upstream. apiKey is the decrypted upstream
// credential the router selected for this request.
type Provider interface {
	// Name returns the provider's stable identifier (e.g. "openai").
	Name() string
	// Chat performs a non-streaming completion.
	Chat(ctx context.Context, apiKey string, req *ChatRequest) (*ChatResponse, error)
	// StreamChat opens a streaming completion. The caller must Close the
	// returned stream. An error returned here happens before any bytes are
	// committed to the client, so the router may still fall back.
	StreamChat(ctx context.Context, apiKey string, req *ChatRequest) (ChatStream, error)
}

// ChatStream is a pull-based iterator over canonical streaming chunks. Recv
// returns io.EOF exactly once after the final chunk. Close is idempotent and
// releases the upstream connection even if the client disconnects early.
type ChatStream interface {
	Recv() (*ChatChunk, error)
	Close() error
}

// ProviderError is a normalized upstream failure. Retryable distinguishes
// transient failures (worth a fallback candidate) from terminal ones (a
// malformed request, auth failure, or policy block that another provider
// cannot fix).
type ProviderError struct {
	Provider   string
	StatusCode int
	Message    string
	Retryable  bool
	Err        error
}

// Error implements the error interface.
func (e *ProviderError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Provider, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s (status %d)", e.Provider, e.Message, e.StatusCode)
}

// Unwrap exposes the underlying error for errors.Is/As.
func (e *ProviderError) Unwrap() error { return e.Err }

// RetryableStatus reports whether an HTTP status from an upstream should be
// treated as transient (eligible for fallback / retry).
func RetryableStatus(status int) bool {
	return status == 429 || status >= 500
}
