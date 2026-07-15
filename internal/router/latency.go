package router

import "sync"

// Latency tracks a per-provider exponentially-weighted moving average of
// observed request latency (milliseconds), used to route to the fastest
// provider when requested.
type Latency struct {
	mu    sync.Mutex
	ewma  map[string]float64
	alpha float64
}

// NewLatency returns a latency tracker. alpha weights the most recent sample.
func NewLatency() *Latency {
	return &Latency{ewma: make(map[string]float64), alpha: 0.3}
}

// Record folds a new latency sample (ms) into the provider's EWMA.
func (l *Latency) Record(provider string, ms float64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if cur, ok := l.ewma[provider]; ok {
		l.ewma[provider] = l.alpha*ms + (1-l.alpha)*cur
	} else {
		l.ewma[provider] = ms
	}
}

// Estimate returns a provider's current latency estimate in ms, or 0 if it has
// never been sampled — so an untried provider sorts first and gets measured.
func (l *Latency) Estimate(provider string) float64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.ewma[provider]
}
