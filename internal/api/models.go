package api

import (
	"net/http"

	"github.com/nossulenko/heimdal/internal/httpx"
	"github.com/nossulenko/heimdal/internal/store"
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
	httpx.WriteJSON(w, http.StatusOK, toModelDTOs(models))
}

// Catalog is the PUBLIC (unauthenticated) model catalog: the active models the
// gateway can route to, with pricing. Powers the public browse/compare page.
func (a *API) Catalog(w http.ResponseWriter, r *http.Request) {
	models, err := a.store.ListActiveModels(r.Context())
	if err != nil {
		a.log.Error("catalog list failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, toModelDTOs(models))
}

func toModelDTOs(models []store.Model) []modelDTO {
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
	return out
}
