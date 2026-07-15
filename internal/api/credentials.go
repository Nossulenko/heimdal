package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/kaizenprojects/relaygw/internal/cryptox"
	"github.com/kaizenprojects/relaygw/internal/httpx"
	"github.com/kaizenprojects/relaygw/internal/store"
)

// allowedProviders is the set of providers a credential may target.
var allowedProviders = map[string]bool{
	"openai":    true,
	"anthropic": true,
	"google":    true,
}

type credentialDTO struct {
	ID        string     `json:"id"`
	Provider  string     `json:"provider"`
	CreatedAt time.Time  `json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt"`
}

// ListCredentials returns the org's provider credentials (never the secret).
func (a *API) ListCredentials(w http.ResponseWriter, r *http.Request) {
	creds, err := a.store.ListCredentials(r.Context(), org(r))
	if err != nil {
		a.log.Error("list credentials failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	out := make([]credentialDTO, 0, len(creds))
	for _, c := range creds {
		out = append(out, credentialDTO{ID: c.ID, Provider: c.Provider, CreatedAt: c.CreatedAt, RevokedAt: c.RevokedAt})
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}

type createCredentialRequest struct {
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
}

// CreateCredential encrypts and stores an upstream provider key for the org.
func (a *API) CreateCredential(w http.ResponseWriter, r *http.Request) {
	var req createCredentialRequest
	if !decode(w, r, &req) {
		return
	}
	if !allowedProviders[req.Provider] {
		httpx.WriteAPIError(w, http.StatusBadRequest, "unsupported provider")
		return
	}
	if req.APIKey == "" {
		httpx.WriteAPIError(w, http.StatusBadRequest, "apiKey is required")
		return
	}
	ciphertext, nonce, err := cryptox.Encrypt(a.encKey, []byte(req.APIKey))
	if err != nil {
		a.log.Error("encrypt credential failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	cred, err := a.store.CreateCredential(r.Context(), org(r), req.Provider, ciphertext, nonce, a.encKeyVer)
	if err != nil {
		a.log.Error("create credential failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, credentialDTO{ID: cred.ID, Provider: cred.Provider, CreatedAt: cred.CreatedAt})
}

// DeleteCredential revokes a provider credential.
func (a *API) DeleteCredential(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	err := a.store.RevokeCredential(r.Context(), org(r), id)
	if errors.Is(err, store.ErrNotFound) {
		httpx.WriteAPIError(w, http.StatusNotFound, "credential not found")
		return
	}
	if err != nil {
		a.log.Error("revoke credential failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
