package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/nossulenko/heimdal/internal/httpx"
	"github.com/nossulenko/heimdal/internal/store"
)

type usageDayDTO struct {
	Date             string `json:"date"`
	Requests         int64  `json:"requests"`
	CostMicroUSD     int64  `json:"costMicroUsd"`
	PromptTokens     int64  `json:"promptTokens"`
	CompletionTokens int64  `json:"completionTokens"`
}

type usageByModelDTO struct {
	LogicalModel string `json:"logicalModel"`
	CostMicroUSD int64  `json:"costMicroUsd"`
	Tokens       int64  `json:"tokens"`
	Requests     int64  `json:"requests"`
}

type usageResponse struct {
	TotalRequests        int64             `json:"totalRequests"`
	TotalCostMicroUSD    int64             `json:"totalCostMicroUsd"`
	TotalSavingsMicroUSD int64             `json:"totalSavingsMicroUsd"`
	TotalTokens          int64             `json:"totalTokens"`
	Series               []usageDayDTO     `json:"series"`
	ByModel              []usageByModelDTO `json:"byModel"`
}

// Usage returns aggregated usage for the org over [from, to). Defaults to the
// last 30 days.
func (a *API) Usage(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	from := now.AddDate(0, 0, -30)
	to := now
	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}

	sum, err := a.store.AggregateUsage(r.Context(), org(r), from, to)
	if err != nil {
		a.log.Error("aggregate usage failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, toUsageResponse(sum))
}

func toUsageResponse(sum *store.UsageSummary) usageResponse {
	out := usageResponse{
		TotalRequests:        sum.TotalRequests,
		TotalCostMicroUSD:    sum.TotalCostMicroUSD,
		TotalSavingsMicroUSD: sum.TotalSavingsMicroUSD,
		TotalTokens:          sum.TotalTokens,
		Series:               make([]usageDayDTO, 0, len(sum.Series)),
		ByModel:              make([]usageByModelDTO, 0, len(sum.ByModel)),
	}
	for _, d := range sum.Series {
		out.Series = append(out.Series, usageDayDTO{
			Date:             d.Date.Format("2006-01-02"),
			Requests:         d.Requests,
			CostMicroUSD:     d.CostMicroUSD,
			PromptTokens:     d.PromptTokens,
			CompletionTokens: d.CompletionTokens,
		})
	}
	for _, m := range sum.ByModel {
		out.ByModel = append(out.ByModel, usageByModelDTO{
			LogicalModel: m.LogicalModel,
			CostMicroUSD: m.CostMicroUSD,
			Tokens:       m.Tokens,
			Requests:     m.Requests,
		})
	}
	return out
}

type recentMessageDTO struct {
	ID               string    `json:"id"`
	LogicalModel     string    `json:"logicalModel"`
	Provider         string    `json:"provider"`
	PromptTokens     int       `json:"promptTokens"`
	CompletionTokens int       `json:"completionTokens"`
	Tokens           int       `json:"tokens"`
	CostMicroUSD     int64     `json:"costMicroUsd"`
	SavingsMicroUSD  int64     `json:"savingsMicroUsd"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"createdAt"`
}

// RecentUsage returns the org's most recent requests (the "recent messages"
// feed on the dashboard).
func (a *API) RecentUsage(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	records, err := a.store.ListRecentUsage(r.Context(), org(r), limit)
	if err != nil {
		a.log.Error("recent usage failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	out := make([]recentMessageDTO, 0, len(records))
	for _, rec := range records {
		out = append(out, recentMessageDTO{
			ID:               rec.ID,
			LogicalModel:     rec.LogicalModel,
			Provider:         rec.Provider,
			PromptTokens:     rec.PromptTokens,
			CompletionTokens: rec.CompletionTokens,
			Tokens:           rec.PromptTokens + rec.CompletionTokens,
			CostMicroUSD:     rec.CostMicroUSD,
			SavingsMicroUSD:  rec.SavingsMicroUSD,
			Status:           rec.Status,
			CreatedAt:        rec.CreatedAt,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}
