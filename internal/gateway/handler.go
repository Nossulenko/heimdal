// Package gateway implements the OpenAI-compatible /v1 surface: request
// validation, the balance and rate-limit gates, dispatch through the router,
// buffered and streaming responses, and async metering.
package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/nossulenko/heimdal/internal/auth"
	"github.com/nossulenko/heimdal/internal/billing"
	"github.com/nossulenko/heimdal/internal/cache"
	"github.com/nossulenko/heimdal/internal/httpx"
	"github.com/nossulenko/heimdal/internal/llm"
	"github.com/nossulenko/heimdal/internal/ratelimit"
	"github.com/nossulenko/heimdal/internal/router"
	"github.com/nossulenko/heimdal/internal/store"
	"github.com/nossulenko/heimdal/internal/usage"

	"log/slog"
)

const maxBodyBytes = 1 << 20 // 1 MiB

// Handler serves the /v1 chat completions endpoint.
type Handler struct {
	router   *router.Router
	limiter  *ratelimit.Limiter
	recorder *usage.Recorder
	store    *store.Store
	cache    *cache.ResponseCache
	log      *slog.Logger
}

// NewHandler wires the gateway handler dependencies.
func NewHandler(rt *router.Router, lim *ratelimit.Limiter, rec *usage.Recorder, st *store.Store, rc *cache.ResponseCache, log *slog.Logger) *Handler {
	return &Handler{router: rt, limiter: lim, recorder: rec, store: st, cache: rc, log: log}
}

// ChatCompletions handles POST /v1/chat/completions. It assumes GatewayAuth has
// already attached the org to the context.
func (h *Handler) ChatCompletions(w http.ResponseWriter, r *http.Request) {
	orgID, ok := auth.OrgID(r.Context())
	if !ok {
		httpx.WriteOpenAIError(w, http.StatusUnauthorized, "unauthenticated", "invalid_request_error", "")
		return
	}
	apiKeyID, _ := auth.APIKeyID(r.Context())

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req llm.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteOpenAIError(w, http.StatusBadRequest, "invalid JSON body", "invalid_request_error", "")
		return
	}
	if req.Model == "" || len(req.Messages) == 0 {
		httpx.WriteOpenAIError(w, http.StatusBadRequest, "model and messages are required", "invalid_request_error", "")
		return
	}

	// Prepaid balance gate.
	bal, err := h.store.GetBalance(r.Context(), orgID)
	if err != nil {
		h.log.Error("balance lookup failed", "err", err)
		httpx.WriteOpenAIError(w, http.StatusInternalServerError, "internal error", "server_error", "")
		return
	}
	if !billing.HasCredit(bal.AmountMicroUSD) {
		httpx.WriteOpenAIError(w, http.StatusPaymentRequired, "insufficient balance", "insufficient_quota", "insufficient_balance")
		return
	}

	// Rate-limit gate (per org).
	rl, err := h.limiter.Allow(r.Context(), "org:"+orgID)
	if err != nil {
		h.log.Error("rate limit check failed", "err", err)
		// Fail open on limiter errors rather than blocking all traffic.
	} else {
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(rl.Limit))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(rl.Remaining))
		if !rl.Allowed {
			w.Header().Set("Retry-After", strconv.Itoa(int(rl.RetryAfter.Seconds())+1))
			httpx.WriteOpenAIError(w, http.StatusTooManyRequests, "rate limit exceeded", "rate_limit_exceeded", "")
			return
		}
	}

	noFallback := r.Header.Get("x-no-fallback") == "true" || r.Header.Get("x-no-fallback") == "1"
	xroute := r.Header.Get("x-route")
	sortByCost := xroute == "cost" || xroute == "cheapest" || xroute == "price"
	sortByLatency := xroute == "latency" || xroute == "fastest"
	meta := requestMeta{orgID: orgID, apiKeyID: apiKeyID, logicalModel: req.Model, start: time.Now(), noFallback: noFallback, sortByCost: sortByCost, sortByLatency: sortByLatency}
	if req.Stream {
		h.handleStream(w, r, &req, meta)
	} else {
		h.handleBuffered(w, r, &req, meta)
	}
}

type requestMeta struct {
	orgID         string
	apiKeyID      string
	logicalModel  string
	start         time.Time
	noFallback    bool
	sortByCost    bool
	sortByLatency bool
}

func (m requestMeta) routeOptions() router.Options {
	return router.Options{NoFallback: m.noFallback, SortByCost: m.sortByCost, SortByLatency: m.sortByLatency}
}

func (h *Handler) handleBuffered(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, meta requestMeta) {
	// Cache only deterministic requests (temperature 0/unset), when enabled and
	// not opted out for this request.
	cacheable := h.cache.Enabled() && !noCache(r) && (req.Temperature == nil || *req.Temperature == 0)
	var cacheKey string
	if cacheable {
		cacheKey = cache.Key(meta.orgID, req)
		if cached, hit, err := h.cache.Get(r.Context(), cacheKey); err != nil {
			h.log.Warn("cache get failed", "err", err)
		} else if hit {
			w.Header().Set("X-Cache", "HIT")
			httpx.WriteJSON(w, http.StatusOK, cached)
			// A cache hit costs nothing upstream: meter it at zero cost.
			h.recordTokens(meta, router.Route{Provider: "cache"},
				cached.Usage.PromptTokens, cached.Usage.CompletionTokens, 0, "cache_hit", false)
			return
		}
	}

	resp, route, err := h.router.Chat(r.Context(), meta.orgID, req, meta.routeOptions())
	if err != nil {
		h.writeRouteError(w, err)
		h.record(meta, route, 0, 0, "error", false)
		return
	}

	pt, ct := resp.Usage.PromptTokens, resp.Usage.CompletionTokens
	estimated := false
	if pt == 0 && ct == 0 {
		pt = llm.EstimatePromptTokens(req.Messages)
		if len(resp.Choices) > 0 {
			ct = llm.EstimateTokens(resp.Choices[0].Message.Content)
		}
		estimated = true
	}

	cost := billing.CostMicroUSD(route.InputPricePerToken, route.OutputPricePerToken, pt, ct)
	if cacheable {
		w.Header().Set("X-Cache", "MISS")
	}
	httpx.WriteJSON(w, http.StatusOK, resp)
	if cacheable {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := h.cache.Set(ctx, cacheKey, resp); err != nil {
			h.log.Warn("cache set failed", "err", err)
		}
	}
	h.recordTokens(meta, route, pt, ct, cost, "success", estimated)
}

