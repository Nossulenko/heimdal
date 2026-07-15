// Package openai implements the llm.Provider interface for OpenAI's
// /v1/chat/completions API. Because the gateway's canonical types are already
// OpenAI-shaped, translation here is close to identity; the main work is
// setting stream_options for usage reporting and parsing the SSE stream.
//
// Wire format per OpenAI's public API documentation:
//   - POST {baseURL}/chat/completions, Bearer auth.
//   - Streaming responses are SSE "data: {json}\n\n" lines terminated by a
//     literal "data: [DONE]".
//   - Usage on a streamed request is only returned when the request sets
//     stream_options.include_usage = true (in a final chunk with empty choices).
package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/kaizenprojects/relaygw/internal/llm"
	"github.com/kaizenprojects/relaygw/internal/sse"
)

// DefaultBaseURL is the public OpenAI API base.
const DefaultBaseURL = "https://api.openai.com/v1"

// Client is an OpenAI provider adapter.
type Client struct {
	baseURL string
	http    *http.Client
}

// New returns an OpenAI adapter. If baseURL is empty the public API is used.
// If hc is nil a client with a sane timeout is created (streaming uses a
// per-request context for cancellation rather than the client timeout).
func New(baseURL string, hc *http.Client) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	if hc == nil {
		hc = &http.Client{Timeout: 120 * time.Second}
	}
	return &Client{baseURL: baseURL, http: hc}
}

// Name returns the provider identifier.
func (c *Client) Name() string { return "openai" }

type openaiRequest struct {
	Model         string        `json:"model"`
	Messages      []llm.Message `json:"messages"`
	MaxTokens     *int          `json:"max_tokens,omitempty"`
	Temperature   *float64      `json:"temperature,omitempty"`
	Stream        bool          `json:"stream,omitempty"`
	StreamOptions *streamOpts   `json:"stream_options,omitempty"`
}

type streamOpts struct {
	IncludeUsage bool `json:"include_usage"`
}

func toRequest(req *llm.ChatRequest, stream bool) *openaiRequest {
	r := &openaiRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      stream,
	}
	if stream {
		r.StreamOptions = &streamOpts{IncludeUsage: true}
	}
	return r
}

func (c *Client) newHTTPRequest(ctx context.Context, apiKey string, body *openaiRequest) (*http.Request, error) {
	buf, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	return httpReq, nil
}

func (c *Client) errorFrom(status int, body []byte) *llm.ProviderError {
	msg := string(bytes.TrimSpace(body))
	if len(msg) > 500 {
		msg = msg[:500]
	}
	return &llm.ProviderError{
		Provider:   c.Name(),
		StatusCode: status,
		Message:    fmt.Sprintf("upstream returned %d: %s", status, msg),
		Retryable:  llm.RetryableStatus(status),
	}
}

// Chat performs a non-streaming completion. The OpenAI response shape maps
// directly onto llm.ChatResponse, so it is decoded as-is.
func (c *Client) Chat(ctx context.Context, apiKey string, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	httpReq, err := c.newHTTPRequest(ctx, apiKey, toRequest(req, false))
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, &llm.ProviderError{Provider: c.Name(), Message: "request failed", Retryable: true, Err: err}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &llm.ProviderError{Provider: c.Name(), Message: "read body failed", Retryable: true, Err: err}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, c.errorFrom(resp.StatusCode, body)
	}

	var out llm.ChatResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, &llm.ProviderError{Provider: c.Name(), Message: "decode response failed", Err: err}
	}
	return &out, nil
}

// StreamChat opens a streaming completion. The returned stream must be closed.
func (c *Client) StreamChat(ctx context.Context, apiKey string, req *llm.ChatRequest) (llm.ChatStream, error) {
	httpReq, err := c.newHTTPRequest(ctx, apiKey, toRequest(req, true))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Accept", "text/event-stream")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, &llm.ProviderError{Provider: c.Name(), Message: "request failed", Retryable: true, Err: err}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, c.errorFrom(resp.StatusCode, body)
	}
	return &stream{body: resp.Body, scan: sse.NewScanner(resp.Body)}, nil
}

type stream struct {
	body io.ReadCloser
	scan *sse.Scanner
}

// Recv returns the next canonical chunk, or io.EOF at the end of the stream.
func (s *stream) Recv() (*llm.ChatChunk, error) {
	for {
		ev, err := s.scan.Next()
		if err != nil {
			return nil, err
		}
		if ev.Data == "[DONE]" {
			return nil, io.EOF
		}
		if ev.Data == "" {
			continue
		}
		var chunk llm.ChatChunk
		if err := json.Unmarshal([]byte(ev.Data), &chunk); err != nil {
			return nil, &llm.ProviderError{Provider: "openai", Message: "decode chunk failed", Err: err}
		}
		return &chunk, nil
	}
}

// Close releases the upstream connection. It is safe to call more than once.
func (s *stream) Close() error {
	return s.body.Close()
}
