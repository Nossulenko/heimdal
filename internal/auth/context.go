// Package auth provides gateway API-key authentication, dashboard session
// tokens, and the middleware that attaches the resolved principal to the
// request context.
package auth

import "context"

type ctxKey int

const (
	ctxOrgID ctxKey = iota
	ctxAPIKeyID
	ctxUserID
)

// WithOrg returns a context carrying the resolved organization id.
func WithOrg(ctx context.Context, orgID string) context.Context {
	return context.WithValue(ctx, ctxOrgID, orgID)
}

// OrgID returns the organization id attached to the context, if any.
func OrgID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxOrgID).(string)
	return v, ok
}

// WithAPIKeyID returns a context carrying the resolved API key id.
func WithAPIKeyID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxAPIKeyID, id)
}

// APIKeyID returns the API key id attached to the context, if any.
func APIKeyID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxAPIKeyID).(string)
	return v, ok
}

// WithUserID returns a context carrying the dashboard user id.
func WithUserID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxUserID, id)
}

// UserID returns the dashboard user id attached to the context, if any.
func UserID(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxUserID).(string)
	return v, ok
}
