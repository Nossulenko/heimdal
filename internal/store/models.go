package store

import "context"

const modelCols = `id, logical_name, provider, provider_model_id, input_price_per_token, output_price_per_token, priority, active, created_at`

func scanModels(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}) ([]Model, error) {
	var out []Model
	for rows.Next() {
		var m Model
		if err := rows.Scan(&m.ID, &m.LogicalName, &m.Provider, &m.ProviderModelID,
			&m.InputPricePerToken, &m.OutputPricePerToken, &m.Priority, &m.Active, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// ListActiveModels returns active registry rows ordered so that, within a
// logical name, lower priority numbers come first (primary before fallback).
func (s *Store) ListActiveModels(ctx context.Context) ([]Model, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+modelCols+` FROM models WHERE active = true ORDER BY logical_name, priority`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanModels(rows)
}

// ListModels returns all registry rows (for the dashboard).
func (s *Store) ListModels(ctx context.Context) ([]Model, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+modelCols+` FROM models ORDER BY logical_name, priority`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanModels(rows)
}
