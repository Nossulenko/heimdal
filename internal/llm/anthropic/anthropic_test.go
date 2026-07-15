package anthropic

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nossulenko/heimdal/internal/llm"
)

func TestChatTranslation(t *testing.T) {
	var captured anthropicRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "ak-test" {
			t.Errorf("missing x-api-key")
		}
		if r.Header.Get("anthropic-version") == "" {
			t.Errorf("missing anthropic-version")
		}
		json.NewDecoder(r.Body).Decode(&captured)
		io.WriteString(w, `{
			"id":"msg_1","model":"claude-3-5-haiku-latest",
			"content":[{"type":"text","text":"hi there"}],
			"stop_reason":"end_turn",
			"usage":{"input_tokens":10,"output_tokens":3}
		}`)
	}))
	defer srv.Close()

	req := &llm.ChatRequest{
		Model: "claude-3-5-haiku-latest",
		Messages: []llm.Message{
			{Role: llm.RoleSystem, Content: "be terse"},
			{Role: llm.RoleUser, Content: "hi"},
		},
	}
	c := New(srv.URL, nil)
	resp, err := c.Chat(context.Background(), "ak-test", req)
	if err != nil {
		t.Fatal(err)
	}

	// System message lifted out; max_tokens defaulted; only user message left.
	if captured.System != "be terse" {
		t.Errorf("system = %q", captured.System)
	}
	if captured.MaxTokens != defaultMaxTokens {
		t.Errorf("max_tokens = %d, want default %d", captured.MaxTokens, defaultMaxTokens)
	}
	if len(captured.Messages) != 1 || captured.Messages[0].Role != "user" {
		t.Errorf("messages = %+v", captured.Messages)
	}

	if resp.Choices[0].Message.Content != "hi there" {
		t.Errorf("content = %q", resp.Choices[0].Message.Content)
	}
	if resp.Choices[0].FinishReason != "stop" {
		t.Errorf("finish_reason = %q, want stop", resp.Choices[0].FinishReason)
	}
	if resp.Usage.PromptTokens != 10 || resp.Usage.CompletionTokens != 3 {
		t.Errorf("usage = %+v", resp.Usage)
	}
}

func TestStopReasonMapping(t *testing.T) {
	cases := map[string]string{
		"end_turn":      "stop",
		"max_tokens":    "length",
		"stop_sequence": "stop",
		"tool_use":      "tool_calls",
	}
	for in, want := range cases {
		if got := mapStopReason(in); got != want {
			t.Errorf("mapStopReason(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestStreamTranslation(t *testing.T) {
	events := []string{
		"event: message_start\ndata: {\"message\":{\"id\":\"msg_1\",\"model\":\"claude-3-5-haiku-latest\",\"usage\":{\"input_tokens\":8}}}\n\n",
		"event: content_block_start\ndata: {\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\n",
		"event: content_block_delta\ndata: {\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hel\"}}\n\n",
		"event: content_block_delta\ndata: {\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"lo\"}}\n\n",
		"event: content_block_stop\ndata: {\"index\":0}\n\n",
		"event: message_delta\ndata: {\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":2}}\n\n",
		"event: message_stop\ndata: {}\n\n",
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fl := w.(http.Flusher)
		for _, e := range events {
			io.WriteString(w, e)
			fl.Flush()
		}
	}))
	defer srv.Close()

	c := New(srv.URL, nil)
	stream, err := c.StreamChat(context.Background(), "ak", &llm.ChatRequest{
		Model:    "claude-3-5-haiku-latest",
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
		t.Errorf("finish = %q, want stop", finish)
	}
	if usage == nil || usage.PromptTokens != 8 || usage.CompletionTokens != 2 {
		t.Errorf("usage = %+v", usage)
	}
}
