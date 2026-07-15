// Package anthropic implements the llm.Provider interface for Anthropic's
// Messages API, translating to/from the gateway's canonical OpenAI shape.
//
// Wire format per Anthropic's public API documentation:
//   - POST {baseURL}/v1/messages with headers x-api-key and anthropic-version.
//   - "system" is a top-level field, not a message; messages carry only
//     user/assistant roles. max_tokens is REQUIRED.
//   - Non-streaming responses return content blocks + stop_reason + usage
//     {input_tokens, output_tokens}.
//   - Streaming is a typed event stream: message_start, content_block_start,
//     content_block_delta, content_block_stop, message_delta, message_stop,
//     ping. Input tokens arrive in message_start; output tokens and stop_reason
//     in message_delta.
//
// [verify] Re-confirm event names / required fields against live docs before
// relying on this in production.
package anthropic

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/nossulenko/heimdal/internal/llm"
	"github.com/nossulenko/heimdal/internal/sse"
)

// DefaultBaseURL is the public Anthropic API base.
const DefaultBaseURL = "https://api.anthropic.com"

// apiVersion is the Anthropic API version header value.
const apiVersion = "2023-06-01"

// defaultMaxTokens is supplied when a client omits max_tokens, since Anthropic
// requires it.
const defaultMaxTokens = 1024

// Client is an Anthropic provider adapter.
type Client struct {
	baseURL string
	http    *http.Client
}

// New returns an Anthropic adapter. Empty baseURL uses the public API; nil hc
// gets a client with a sane timeout.
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
func (c *Client) Name() string { return "anthropic" }

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicRequest struct {
	Model       string             `json:"model"`
	MaxTokens   int                `json:"max_tokens"`
	Messages    []anthropicMessage `json:"messages"`
	System      string             `json:"system,omitempty"`
	Temperature *float64           `json:"temperature,omitempty"`
	Stream      bool               `json:"stream,omitempty"`
}

// toRequest translates a canonical request into Anthropic's shape: system
// messages are lifted into the top-level system field, and max_tokens is
// defaulted when absent.
func toRequest(req *llm.ChatRequest, stream bool) *anthropicRequest {
	out := &anthropicRequest{
		Model:       req.Model,
		Temperature: req.Temperature,
		Stream:      stream,
		MaxTokens:   defaultMaxTokens,
	}
	if req.MaxTokens != nil && *req.MaxTokens > 0 {
		out.MaxTokens = *req.MaxTokens
	}
	var systemParts []string
	for _, m := range req.Messages {
		if m.Role == llm.RoleSystem {
			systemParts = append(systemParts, m.Content)
			continue
		}
		out.Messages = append(out.Messages, anthropicMessage{Role: m.Role, Content: m.Content})
	}
	out.System = strings.Join(systemParts, "\n\n")
	return out
}

// mapStopReason converts an Anthropic stop_reason to a canonical finish_reason.
func mapStopReason(r string) string {
	switch r {
	case "max_tokens":
		return "length"
	case "tool_use":
		return "tool_calls"
	case "end_turn", "stop_sequence":
		return "stop"
	case "":
		return ""
	default:
		return "stop"
	}
}

func (c *Client) newHTTPRequest(ctx context.Context, apiKey string, body *anthropicRequest) (*http.Request, error) {
	buf, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/messages", bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", apiKey)
	httpReq.Header.Set("anthropic-version", apiVersion)
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

type anthropicResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// Chat performs a non-streaming completion and maps the result back to the
// canonical response shape.
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

	var ar anthropicResponse
	if err := json.Unmarshal(body, &ar); err != nil {
		return nil, &llm.ProviderError{Provider: c.Name(), Message: "decode response failed", Err: err}
	}

	var text strings.Builder
	for _, block := range ar.Content {
		if block.Type == "text" {
			text.WriteString(block.Text)
		}
	}
	return &llm.ChatResponse{
		ID:      ar.ID,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   ar.Model,
		Choices: []llm.Choice{{
			Index:        0,
			Message:      llm.Message{Role: llm.RoleAssistant, Content: text.String()},
			FinishReason: mapStopReason(ar.StopReason),
		}},
		Usage: llm.Usage{
			PromptTokens:     ar.Usage.InputTokens,
			CompletionTokens: ar.Usage.OutputTokens,
			TotalTokens:      ar.Usage.InputTokens + ar.Usage.OutputTokens,
		},
	}, nil
}

