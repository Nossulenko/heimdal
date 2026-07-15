package billing

import (
	"context"
	"testing"
)

func TestCostMicroUSD(t *testing.T) {
	cases := []struct {
		name               string
		inPrice, outPrice  float64
		prompt, completion int
		want               int64
	}{
		{"gpt-4o-mini 1000/500", 0.15e-6, 0.60e-6, 1000, 500, 450},
		{"zero tokens", 0.15e-6, 0.60e-6, 0, 0, 0},
		{"rounds to nearest micro", 1e-6, 1e-6, 1, 0, 1},
		{"claude haiku 2000/1000", 0.80e-6, 4.00e-6, 2000, 1000, 5600},
	}
	for _, tc := range cases {
		got := CostMicroUSD(tc.inPrice, tc.outPrice, tc.prompt, tc.completion)
		if got != tc.want {
			t.Errorf("%s: got %d micro-USD, want %d", tc.name, got, tc.want)
		}
	}
}

func TestHasCredit(t *testing.T) {
	if HasCredit(0) {
		t.Error("zero balance should not have credit")
	}
	if HasCredit(-100) {
		t.Error("negative balance should not have credit")
	}
	if !HasCredit(1) {
		t.Error("positive balance should have credit")
	}
}

func TestStubPaymentDisabled(t *testing.T) {
	_, err := StubPayment{}.CreateCharge(context.Background(), "org", 1000)
	if err != ErrPaymentsDisabled {
		t.Errorf("err = %v, want ErrPaymentsDisabled", err)
	}
}
