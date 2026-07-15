// Package google implements the llm.Provider interface for Google's Gemini
// (Generative Language) API, translating to/from the gateway's canonical
// OpenAI shape.
//
// Wire format per Google's public API documentation:
//   - POST {baseURL}/v1beta/models/{model}:generateContent with the API key in
//     the x-goog-api-key header.
//   - "contents" carry roles "user"/"model" and text "parts"; a system prompt
//     goes in top-level "systemInstruction". generationConfig holds
//     maxOutputTokens/temperature.
//   - Non-streaming responses return candidates[].content.parts[].text, a
//     finishReason, and usageMetadata {promptTokenCount, candidatesTokenCount}.
//   - Streaming uses {model}:streamGenerateContent?alt=sse — SSE "data: {json}"
//     chunks, each a partial GenerateContentResponse, ending at connection
//     close (no [DONE] sentinel).
//
// [verify] Re-confirm endpoint paths / field names against live docs before
// relying on this in production.
package google

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

// DefaultBaseURL is the public Gemini API base.
const DefaultBaseURL = "https://generativelanguage.googleapis.com"

// Client is a Google Gemini provider adapter.
type Client struct {
	baseURL string
	http    *http.Client
}

// New returns a Gemini adapter. Empty baseURL uses the public API; nil hc gets
// a client with a sane timeout.
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
func (c *Client) Name() string { return "google" }

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiGenConfig struct {
	MaxOutputTokens *int     `json:"maxOutputTokens,omitempty"`
	Temperature     *float64 `json:"temperature,omitempty"`
}

type geminiRequest struct {
	Contents          []geminiContent  `json:"contents"`
	SystemInstruction *geminiContent   `json:"systemInstruction,omitempty"`
	GenerationConfig  *geminiGenConfig `json:"generationConfig,omitempty"`
}

// toRequest translates a canonical request into Gemini's shape: system messages
// become systemInstruction, assistant maps to the "model" role.
func toRequest(req *llm.ChatRequest) *geminiRequest {
	out := &geminiRequest{}
	var systemParts []string
	for _, m := range req.Messages {
		if m.Role == llm.RoleSystem {
			systemParts = append(systemParts, m.Content)
			continue
		}
		role := "user"
		if m.Role == llm.RoleAssistant {
			role = "model"
		}
		out.Contents = append(out.Contents, geminiContent{Role: role, Parts: []geminiPart{{Text: m.Content}}})
	}
	if len(systemParts) > 0 {
		out.SystemInstruction = &geminiContent{Parts: []geminiPart{{Text: strings.Join(systemParts, "\n\n")}}}
	}
	if req.MaxTokens != nil || req.Temperature != nil {
		out.GenerationConfig = &geminiGenConfig{MaxOutputTokens: req.MaxTokens, Temperature: req.Temperature}
	}
	return out
}

// mapFinishReason converts a Gemini finishReason to a canonical finish_reason.
func mapFinishReason(r string) string {
	switch r {
	case "MAX_TOKENS":
		return "length"
	case "STOP":
		return "stop"
	case "":
		return ""
	default:
		return "stop"
	}
}

func (c *Client) endpoint(model, method, query string) string {
	url := c.baseURL + "/v1beta/models/" + model + ":" + method
	if query != "" {
		url += "?" + query
	}
	return url
}

func (c *Client) newHTTPRequest(ctx context.Context, apiKey, url string, body *geminiRequest) (*http.Request, error) {
	buf, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", apiKey)
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

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []geminiPart `json:"parts"`
			Role  string       `json:"role"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
}

func (r *geminiResponse) text() string {
	var b strings.Builder
	if len(r.Candidates) > 0 {
		for _, p := range r.Candidates[0].Content.Parts {
			b.WriteString(p.Text)
		}
	}
	return b.String()
}

func (r *geminiResponse) finishReason() string {
	if len(r.Candidates) > 0 {
		return r.Candidates[0].FinishReason
	}
	return ""
}

// Chat performs a non-streaming completion.
func (c *Client) Chat(ctx context.Context, apiKey string, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	httpReq, err := c.newHTTPRequest(ctx, apiKey, c.endpoint(req.Model, "generateContent", ""), toRequest(req))
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

	var gr geminiResponse
	if err := json.Unmarshal(body, &gr); err != nil {
		return nil, &llm.ProviderError{Provider: c.Name(), Message: "decode response failed", Err: err}
	}
	return &llm.ChatResponse{
		ID:      "gemini",
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   req.Model,
		Choices: []llm.Choice{{
			Index:        0,
			Message:      llm.Message{Role: llm.RoleAssistant, Content: gr.text()},
			FinishReason: mapFinishReason(gr.finishReason()),
		}},
		Usage: llm.Usage{
			PromptTokens:     gr.UsageMetadata.PromptTokenCount,
			CompletionTokens: gr.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      gr.UsageMetadata.TotalTokenCount,
		},
	}, nil
}

// StreamChat opens a streaming completion via streamGenerateContent?alt=sse.
func (c *Client) StreamChat(ctx context.Context, apiKey string, req *llm.ChatRequest) (llm.ChatStream, error) {
	httpReq, err := c.newHTTPRequest(ctx, apiKey, c.endpoint(req.Model, "streamGenerateContent", "alt=sse"), toRequest(req))
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
	return &stream{body: resp.Body, scan: sse.NewScanner(resp.Body), model: req.Model, created: time.Now().Unix()}, nil
}

// stream translates Gemini's SSE chunks into canonical chunks. Each upstream
// event is one partial response, so no multi-event state machine is needed
// beyond emitting the assistant role on the first chunk.
type stream struct {
	body     io.ReadCloser
	scan     *sse.Scanner
	model    string
	created  int64
	sentRole bool
}

// Recv returns the next canonical chunk, or io.EOF at the end of the stream.
func (s *stream) Recv() (*llm.ChatChunk, error) {
	for {
		ev, err := s.scan.Next()
		if err != nil {
			return nil, err
		}
		if ev.Data == "" {
			continue
		}
		var gr geminiResponse
		if err := json.Unmarshal([]byte(ev.Data), &gr); err != nil {
			return nil, &llm.ProviderError{Provider: "google", Message: "decode chunk failed", Err: err}
		}

		delta := llm.Delta{Content: gr.text()}
		if !s.sentRole {
			delta.Role = llm.RoleAssistant
			s.sentRole = true
		}
		choice := llm.StreamChoice{Index: 0, Delta: delta}
		if fr := mapFinishReason(gr.finishReason()); fr != "" {
			choice.FinishReason = &fr
		}
		var usage *llm.Usage
		if gr.UsageMetadata.TotalTokenCount > 0 {
			usage = &llm.Usage{
				PromptTokens:     gr.UsageMetadata.PromptTokenCount,
				CompletionTokens: gr.UsageMetadata.CandidatesTokenCount,
				TotalTokens:      gr.UsageMetadata.TotalTokenCount,
			}
		}
		return &llm.ChatChunk{
			ID:      "gemini",
			Object:  "chat.completion.chunk",
			Created: s.created,
			Model:   s.model,
			Choices: []llm.StreamChoice{choice},
			Usage:   usage,
		}, nil
	}
}

// Close releases the upstream connection. Safe to call more than once.
func (s *stream) Close() error {
	return s.body.Close()
}
