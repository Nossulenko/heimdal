package usage

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"

	"github.com/kaizenprojects/relaygw/internal/store"
)

type fakeSink struct {
	mu      sync.Mutex
	inserts int
	debited int64
}

func (f *fakeSink) InsertUsage(ctx context.Context, r store.UsageRecord) error {
	f.mu.Lock()
	f.inserts++
	f.mu.Unlock()
	return nil
}

func (f *fakeSink) AdjustBalance(ctx context.Context, orgID string, delta int64) (*store.Balance, error) {
	f.mu.Lock()
	f.debited += -delta
	f.mu.Unlock()
	return &store.Balance{OrgID: orgID}, nil
}

func TestRecorderNoDropUnderLoad(t *testing.T) {
	sink := &fakeSink{}
	rec := NewRecorder(sink, 64, slog.New(slog.NewTextHandler(io.Discard, nil)))
	rec.Start()

	const n = 5000
	for i := 0; i < n; i++ {
		rec.Record(store.UsageRecord{OrgID: "org", CostMicroUSD: 2})
	}
	rec.Close() // drains

	if sink.inserts != n {
		t.Errorf("inserts = %d, want %d (records dropped)", sink.inserts, n)
	}
	if sink.debited != int64(n*2) {
		t.Errorf("debited = %d, want %d", sink.debited, n*2)
	}
}
