package api

import (
	"net/http"
	"time"

	"github.com/kaizenprojects/relaygw/internal/httpx"
	"github.com/kaizenprojects/relaygw/internal/store"
)

type usageDayDTO struct {
	Date             string `json:"date"`
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
	TotalCostMicroUSD int64             `json:"totalCostMicroUsd"`
	TotalTokens       int64             `json:"totalTokens"`
	Series            []usageDayDTO     `json:"series"`
	ByModel           []usageByModelDTO `json:"byModel"`
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
		TotalCostMicroUSD: sum.TotalCostMicroUSD,
		TotalTokens:       sum.TotalTokens,
		Series:            make([]usageDayDTO, 0, len(sum.Series)),
		ByModel:           make([]usageByModelDTO, 0, len(sum.ByModel)),
	}
	for _, d := range sum.Series {
		out.Series = append(out.Series, usageDayDTO{
			Date:             d.Date.Format("2006-01-02"),
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
