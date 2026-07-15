// Package httpx holds small HTTP response helpers shared by the gateway and
// management API handlers.
package httpx

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// WriteJSON writes v as JSON with the given status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			slog.Error("write json failed", "err", err)
		}
	}
}

// openAIError mirrors OpenAI's error envelope so OpenAI-compatible clients can
// parse gateway errors.
type openAIError struct {
	Error openAIErrorBody `json:"error"`
}

type openAIErrorBody struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code,omitempty"`
}

// WriteOpenAIError writes an OpenAI-style error envelope. Used on the /v1 path.
func WriteOpenAIError(w http.ResponseWriter, status int, message, typ, code string) {
	WriteJSON(w, status, openAIError{Error: openAIErrorBody{Message: message, Type: typ, Code: code}})
}

// apiError is the management API's simpler error shape.
type apiError struct {
	Error string `json:"error"`
}

// WriteAPIError writes a management-API error.
func WriteAPIError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, apiError{Error: message})
}
