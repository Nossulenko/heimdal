package auth

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/nossulenko/heimdal/internal/cryptox"
	"github.com/nossulenko/heimdal/internal/httpx"
	"github.com/nossulenko/heimdal/internal/store"
)

// Authenticator resolves gateway API keys and dashboard sessions.
type Authenticator struct {
	store         *store.Store
	pepper        []byte
	sessionSecret []byte
	log           *slog.Logger
}

// NewAuthenticator builds an Authenticator.
func NewAuthenticator(st *store.Store, pepper, sessionSecret []byte, log *slog.Logger) *Authenticator {
	return &Authenticator{store: st, pepper: pepper, sessionSecret: sessionSecret, log: log}
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	if v, ok := strings.CutPrefix(h, "Bearer "); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

// GatewayAuth authenticates a /v1 request by API key. On success the org and
// key id are attached to the context; on failure it writes an OpenAI-style 401.
func (a *Authenticator) GatewayAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if token == "" {
			httpx.WriteOpenAIError(w, http.StatusUnauthorized, "missing API key", "invalid_request_error", "missing_api_key")
			return
		}
		hash := cryptox.HashAPIKey(a.pepper, token)
		key, err := a.store.GetActiveAPIKeyByHash(r.Context(), hash)
		if err != nil {
			if !errors.Is(err, store.ErrNotFound) {
				a.log.Error("api key lookup failed", "err", err)
			}
			httpx.WriteOpenAIError(w, http.StatusUnauthorized, "invalid API key", "invalid_request_error", "invalid_api_key")
			return
		}

		// Record last-used off the request path.
		go func(id string) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err := a.store.TouchAPIKey(ctx, id, time.Now()); err != nil {
				a.log.Debug("touch api key failed", "err", err)
			}
		}(key.ID)

		ctx := WithOrg(r.Context(), key.OrgID)
		ctx = WithAPIKeyID(ctx, key.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// DashboardAuth authenticates a management-API request by session token
// (Authorization: Bearer, or the "session" cookie for SSR).
func (a *Authenticator) DashboardAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if token == "" {
			if c, err := r.Cookie("session"); err == nil {
				token = c.Value
			}
		}
		if token == "" {
			httpx.WriteAPIError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		sess, err := VerifySession(a.sessionSecret, token, time.Now())
		if err != nil {
			httpx.WriteAPIError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		ctx := WithOrg(r.Context(), sess.OrgID)
		ctx = WithUserID(ctx, sess.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
