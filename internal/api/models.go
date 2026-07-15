package api

import (
	"net/http"

	"github.com/kaizenprojects/relaygw/internal/httpx"
)

type modelDTO struct {
	LogicalName         string  `json:"logicalName"`
	Provider            string  `json:"provider"`
	ProviderModelID     string  `json:"providerModelId"`
	InputPricePerToken  float64 `json:"inputPricePerToken"`
	OutputPricePerToken float64 `json:"outputPricePerToken"`
	Active              bool    `json:"active"`
}

// ListModels returns the model registry for display.
func (a *API) ListModels(w http.ResponseWriter, r *http.Request) {
	models, err := a.store.ListModels(r.Context())
	if err != nil {
		a.log.Error("list models failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	out := make([]modelDTO, 0, len(models))
	for _, m := range models {
		out = append(out, modelDTO{
			LogicalName:         m.LogicalName,
			Provider:            m.Provider,
			ProviderModelID:     m.ProviderModelID,
			InputPricePerToken:  m.InputPricePerToken,
			OutputPricePerToken: m.OutputPricePerToken,
			Active:              m.Active,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}