// StreamChat opens a streaming completion. The Anthropic event stream is
// translated into canonical chunks by the returned stream.
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
	return &stream{body: resp.Body, scan: sse.NewScanner(resp.Body), created: time.Now().Unix()}, nil
}

// stream translates Anthropic's typed event stream into canonical chunks. It is
// a small state machine: it tracks the message id, input tokens, and (once
// message_delta arrives) the stop reason and output tokens, emitting a final
// chunk carrying finish_reason + usage.
type stream struct {
	body    io.ReadCloser
	scan    *sse.Scanner
	created int64

	id           string
	model        string
	inputTokens  int
	outputTokens int
	finishReason string
	sentRole     bool
	done         bool
}

func (s *stream) chunk(choice llm.StreamChoice, usage *llm.Usage) *llm.ChatChunk {
	return &llm.ChatChunk{
		ID:      s.id,
		Object:  "chat.completion.chunk",
		Created: s.created,
		Model:   s.model,
		Choices: []llm.StreamChoice{choice},
		Usage:   usage,
	}
}

// Recv reads upstream events until it can emit a canonical chunk. Events that
// carry no client-visible content (ping, content_block_start/stop) are skipped.
func (s *stream) Recv() (*llm.ChatChunk, error) {
	if s.done {
		return nil, io.EOF
	}
	for {
		ev, err := s.scan.Next()
		if err != nil {
			return nil, err
		}
		switch ev.Name {
		case "message_start":
			var ms struct {
				Message struct {
					ID    string `json:"id"`
					Model string `json:"model"`
					Usage struct {
						InputTokens int `json:"input_tokens"`
					} `json:"usage"`
				} `json:"message"`
			}
			if err := json.Unmarshal([]byte(ev.Data), &ms); err != nil {
				return nil, &llm.ProviderError{Provider: "anthropic", Message: "decode message_start failed", Err: err}
			}
			s.id = ms.Message.ID
			s.model = ms.Message.Model
			s.inputTokens = ms.Message.Usage.InputTokens
			s.sentRole = true
			return s.chunk(llm.StreamChoice{Index: 0, Delta: llm.Delta{Role: llm.RoleAssistant}}, nil), nil

		case "content_block_delta":
			var cd struct {
				Delta struct {
					Type string `json:"type"`
					Text string `json:"text"`
				} `json:"delta"`
			}
			if err := json.Unmarshal([]byte(ev.Data), &cd); err != nil {
				return nil, &llm.ProviderError{Provider: "anthropic", Message: "decode content_block_delta failed", Err: err}
			}
			if cd.Delta.Type != "text_delta" || cd.Delta.Text == "" {
				continue
			}
			return s.chunk(llm.StreamChoice{Index: 0, Delta: llm.Delta{Content: cd.Delta.Text}}, nil), nil

		case "message_delta":
			var md struct {
				Delta struct {
					StopReason string `json:"stop_reason"`
				} `json:"delta"`
				Usage struct {
					OutputTokens int `json:"output_tokens"`
				} `json:"usage"`
			}
			if err := json.Unmarshal([]byte(ev.Data), &md); err != nil {
				return nil, &llm.ProviderError{Provider: "anthropic", Message: "decode message_delta failed", Err: err}
			}
			if md.Delta.StopReason != "" {
				s.finishReason = mapStopReason(md.Delta.StopReason)
			}
			s.outputTokens = md.Usage.OutputTokens
			continue

		case "message_stop":
			s.done = true
			fr := s.finishReason
			if fr == "" {
				fr = "stop"
			}
			usage := &llm.Usage{
				PromptTokens:     s.inputTokens,
				CompletionTokens: s.outputTokens,
				TotalTokens:      s.inputTokens + s.outputTokens,
			}
			return s.chunk(llm.StreamChoice{Index: 0, Delta: llm.Delta{}, FinishReason: &fr}, usage), nil

		default:
			// ping, content_block_start, content_block_stop, unknown: skip.
			continue
		}
	}
}

// Close releases the upstream connection. Safe to call more than once.
func (s *stream) Close() error {
	return s.body.Close()
}
