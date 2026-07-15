package api

import (
	"net/http"
	"time"

	"github.com/nossulenko/heimdal/internal/httpx"
)

type balanceDTO struct {
	AmountMicroUSD int64     `json:"amountMicroUsd"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// Balance returns the org's prepaid balance.
func (a *API) Balance(w http.ResponseWriter, r *http.Request) {
	bal, err := a.store.GetBalance(r.Context(), org(r))
	if err != nil {
		a.log.Error("get balance failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, balanceDTO{AmountMicroUSD: bal.AmountMicroUSD, UpdatedAt: bal.UpdatedAt})
}

type invoiceDTO struct {
	ID             string    `json:"id"`
	PeriodStart    time.Time `json:"periodStart"`
	PeriodEnd      time.Time `json:"periodEnd"`
	AmountMicroUSD int64     `json:"amountMicroUsd"`
	Status         string    `json:"status"`
}

// Invoices returns the org's statements.
func (a *API) Invoices(w http.ResponseWriter, r *http.Request) {
	invoices, err := a.store.ListInvoices(r.Context(), org(r))
	if err != nil {
		a.log.Error("list invoices failed", "err", err)
		httpx.WriteAPIError(w, http.StatusInternalServerError, "internal error")
		return
	}
	out := make([]invoiceDTO, 0, len(invoices))
	for _, iv := range invoices {
		out = append(out, invoiceDTO{
			ID:             iv.ID,
			PeriodStart:    iv.PeriodStart,
			PeriodEnd:      iv.PeriodEnd,
			AmountMicroUSD: iv.AmountMicroUSD,
			Status:         iv.Status,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}
