// Package sse provides a minimal Server-Sent Events reader used by provider
// adapters to consume streaming upstream responses. It parses the framing
// (event/data fields separated by blank lines) and leaves interpretation of
// the payload to the caller.
package sse

import (
	"bufio"
	"io"
	"strings"
)

// Event is a single decoded SSE event. Name is the value of the last "event:"
// field in the frame (empty if none). Data is the concatenation of all "data:"
// fields in the frame, joined by newlines.
type Event struct {
	Name string
	Data string
}

// Scanner reads SSE events from an io.Reader one frame at a time.
type Scanner struct {
	r   *bufio.Reader
	err error
}

// NewScanner returns a Scanner reading from r. A generous buffer is used so
// large JSON payloads in a single data field are not truncated.
func NewScanner(r io.Reader) *Scanner {
	return &Scanner{r: bufio.NewReaderSize(r, 64*1024)}
}

// Next returns the next event. It returns io.EOF when the stream ends cleanly
// with no partial frame pending. Any other error (including a network read
// error) is returned to the caller so it can be surfaced mid-stream.
func (s *Scanner) Next() (*Event, error) {
	if s.err != nil {
		return nil, s.err
	}

	var (
		ev      Event
		data    []string
		hadData bool
		hadLine bool
	)

	for {
		line, err := s.r.ReadString('\n')
		if len(line) > 0 {
			hadLine = true
			trimmed := strings.TrimRight(line, "\r\n")

			// Blank line terminates the frame.
			if trimmed == "" {
				if hadData || ev.Name != "" {
					ev.Data = strings.Join(data, "\n")
					return &ev, nil
				}
				// Empty frame (e.g. leading blank lines): keep reading.
				data = data[:0]
				ev = Event{}
				hadData = false
				continue
			}

			// Comments start with ":".
			if strings.HasPrefix(trimmed, ":") {
				continue
			}

			field, value, found := strings.Cut(trimmed, ":")
			if found && strings.HasPrefix(value, " ") {
				value = value[1:]
			}
			switch field {
			case "event":
				ev.Name = value
			case "data":
				data = append(data, value)
				hadData = true
			default:
				// Ignore unknown fields (id, retry, ...).
			}
		}

		if err != nil {
			s.err = err
			// Flush a trailing frame that had no terminating blank line.
			if err == io.EOF && (hadData || ev.Name != "") {
				ev.Data = strings.Join(data, "\n")
				return &ev, nil
			}
			if err == io.EOF && !hadLine {
				return nil, io.EOF
			}
			return nil, err
		}
	}
}
