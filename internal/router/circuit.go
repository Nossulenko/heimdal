package router

import (
	"sync"
	"time"
)

type breakerState int

const (
	stateClosed breakerState = iota
	stateOpen
	stateHalfOpen
)

// breaker is a single provider's circuit breaker. After threshold consecutive
// failures it opens for cooldown, then allows one half-open trial.
type breaker struct {
	mu        sync.Mutex
	state     breakerState
	failures  int
	openedAt  time.Time
	threshold int
	cooldown  time.Duration
	now       func() time.Time
}

// Breakers is a set of per-provider circuit breakers.
type Breakers struct {
	mu        sync.Mutex
	byName    map[string]*breaker
	threshold int
	cooldown  time.Duration
	now       func() time.Time
}

// NewBreakers returns a breaker set. threshold is the consecutive-failure count
// that opens a breaker; cooldown is how long it stays open before a trial.
func NewBreakers(threshold int, cooldown time.Duration) *Breakers {
	return &Breakers{
		byName:    make(map[string]*breaker),
		threshold: threshold,
		cooldown:  cooldown,
		now:       time.Now,
	}
}

func (b *Breakers) get(name string) *breaker {
	b.mu.Lock()
	defer b.mu.Unlock()
	br, ok := b.byName[name]
	if !ok {
		br = &breaker{state: stateClosed, threshold: b.threshold, cooldown: b.cooldown, now: b.now}
		b.byName[name] = br
	}
	return br
}

// Allow reports whether a request to the provider may proceed. When a breaker
// is open past its cooldown it transitions to half-open and allows one trial.
func (b *Breakers) Allow(name string) bool {
	br := b.get(name)
	br.mu.Lock()
	defer br.mu.Unlock()
	switch br.state {
	case stateOpen:
		if br.now().Sub(br.openedAt) >= br.cooldown {
			br.state = stateHalfOpen
			return true
		}
		return false
	default:
		return true
	}
}

// RecordSuccess closes the breaker and resets its failure count.
func (b *Breakers) RecordSuccess(name string) {
	br := b.get(name)
	br.mu.Lock()
	defer br.mu.Unlock()
	br.failures = 0
	br.state = stateClosed
}

// RecordFailure records a transient failure, opening the breaker at threshold
// (or immediately re-opening a failed half-open trial).
func (b *Breakers) RecordFailure(name string) {
	br := b.get(name)
	br.mu.Lock()
	defer br.mu.Unlock()
	if br.state == stateHalfOpen {
		br.state = stateOpen
		br.openedAt = br.now()
		return
	}
	br.failures++
	if br.failures >= br.threshold {
		br.state = stateOpen
		br.openedAt = br.now()
	}
}
