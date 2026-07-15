package store

import "context"

// GetUserByEmail looks up a dashboard user by email.
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, email, password_hash, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.OrgID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, norows(err)
	}
	return &u, nil
}

// GetOrg looks up an organization by id.
func (s *Store) GetOrg(ctx context.Context, id string) (*Organization, error) {
	var o Organization
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, created_at FROM organizations WHERE id = $1`,
		id,
	).Scan(&o.ID, &o.Name, &o.CreatedAt)
	if err != nil {
		return nil, norows(err)
	}
	return &o, nil
}
