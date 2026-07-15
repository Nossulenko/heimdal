// Package api implements the management/dashboard JSON API consumed by the
// frontend: authentication plus org-scoped CRUD for API keys, provider
// credentials, models, usage, and billing. Every handler except Login runs
// behind DashboardAuth and derives the org from the session, never the body.
package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/kaizenprojects/relaygw/internal/auth"
	"github.com/kaizenprojects/relaygw/internal/cryptox"
	"github.com/kaizenprojects/relaygw/internal/httpx"
	"github.com/kaizenprojects/relaygw/internal/store"
)

// API holds the management API dependencies.
type API struct {
	store         *store.Store
	pepper        []byte
	encKey        []byte
	encKeyVer     int
	sessionSecret []byte
	sessionTTL    time.Duration
	log           *slog.Logger
}

// Config configures the management API.
type Config struct {
	Pepper        []byte
	EncKey        []byte
	EncKeyVer     int
	SessionSecret []byte
	SessionTTL    time.Duration
}

// New builds a management API.
func New(st *store.Store, cfg Config, log *slog.Logger) *API {
	ttl := cfg.SessionTTL
	if ttl == 0 {
		ttl = 24 * time.Hour
	}
	return &API{
		store:         st,
		pepper:        cfg.Pepper,
		encKey:        cfg.EncKey,
		encKeyVer:     cfg.EncKeyVer,
		sessionSecret: cfg.SessionSecret,
		sessionTTL:    ttl,
		log:           log,
	}
}

// decode reads a JSON body into v, writing a 400 on failure.
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(v); err != nil {
		httpx.WriteAPIError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

// org returns the authenticated org id; handlers behind DashboardAuth always
// have one.
func org(r *http.Request) string {
	id, _ := auth.OrgID(r.Context())
	return id
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type orgDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type loginResponse struct {
	Token string `json:"token"`
	Org   orgDTO `json:"org"`
}

// Login authenticates a dashboard user and issues a session token.
func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decode(w, r, &req) {
		return
	}
	user, err := a.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			a.log.Error("user lookup failed", "err", err)
		}
		httpx.WriteAPIError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if !cryptox.CheckPassword(user.PasswordHash, req.Password) {
		httpx.WriteAPIError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	org, err := a.store.GetOrg(r.Context(), user.OrgID)
	if err != nil {
		a.log.Error("org lookup failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	token, err := auth.IssueSession(a.sessionSecret, auth.Session{
		UserID:    user.ID,
		OrgID:     user.OrgID,
		ExpiresAt: time.Now().Add(a.sessionTTL).Unix(),
	})
	if err != nil {
		a.log.Error("issue session failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, loginResponse{Token: token, Org: orgDTO{ID: org.ID, Name: org.Name}})
}
