// Package server wires the application together: providers, router, limiter,
// metering, auth, and HTTP routing, with health/readiness endpoints and
// graceful shutdown support.
package server

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/redis/go-redis/v9"

	"log/slog"

	"github.com/nossulenko/heimdal/internal/api"
	"github.com/nossulenko/heimdal/internal/auth"
	"github.com/nossulenko/heimdal/internal/cache"
	"github.com/nossulenko/heimdal/internal/config"
	"github.com/nossulenko/heimdal/internal/gateway"
	"github.com/nossulenko/heimdal/internal/httpx"
	"github.com/nossulenko/heimdal/internal/llm"
	"github.com/nossulenko/heimdal/internal/llm/anthropic"
	"github.com/nossulenko/heimdal/internal/llm/openai"
	"github.com/nossulenko/heimdal/internal/ratelimit"
	"github.com/nossulenko/heimdal/internal/router"
	"github.com/nossulenko/heimdal/internal/store"
	"github.com/nossulenko/heimdal/internal/usage"
)

// Server holds the built HTTP handler and the background components that need
// draining at shutdown.
type Server struct {
	handler  http.Handler
	recorder *usage.Recorder
	registry *router.Registry
	store    *store.Store
	rdb      *redis.Client
	log      *slog.Logger
}

// New builds the server: it constructs providers, loads the model registry,
// wires the router/limiter/metering, and mounts all routes.
func New(cfg *config.Config, st *store.Store, rdb *redis.Client, log *slog.Logger) (*Server, error) {
	providers := map[string]llm.Provider{
		"openai":    openai.New(cfg.OpenAIBaseURL, nil),
		"anthropic": anthropic.New(cfg.AnthropicBaseURL, nil),
	}

	registry := router.NewRegistry()
	models, err := st.ListActiveModels(context.Background())
	if err != nil {
		return nil, err
	}
	registry.Load(models)
	log.Info("model registry loaded", "logical_models", registry.Size())

	breakers := router.NewBreakers(5, 30*time.Second)
	resolver := &router.StoreResolver{Store: st, Key: cfg.EncryptionKey}
	rt := router.New(registry, providers, resolver, breakers, log)

	limiter := ratelimit.New(rdb, 60, 1)

	recorder := usage.NewRecorder(st, 2048, log)
	recorder.Start()

	responseCache := cache.New(rdb, cfg.CacheTTL)
	if responseCache.Enabled() {
		log.Info("response cache enabled", "ttl", cfg.CacheTTL.String())
	}

	authn := auth.NewAuthenticator(st, cfg.APIKeyPepper, cfg.SessionSecret, log)
	gw := gateway.NewHandler(rt, limiter, recorder, st, responseCache, log)
	mgmt := api.New(st, api.Config{
		Pepper:        cfg.APIKeyPepper,
		EncKey:        cfg.EncryptionKey,
		EncKeyVer:     cfg.EncryptionKeyVer,
		SessionSecret: cfg.SessionSecret,
		SessionTTL:    24 * time.Hour,
	}, log)

	s := &Server{recorder: recorder, registry: registry, store: st, rdb: rdb, log: log}
	s.handler = s.routes(cfg, authn, gw, mgmt)
	return s, nil
}

func (s *Server) routes(cfg *config.Config, authn *auth.Authenticator, gw *gateway.Handler, mgmt *api.API) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(requestLogger(s.log))
	r.Use(cors(cfg.CORSOrigins))

	r.Get("/healthz", s.health)
	r.Get("/readyz", s.ready)

	// OpenAI-compatible gateway surface.
	r.Group(func(r chi.Router) {
		r.Use(authn.GatewayAuth)
		r.Post("/v1/chat/completions", gw.ChatCompletions)
		r.Get("/v1/models", gw.ListModels)
	})

	// Management/dashboard API.
	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/login", mgmt.Login)

		r.Group(func(r chi.Router) {
			r.Use(authn.DashboardAuth)

			r.Get("/keys", mgmt.ListKeys)
			r.Post("/keys", mgmt.CreateKey)
			r.Delete("/keys/{id}", mgmt.DeleteKey)

			r.Get("/credentials", mgmt.ListCredentials)
			r.Post("/credentials", mgmt.CreateCredential)
			r.Delete("/credentials/{id}", mgmt.DeleteCredential)

			r.Get("/models", mgmt.ListModels)
			r.Get("/usage", mgmt.Usage)
			r.Get("/balance", mgmt.Balance)
			r.Get("/invoices", mgmt.Invoices)
		})
	})

	return r
}

// Handler returns the built HTTP handler.
func (s *Server) Handler() http.Handler { return s.handler }

// Close drains background components (currently the async usage recorder).
func (s *Server) Close() {
	s.recorder.Close()
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Pool().Ping(ctx); err != nil {
		httpx.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "db unavailable"})
		return
	}
	if err := s.rdb.Ping(ctx).Err(); err != nil {
		httpx.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "redis unavailable"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}
