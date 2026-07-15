// Package usage buffers and asynchronously persists usage records so metering
// never blocks or slows the response path. Records are enqueued after the
// client response is complete; a background worker writes them and decrements
// the org's prepaid balance.
package usage

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/kaizenprojects/relaygw/internal/store"
)

// Sink is the persistence surface the recorder needs. *store.Store satisfies
// it; tests can substitute a fake.
type Sink interface {
	InsertUsage(ctx context.Context, r store.UsageRecord) error
	AdjustBalance(ctx context.Context, orgID string, delta int64) (*store.Balance, error)
}

// Recorder is an async usage writer.
type Recorder struct {
	sink Sink
	log  *slog.Logger
	ch   chan store.UsageRecord
	wg   sync.WaitGroup
	once sync.Once
}

// NewRecorder creates a recorder with a bounded buffer.
func NewRecorder(sink Sink, buffer int, log *slog.Logger) *Recorder {
	if buffer <= 0 {
		buffer = 1024
	}
	return &Recorder{sink: sink, log: log, ch: make(chan store.UsageRecord, buffer)}
}

// Start launches the background worker. The worker stops when the channel is
// closed (via Close), after draining all buffered records.
func (r *Recorder) Start() {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		for rec := range r.ch {
			r.write(rec)
		}
	}()
}

func (r *Recorder) write(rec store.UsageRecord) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := r.sink.InsertUsage(ctx, rec); err != nil {
		r.log.Error("usage insert failed", "org", rec.OrgID, "err", err)
		return
	}
	if rec.CostMicroUSD > 0 {
		if _, err := r.sink.AdjustBalance(ctx, rec.OrgID, -rec.CostMicroUSD); err != nil {
			r.log.Error("balance decrement failed", "org", rec.OrgID, "err", err)
		}
	}
}

// Record enqueues a usage record. It is lossless: the send blocks if the buffer
// is full, but callers invoke it only after the client response is finished, so
// blocking here never delays a client.
func (r *Recorder) Record(rec store.UsageRecord) {
	r.ch <- rec
}

// Close stops accepting records and waits for the worker to drain the buffer.
func (r *Recorder) Close() {
	r.once.Do(func() { close(r.ch) })
	r.wg.Wait()
}
