package models

import "time"

type Flight struct {
	ID            int       `json:"id" db:"id"`
	Date          string    `json:"date" db:"date"`
	Aircraft      string    `json:"aircraft" db:"aircraft"`
	Departure     string    `json:"departure" db:"departure"`
	Arrival       string    `json:"arrival" db:"arrival"`
	BlockMinutes  int       `json:"block_minutes" db:"block_minutes"`
	FlightMinutes int       `json:"flight_minutes" db:"flight_minutes"`
	TrainingType  string    `json:"training_type" db:"training_type"`
	Pilot         string    `json:"pilot" db:"pilot"`
	Cost          float64   `json:"cost" db:"cost"`
	InvoiceID     *int      `json:"invoice_id" db:"invoice_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type Invoice struct {
	ID            int       `json:"id" db:"id"`
	InvoiceNumber string    `json:"invoice_number" db:"invoice_number"`
	Date          string    `json:"date" db:"date"`
	Amount        float64   `json:"amount" db:"amount"`
	ProcessedAt   time.Time `json:"processed_at" db:"processed_at"`
}

type Club struct {
	ID          int    `json:"id" db:"id"`
	Name        string `json:"name" db:"name"`
	BillingType string `json:"billing_type" db:"billing_type"`
}
