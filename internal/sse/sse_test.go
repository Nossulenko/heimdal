package sse

import (
	"io"
	"strings"
	"testing"
)

func collect(t *testing.T, input string) []Event {
	t.Helper()
	sc := NewScanner(strings.NewReader(input))
	var evs []Event
	for {
		ev, err := sc.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		evs = append(evs, *ev)
	}
	return evs
}

func TestDataOnlyEvents(t *testing.T) {
	evs := collect(t, "data: {\"a\":1}\n\ndata: [DONE]\n\n")
	if len(evs) != 2 {
		t.Fatalf("got %d events, want 2", len(evs))
	}
	if evs[0].Data != `{"a":1}` {
		t.Errorf("event 0 data = %q", evs[0].Data)
	}
	if evs[1].Data != "[DONE]" {
		t.Errorf("event 1 data = %q", evs[1].Data)
	}
}

func TestNamedEvent(t *testing.T) {
	evs := collect(t, "event: message_start\ndata: {\"x\":true}\n\n")
	if len(evs) != 1 {
		t.Fatalf("got %d events, want 1", len(evs))
	}
	if evs[0].Name != "message_start" {
		t.Errorf("name = %q", evs[0].Name)
	}
	if evs[0].Data != `{"x":true}` {
		t.Errorf("data = %q", evs[0].Data)
	}
}

func TestMultilineDataJoined(t *testing.T) {
	evs := collect(t, "data: line1\ndata: line2\n\n")
	if len(evs) != 1 || evs[0].Data != "line1\nline2" {
		t.Fatalf("got %+v", evs)
	}
}

func TestCommentsIgnored(t *testing.T) {
	evs := collect(t, ": this is a comment\ndata: hi\n\n")
	if len(evs) != 1 || evs[0].Data != "hi" {
		t.Fatalf("got %+v", evs)
	}
}

func TestTrailingFrameWithoutBlankLine(t *testing.T) {
	evs := collect(t, "data: final")
	if len(evs) != 1 || evs[0].Data != "final" {
		t.Fatalf("got %+v", evs)
	}
}
