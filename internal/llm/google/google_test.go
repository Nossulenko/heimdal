package google

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nossulenko/heimdal/internal/llm"
)

func TestChatTranslation(t *testing.T) {
	var captured geminiRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-goog-api-key") != "gk-test" {
			t.Errorf("missing x-goog-api-key")
		}
		if !strings.Contains(r.URL.Path, ":generateContent") {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		json.NewDecoder(r.Body).Decode(&captured)
		io.WriteString(w, `{
			"candidates":[{"content":{"parts":[{"text":"hi there"}],"role":"model"},"finishReason":"STOP"}],
			"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":3,"totalTokenCount":13}
		}`)
	}))
	defer srv.Close()

	req := &llm.ChatRequest{
		Model: "gemini-2.5-flash",
		Messages: []llm.Message{
			{Role: llm.RoleSystem, Content: "be terse"},
			{Role: llm.RoleUser, Content: "hi"},
			{Role: llm.RoleAssistant, Content: "prev"},
		},
	}
	c := New(srv.URL, nil)
	resp, err := c.Chat(context.Background(), "gk-test", req)
	if err != nil {
		t.Fatal(err)
	}

	if captured.SystemInstruction == nil || captured.SystemInstruction.Parts[0].Text != "be terse" {
		t.Errorf("systemInstruction = %+v", captured.SystemInstruction)
	}
	if len(captured.Contents) != 2 {
		t.Fatalf("contents = %+v", captured.Contents)
	}
	if captured.Contents[0].Role != "user" || captured.Contents[1].Role != "model" {
		t.Errorf("roles = %q, %q; want user, model", captured.Contents[0].Role, captured.Contents[1].Role)
	}

	if resp.Choices[0].Message.Content != "hi there" {
		t.Errorf("content = %q", resp.Choices[0].Message.Content)
	}
	if resp.Choices[0].FinishReason != "stop" {
		t.Errorf("finish = %q", resp.Choices[0].FinishReason)
	}
	if resp.Usage.PromptTokens != 10 || resp.Usage.CompletionTokens != 3 {
		t.Errorf("usage = %+v", resp.Usage)
	}
}

func TestStreamTranslation(t *testing.T) {
	chunks := []string{
		`data: {"candidates":[{"content":{"parts":[{"text":"Hel"}],"role":"model"}}]}` + "\n\n",
		`data: {"candidates":[{"content":{"parts":[{"text":"lo"}],"role":"model"}}]}` + "\n\n",
		`data: {"candidates":[{"content":{"parts":[{"text":""}],"role":"model"},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":8,"candidatesTokenCount":2,"totalTokenCount":10}}` + "\n\n",
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.Path, ":streamGenerateContent") || r.URL.Query().Get("alt") != "sse" {
			t.Errorf("unexpected stream request path=%q query=%q", r.URL.Path, r.URL.RawQuery)
		}
		fl := w.(http.Flusher)
		for _, ch := range chunks {
			io.WriteString(w, ch)
			fl.Flush()
		}
	}))
	defer srv.Close()

	c := New(srv.URL, nil)
	stream, err := c.StreamChat(context.Background(), "gk", &llm.ChatRequest{
		Model:    "gemini-2.5-flash",
		Messages: []llm.Message{{Role: llm.RoleUser, Content: "hi"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer stream.Close()

	var content, finish string
	var usage *llm.Usage
	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		if len(chunk.Choices) > 0 {
			content += chunk.Choices[0].Delta.Content
			if chunk.Choices[0].FinishReason != nil {
				finish = *chunk.Choices[0].FinishReason
			}
		}
		if chunk.Usage != nil {
			usage = chunk.Usage
		}
	}
	if content != "Hello" {
		t.Errorf("content = %q", content)
	}
	if finish != "stop" {
		t.Errorf("finish = %q", finish)
	}
	if usage == nil || usage.PromptTokens != 8 || usage.CompletionTokens != 2 {
		t.Errorf("usage = %+v", usage)
	}
}
