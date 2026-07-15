package store

import (
	"context"
	"time"
)

// InsertUsage appends a usage record. Called off the request path by the async
// recorder.
func (s *Store) InsertUsage(ctx context.Context, r UsageRecord) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO usage_records
		 (org_id, api_key_id, logical_model, provider, prompt_tokens, completion_tokens, cost_micro_usd, savings_micro_usd, latency_ms, status, estimated)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		r.OrgID, r.APIKeyID, r.LogicalModel, r.Provider, r.PromptTokens, r.CompletionTokens,
		r.CostMicroUSD, r.SavingsMicroUSD, r.LatencyMS, r.Status, r.Estimated,
	)
	return err
}

// ListRecentUsage returns the most recent usage records for an org (the
// "recent messages" feed).
func (s *Store) ListRecentUsage(ctx context.Context, orgID string, limit int) ([]UsageRecord, error) {
	if limit <= 0 || limit > 200 {
		limit = 20
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, api_key_id, logical_model, provider, prompt_tokens, completion_tokens,
		        cost_micro_usd, savings_micro_usd, latency_ms, status, estimated, created_at
		 FROM usage_records WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2`,
		orgID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []UsageRecord
	for rows.Next() {
		var r UsageRecord
		if err := rows.Scan(&r.ID, &r.OrgID, &r.APIKeyID, &r.LogicalModel, &r.Provider,
			&r.PromptTokens, &r.CompletionTokens, &r.CostMicroUSD, &r.SavingsMicroUSD,
			&r.LatencyMS, &r.Status, &r.Estimated, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// UsageDay is a per-day aggregate.
type UsageDay struct {
	Date             time.Time
	Requests         int64
	CostMicroUSD     int64
	PromptTokens     int64
	CompletionTokens int64
}

// UsageByModel is a per-logical-model aggregate.
type UsageByModel struct {
	LogicalModel string
	CostMicroUSD int64
	Tokens       int64
	Requests     int64
}

// UsageSummary is the aggregated usage over a window.
type UsageSummary struct {
	TotalRequests        int64
	TotalCostMicroUSD    int64
	TotalSavingsMicroUSD int64
	TotalTokens          int64
	Series               []UsageDay
	ByModel              []UsageByModel
}

// AggregateUsage summarizes an org's usage between from and to (inclusive of
// from, exclusive of to).
func (s *Store) AggregateUsage(ctx context.Context, orgID string, from, to time.Time) (*UsageSummary, error) {
	sum := &UsageSummary{}

	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*),
		        COALESCE(SUM(cost_micro_usd),0),
		        COALESCE(SUM(savings_micro_usd),0),
		        COALESCE(SUM(prompt_tokens+completion_tokens),0)
		 FROM usage_records WHERE org_id = $1 AND created_at >= $2 AND created_at < $3`,
		orgID, from, to,
	).Scan(&sum.TotalRequests, &sum.TotalCostMicroUSD, &sum.TotalSavingsMicroUSD, &sum.TotalTokens)
	if err != nil {
		return nil, err
	}

	dayRows, err := s.pool.Query(ctx,
		`SELECT date_trunc('day', created_at) AS d,
		        COUNT(*), SUM(cost_micro_usd), SUM(prompt_tokens), SUM(completion_tokens)
		 FROM usage_records WHERE org_id = $1 AND created_at >= $2 AND created_at < $3
		 GROUP BY d ORDER BY d`,
		orgID, from, to,
	)
	if err != nil {
		return nil, err
	}
	defer dayRows.Close()
	for dayRows.Next() {
		var d UsageDay
		if err := dayRows.Scan(&d.Date, &d.Requests, &d.CostMicroUSD, &d.PromptTokens, &d.CompletionTokens); err != nil {
			return nil, err
		}
		sum.Series = append(sum.Series, d)
	}
	if err := dayRows.Err(); err != nil {
		return nil, err
	}

	modelRows, err := s.pool.Query(ctx,
		`SELECT logical_model, SUM(cost_micro_usd), SUM(prompt_tokens+completion_tokens), COUNT(*)
		 FROM usage_records WHERE org_id = $1 AND created_at >= $2 AND created_at < $3
		 GROUP BY logical_model ORDER BY SUM(cost_micro_usd) DESC`,
		orgID, from, to,
	)
	if err != nil {
		return nil, err
	}
	defer modelRows.Close()
	for modelRows.Next() {
		var m UsageByModel
		if err := modelRows.Scan(&m.LogicalModel, &m.CostMicroUSD, &m.Tokens, &m.Requests); err != nil {
			return nil, err
		}
		sum.ByModel = append(sum.ByModel, m)
	}
	return sum, modelRows.Err()
}
