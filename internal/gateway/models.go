package gateway

import (
	"net/http"

	"github.com/nossulenko/heimdal/internal/httpx"
)

type modelObject struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}

type modelList struct {
	Object string        `json:"object"`
	Data   []modelObject `json:"data"`
}

// ListModels serves the OpenAI-compatible GET /v1/models: the distinct logical
// model names the gateway can route to. Many OpenAI clients call this on init.
func (h *Handler) ListModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.store.ListActiveModels(r.Context())
	if err != nil {
		h.log.Error("list models failed", "err", err)
		httpx.WriteOpenAIError(w, http.StatusInternalServerError, "internal error", "server_error", "")
		return
	}

	// Registry rows are ordered by (logical_name, priority); keep the first
	// occurrence of each logical name so its primary provider owns it.
	seen := make(map[string]bool)
	out := modelList{Object: "list", Data: make([]modelObject, 0)}
	for _, m := range models {
		if seen[m.LogicalName] {
			continue
		}
		seen[m.LogicalName] = true
		out.Data = append(out.Data, modelObject{
			ID:      m.LogicalName,
			Object:  "model",
			Created: m.CreatedAt.Unix(),
			OwnedBy: m.Provider,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}
