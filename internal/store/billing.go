package store

import "context"

// GetBalance returns an org's prepaid balance, creating a zero row on first
// read if none exists.
func (s *Store) GetBalance(ctx context.Context, orgID string) (*Balance, error) {
	b := Balance{OrgID: orgID}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO balances (org_id, amount_micro_usd) VALUES ($1, 0)
		 ON CONFLICT (org_id) DO UPDATE SET org_id = EXCLUDED.org_id
		 RETURNING amount_micro_usd, updated_at`,
		orgID,
	).Scan(&b.AmountMicroUSD, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// AdjustBalance atomically adds delta (which may be negative) to an org's
// balance and returns the new balance. The row is created if absent.
func (s *Store) AdjustBalance(ctx context.Context, orgID string, delta int64) (*Balance, error) {
	b := Balance{OrgID: orgID}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO balances (org_id, amount_micro_usd) VALUES ($1, $2)
		 ON CONFLICT (org_id) DO UPDATE
		   SET amount_micro_usd = balances.amount_micro_usd + $2, updated_at = now()
		 RETURNING amount_micro_usd, updated_at`,
		orgID, delta,
	).Scan(&b.AmountMicroUSD, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// ListInvoices returns an org's invoices, newest first.
func (s *Store) ListInvoices(ctx context.Context, orgID string) ([]Invoice, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, period_start, period_end, amount_micro_usd, status, created_at
		 FROM invoices WHERE org_id = $1 ORDER BY period_start DESC`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Invoice
	for rows.Next() {
		var iv Invoice
		if err := rows.Scan(&iv.ID, &iv.OrgID, &iv.PeriodStart, &iv.PeriodEnd, &iv.AmountMicroUSD, &iv.Status, &iv.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, iv)
	}
	return out, rows.Err()
}
