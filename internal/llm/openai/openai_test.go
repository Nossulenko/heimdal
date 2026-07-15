package openai

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nossulenko/heimdal/internal/llm"
)

func testReq() *llm.ChatRequest {
	return &llm.ChatRequest{
		Model:    "gpt-4o-mini",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "hi"}},
	}
}

func TestChatMapsResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer sk-test" {
			t.Errorf("auth header = %q", got)
		}
		io.WriteString(w, `{
			"id":"cmpl-1","object":"chat.completion","model":"gpt-4o-mini",
			"choices":[{"index":0,"message":{"role":"assistant","content":"hello"},"finish_reason":"stop"}],
			"usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}
		}`)
	}))
	defer srv.Close()

	c := New(srv.URL, nil)
	resp, err := c.Chat(context.Background(), "sk-test", testReq())
	if err != nil {
		t.Fatal(err)
	}
	if resp.Choices[0].Message.Content != "hello" {
		t.Errorf("content = %q", resp.Choices[0].Message.Content)
	}
	if resp.Usage.PromptTokens != 5 || resp.Usage.CompletionTokens != 2 {
		t.Errorf("usage = %+v", resp.Usage)
	}
}

func TestChatErrorClassification(t *testing.T) {
	cases := []struct {
		status    int
		retryable bool
	}{
		{http.StatusBadRequest, false},
		{http.StatusUnauthorized, false},
		{http.StatusTooManyRequests, true},
		{http.StatusInternalServerError, true},
	}
	for _, tc := range cases {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(tc.status)
			io.WriteString(w, `{"error":"boom"}`)
		}))
		c := New(srv.URL, nil)
		_, err := c.Chat(context.Background(), "sk", testReq())
		srv.Close()
		if err == nil {
			t.Fatalf("status %d: expected error", tc.status)
		}
		pe, ok := err.(*llm.ProviderError)
		if !ok {
			t.Fatalf("status %d: error type = %T", tc.status, err)
		}
		if pe.Retryable != tc.retryable {
			t.Errorf("status %d: retryable = %v, want %v", tc.status, pe.Retryable, tc.retryable)
		}
	}
}

func TestStreamChat(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fl := w.(http.Flusher)
		w.Header().Set("Content-Type", "text/event-stream")
		io.WriteString(w, "data: {\"id\":\"1\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"Hel\"}}]}\n\n")
		fl.Flush()
		io.WriteString(w, "data: {\"id\":\"1\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"lo\"}}]}\n\n")
		fl.Flush()
		io.WriteString(w, "data: [DONE]\n\n")
		fl.Flush()
	}))
	defer srv.Close()

	c := New(srv.URL, nil)
	stream, err := c.StreamChat(context.Background(), "sk", testReq())
	if err != nil {
		t.Fatal(err)
	}
	defer stream.Close()

	var content string
	var chunks int
	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		chunks++
		if len(chunk.Choices) > 0 {
			content += chunk.Choices[0].Delta.Content
		}
	}
	if chunks != 2 {
		t.Errorf("chunks = %d, want 2", chunks)
	}
	if content != "Hello" {
		t.Errorf("content = %q", content)
	}
}