func noCache(r *http.Request) bool {
	v := r.Header.Get("x-no-cache")
	return v == "true" || v == "1"
}

func (h *Handler) handleStream(w http.ResponseWriter, r *http.Request, req *llm.ChatRequest, meta requestMeta) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		httpx.WriteOpenAIError(w, http.StatusInternalServerError, "streaming unsupported", "server_error", "")
		return
	}

	stream, route, err := h.router.StreamChat(r.Context(), meta.orgID, req, meta.routeOptions())
	if err != nil {
		// No bytes flushed yet: a normal JSON error is still valid.
		h.writeRouteError(w, err)
		h.record(meta, route, 0, 0, "error", false)
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	var (
		reported     *llm.Usage
		completionSb int
	)

	for {
		if r.Context().Err() != nil {
			// Client disconnected; stop and meter what we have.
			h.log.Debug("client disconnected mid-stream", "org", meta.orgID)
			break
		}
		chunk, rerr := stream.Recv()
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			// Mid-stream failure: cannot fall back. Surface an error event and
			// end the stream cleanly.
			h.log.Warn("stream error", "err", rerr)
			writeSSE(w, `{"error":{"message":"upstream stream error","type":"server_error"}}`)
			flusher.Flush()
			h.finishStream(w, flusher, meta, route, req, reported, completionSb, "error")
			return
		}
		if chunk.Usage != nil {
			reported = chunk.Usage
		}
		for _, c := range chunk.Choices {
			completionSb += len(c.Delta.Content)
		}
		buf, _ := json.Marshal(chunk)
		if _, werr := writeSSEBytes(w, buf); werr != nil {
			// Client write failed: treat as disconnect.
			break
		}
		flusher.Flush()
	}

	h.finishStream(w, flusher, meta, route, req, reported, completionSb, "success")
}

func (h *Handler) finishStream(w http.ResponseWriter, flusher http.Flusher, meta requestMeta, route router.Route, req *llm.ChatRequest, reported *llm.Usage, completionChars int, status string) {
	writeSSE(w, "[DONE]")
	flusher.Flush()

	var pt, ct int
	estimated := false
	if reported != nil && (reported.PromptTokens > 0 || reported.CompletionTokens > 0) {
		pt, ct = reported.PromptTokens, reported.CompletionTokens
	} else {
		pt = llm.EstimatePromptTokens(req.Messages)
		ct = completionChars / 4
		if ct < 1 && completionChars > 0 {
			ct = 1
		}
		estimated = true
	}
	cost := billing.CostMicroUSD(route.InputPricePerToken, route.OutputPricePerToken, pt, ct)
	h.recordTokens(meta, route, pt, ct, cost, status, estimated)
}

func (h *Handler) writeRouteError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, router.ErrModelNotFound):
		httpx.WriteOpenAIError(w, http.StatusNotFound, "model not found", "invalid_request_error", "model_not_found")
	case errors.Is(err, router.ErrNoCredential):
		httpx.WriteOpenAIError(w, http.StatusBadGateway, "no upstream credential configured", "server_error", "no_credential")
	default:
		var pe *llm.ProviderError
		if errors.As(err, &pe) && pe.StatusCode >= 400 && pe.StatusCode < 600 {
			httpx.WriteOpenAIError(w, pe.StatusCode, pe.Message, "upstream_error", "")
			return
		}
		httpx.WriteOpenAIError(w, http.StatusBadGateway, "upstream request failed", "server_error", "")
	}
}

func (h *Handler) record(meta requestMeta, route router.Route, pt, ct int, status string, estimated bool) {
	h.recordTokens(meta, route, pt, ct, 0, status, estimated)
}

func (h *Handler) recordTokens(meta requestMeta, route router.Route, pt, ct int, cost int64, status string, estimated bool) {
	var keyID *string
	if meta.apiKeyID != "" {
		keyID = &meta.apiKeyID
	}
	provider := route.Provider
	if provider == "" {
		provider = "none"
	}
	h.recorder.Record(store.UsageRecord{
		OrgID:            meta.orgID,
		APIKeyID:         keyID,
		LogicalModel:     meta.logicalModel,
		Provider:         provider,
		PromptTokens:     pt,
		CompletionTokens: ct,
		CostMicroUSD:     cost,
		LatencyMS:        int(time.Since(meta.start).Milliseconds()),
		Status:           status,
		Estimated:        estimated,
	})
}

func writeSSE(w http.ResponseWriter, data string) {
	_, _ = io.WriteString(w, "data: "+data+"\n\n")
}

func writeSSEBytes(w http.ResponseWriter, data []byte) (int, error) {
	if _, err := io.WriteString(w, "data: "); err != nil {
		return 0, err
	}
	if _, err := w.Write(data); err != nil {
		return 0, err
	}
	return io.WriteString(w, "\n\n")
}
