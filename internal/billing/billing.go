// Package billing computes request cost and models the prepaid balance rules.
// The real payment processor is intentionally stubbed behind an interface; this
// package never handles live payment secrets.
package billing

import (
	"context"
	"errors"
	"math"
)

// MicroPerUSD is the fixed-point scale for money (micro-USD).
const MicroPerUSD = 1_000_000

// CostMicroUSD computes the cost of a request in micro-USD from per-token
// prices (USD/token) and token counts. Rounding is to the nearest micro-USD.
func CostMicroUSD(inputPricePerToken, outputPricePerToken float64, promptTokens, completionTokens int) int64 {
	usd := inputPricePerToken*float64(promptTokens) + outputPricePerToken*float64(completionTokens)
	return int64(math.Round(usd * MicroPerUSD))
}

// HasCredit reports whether a balance is sufficient to accept a new request.
// v1 policy: any positive balance may start a request (the exact cost isn't
// known until the response), and the balance is allowed to dip to/just below
// zero on the final decrement.
func HasCredit(balanceMicroUSD int64) bool {
	return balanceMicroUSD > 0
}

// ErrPaymentsDisabled is returned by the stub payment provider.
var ErrPaymentsDisabled = errors.New("billing: payments are stubbed in this build")

// PaymentProvider abstracts a real payment processor. The gateway depends only
// on this interface; a real implementation is supplied by the operator.
type PaymentProvider interface {
	// CreateCharge attempts to add funds to an org's balance and returns an
	// opaque charge id on success.
	CreateCharge(ctx context.Context, orgID string, amountMicroUSD int64) (chargeID string, err error)
}

// StubPayment is the default no-op payment provider. Every charge fails with
// ErrPaymentsDisabled, so no live secrets are ever required.
type StubPayment struct{}

// CreateCharge always returns ErrPaymentsDisabled.
func (StubPayment) CreateCharge(ctx context.Context, orgID string, amountMicroUSD int64) (string, error) {
	return "", ErrPaymentsDisabled
}
