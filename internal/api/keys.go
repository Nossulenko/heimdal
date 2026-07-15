package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/nossulenko/heimdal/internal/cryptox"
	"github.com/nossulenko/heimdal/internal/httpx"
	"github.com/nossulenko/heimdal/internal/store"
)

type apiKeyDTO struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"keyPrefix"`
	LastUsedAt *time.Time `json:"lastUsedAt"`
	CreatedAt  time.Time  `json:"createdAt"`
	RevokedAt  *time.Time `json:"revokedAt"`
}

func toAPIKeyDTO(k store.APIKey) apiKeyDTO {
	return apiKeyDTO{
		ID:         k.ID,
		Name:       k.Name,
		KeyPrefix:  k.KeyPrefix,
		LastUsedAt: k.LastUsedAt,
		CreatedAt:  k.CreatedAt,
		RevokedAt:  k.RevokedAt,
	}
}

// ListKeys returns the org's API keys.
func (a *API) ListKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := a.store.ListAPIKeys(r.Context(), org(r))
	if err != nil {
		a.log.Error("list keys failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	out := make([]apiKeyDTO, 0, len(keys))
	for _, k := range keys {
		out = append(out, toAPIKeyDTO(k))
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}

type createKeyRequest struct {
	Name string `json:"name"`
}

type createKeyResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	KeyPrefix string `json:"keyPrefix"`
	Plaintext string `json:"plaintext"`
}

// CreateKey mints a new API key. The plaintext is returned exactly once.
func (a *API) CreateKey(w http.ResponseWriter, r *http.Request) {
	var req createKeyRequest
	if !decode(w, r, &req) {
		return
	}
	if req.Name == "" {
		req.Name = "default"
	}
	plaintext, prefix, err := cryptox.GenerateAPIKey()
	if err != nil {
		a.log.Error("generate key failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	hash := cryptox.HashAPIKey(a.pepper, plaintext)
	key, err := a.store.CreateAPIKey(r.Context(), org(r), req.Name, hash, prefix)
	if err != nil {
		a.log.Error("create key failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, createKeyResponse{
		ID:        key.ID,
		Name:      key.Name,
		KeyPrefix: key.KeyPrefix,
		Plaintext: plaintext,
	})
}

// DeleteKey revokes an API key.
func (a *API) DeleteKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	err := a.store.RevokeAPIKey(r.Context(), org(r), id)
	if errors.Is(err, store.ErrNotFound) {
		httpx.WriteAPIError(w, http.StatusNotFound, "key not found")
		return
	}
	if err != nil {
		a.log.Error("revoke key failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
