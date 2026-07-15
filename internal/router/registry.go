// Package router resolves a logical model name to an ordered list of provider
// candidates and dispatches a request through them with fallback and
// per-provider circuit breaking.
package router

import (
	"sync"

	"github.com/kaizenprojects/relaygw/internal/store"
)

// Route is one concrete candidate for a logical model: which provider and
// model to call, and the pricing to bill it at.
type Route struct {
	LogicalName         string
	Provider            string
	ProviderModelID     string
	InputPricePerToken  float64
	OutputPricePerToken float64
}

// Registry is an in-memory, hot-path cache of the model registry. It is the
// authoritative in-process view; Postgres is the source of truth and Load
// rebuilds the cache when the registry changes.
type Registry struct {
	mu     sync.RWMutex
	routes map[string][]Route
}

// NewRegistry returns an empty registry.
func NewRegistry() *Registry {
	return &Registry{routes: make(map[string][]Route)}
}

// Load rebuilds the registry from active model rows. Rows are expected to be
// ordered by (logical_name, priority) so candidates are in preference order.
func (r *Registry) Load(models []store.Model) {
	next := make(map[string][]Route, len(models))
	for _, m := range models {
		next[m.LogicalName] = append(next[m.LogicalName], Route{
			LogicalName:         m.LogicalName,
			Provider:            m.Provider,
			ProviderModelID:     m.ProviderModelID,
			InputPricePerToken:  m.InputPricePerToken,
			OutputPricePerToken: m.OutputPricePerToken,
		})
	}
	r.mu.Lock()
	r.routes = next
	r.mu.Unlock()
}

// Resolve returns the ordered candidate list for a logical model name.
func (r *Registry) Resolve(logical string) ([]Route, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	routes, ok := r.routes[logical]
	return routes, ok && len(routes) > 0
}

// Size returns how many logical models are registered (for diagnostics).
func (r *Registry) Size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.routes)
}
