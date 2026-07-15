package store

import "context"

const credCols = `id, org_id, provider, ciphertext, nonce, key_version, created_at, revoked_at`

func scanCred(row interface {
	Scan(...any) error
}) (*ProviderCredential, error) {
	var c ProviderCredential
	if err := row.Scan(&c.ID, &c.OrgID, &c.Provider, &c.Ciphertext, &c.Nonce, &c.KeyVersion, &c.CreatedAt, &c.RevokedAt); err != nil {
		return nil, norows(err)
	}
	return &c, nil
}

// GetActiveCredential returns the credential to use for an org+provider,
// preferring an org-specific (BYOK) credential over a system-wide one.
func (s *Store) GetActiveCredential(ctx context.Context, orgID, provider string) (*ProviderCredential, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+credCols+` FROM provider_credentials
		 WHERE provider = $2 AND revoked_at IS NULL AND (org_id = $1 OR org_id IS NULL)
		 ORDER BY org_id IS NULL ASC
		 LIMIT 1`,
		orgID, provider,
	)
	return scanCred(row)
}

// ListCredentials returns an org's credentials (secrets are never decrypted
// here; callers that list for display should not read ciphertext).
func (s *Store) ListCredentials(ctx context.Context, orgID string) ([]ProviderCredential, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+credCols+` FROM provider_credentials WHERE org_id = $1 ORDER BY created_at DESC`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ProviderCredential
	for rows.Next() {
		c, err := scanCred(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// CreateCredential stores an encrypted provider credential for an org.
func (s *Store) CreateCredential(ctx context.Context, orgID, provider string, ciphertext, nonce []byte, keyVersion int) (*ProviderCredential, error) {
	c := ProviderCredential{OrgID: &orgID, Provider: provider, Ciphertext: ciphertext, Nonce: nonce, KeyVersion: keyVersion}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO provider_credentials (org_id, provider, ciphertext, nonce, key_version)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		orgID, provider, ciphertext, nonce, keyVersion,
	).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// RevokeCredential marks a credential revoked, scoped to the org.
func (s *Store) RevokeCredential(ctx context.Context, orgID, id string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE provider_credentials SET revoked_at = now() WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL`,
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
