package store

import (
	"context"
	"time"
)

const apiKeyCols = `id, org_id, name, key_hash, key_prefix, last_used_at, created_at, revoked_at`

func scanAPIKey(row interface {
	Scan(...any) error
}) (*APIKey, error) {
	var k APIKey
	if err := row.Scan(&k.ID, &k.OrgID, &k.Name, &k.KeyHash, &k.KeyPrefix, &k.LastUsedAt, &k.CreatedAt, &k.RevokedAt); err != nil {
		return nil, norows(err)
	}
	return &k, nil
}

// GetActiveAPIKeyByHash resolves a bearer key by its HMAC hash. Revoked keys
// are excluded, so the caller can treat a miss as "unauthorized".
func (s *Store) GetActiveAPIKeyByHash(ctx context.Context, hash string) (*APIKey, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+apiKeyCols+` FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
		hash,
	)
	return scanAPIKey(row)
}

// TouchAPIKey records the last time a key was used. It is best-effort and meant
// to be called off the request path.
func (s *Store) TouchAPIKey(ctx context.Context, id string, at time.Time) error {
	_, err := s.pool.Exec(ctx, `UPDATE api_keys SET last_used_at = $2 WHERE id = $1`, id, at)
	return err
}

// ListAPIKeys returns all keys for an org, newest first.
func (s *Store) ListAPIKeys(ctx context.Context, orgID string) ([]APIKey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+apiKeyCols+` FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []APIKey
	for rows.Next() {
		k, err := scanAPIKey(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *k)
	}
	return out, rows.Err()
}

// CreateAPIKey inserts a new key row and returns it populated with generated
// id/created_at.
func (s *Store) CreateAPIKey(ctx context.Context, orgID, name, keyHash, keyPrefix string) (*APIKey, error) {
	k := APIKey{OrgID: orgID, Name: name, KeyHash: keyHash, KeyPrefix: keyPrefix}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO api_keys (org_id, name, key_hash, key_prefix)
		 VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		orgID, name, keyHash, keyPrefix,
	).Scan(&k.ID, &k.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

// RevokeAPIKey marks a key revoked. It is scoped to the org so one org cannot
// revoke another's key. Returns ErrNotFound if nothing was updated.
func (s *Store) RevokeAPIKey(ctx context.Context, orgID, id string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL`,
		id, orgID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
