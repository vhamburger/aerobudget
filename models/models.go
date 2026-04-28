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
	FlightRule    string    `json:"flight_rule" db:"flight_rule"`
	Pilot         string    `json:"pilot" db:"pilot"`
	Cost          float64   `json:"cost" db:"cost"`
	FlightCost    float64   `json:"flight_cost" db:"flight_cost"`
	LandingFee    float64   `json:"landing_fee" db:"landing_fee"`
	ApproachFee   float64   `json:"approach_fee" db:"approach_fee"`
	InvoiceID     *int      `json:"invoice_id" db:"invoice_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type Invoice struct {
	ID            int       `json:"id" db:"id"`
	InvoiceNumber string    `json:"invoice_number" db:"invoice_number"`
	Date          string    `json:"date" db:"date"`
	Amount        float64   `json:"amount" db:"amount"`
	FilePath      string    `json:"file_path" db:"file_path"`
	FileHash      string    `json:"file_hash" db:"file_hash"`
	ProcessedAt   time.Time `json:"processed_at" db:"processed_at"`
}

type Club struct {
	ID                  int    `json:"id" db:"id"`
	Name                string `json:"name" db:"name"`
	SearchTerm          string `json:"search_term" db:"search_term"`
	Heuristic           string `json:"heuristic" db:"heuristic"` // 'highest_value', 'last_column', 'pattern'
	FlightAmountKeyword string `json:"flight_amount_keyword" db:"flight_amount_keyword"`
	LandingFeeKeyword   string `json:"landing_fee_keyword" db:"landing_fee_keyword"`
	ApproachFeeKeyword  string `json:"approach_fee_keyword" db:"approach_fee_keyword"`
	InvoiceNumberKeyword string `json:"invoice_number_keyword" db:"invoice_number_keyword"`
	InvoiceNumberNumericOnly bool `json:"invoice_number_numeric_only" db:"invoice_number_numeric_only"`
}

type User struct {
	ID                     int    `json:"id" db:"id"`
	Username               string `json:"username" db:"username"`
	PasswordHash           string `json:"-" db:"password_hash"`
	Role                   string `json:"role" db:"role"`
	RequiresPasswordChange bool   `json:"requires_password_change" db:"requires_password_change"`
}

type Training struct {
	ID        int    `json:"id" db:"id"`
	Name      string `json:"name" db:"name"`
	StartDate string `json:"start_date" db:"start_date"`
	EndDate   string `json:"end_date" db:"end_date"`
}

type CSVTemplate struct {
	ID               int    `json:"id" db:"id"`
	Name             string `json:"name" db:"name"`
	Delimiter        string `json:"delimiter" db:"delimiter"`
	HasHeader        bool   `json:"has_header" db:"has_header"`
	DateFormat       string `json:"date_format" db:"date_format"`
	DateCol          int    `json:"date_col" db:"date_col"`
	AircraftCol      int    `json:"aircraft_col" db:"aircraft_col"`
	DepartureCol     int    `json:"departure_col" db:"departure_col"`
	ArrivalCol       int    `json:"arrival_col" db:"arrival_col"`
	BlockMinutesCol  int    `json:"block_minutes_col" db:"block_minutes_col"`
	FlightMinutesCol int    `json:"flight_minutes_col" db:"flight_minutes_col"`
	PilotCol         int    `json:"pilot_col" db:"pilot_col"`
	TrainingTypeCol  int    `json:"training_type_col" db:"training_type_col"`
	FlightRuleCol    int    `json:"flight_rule_col" db:"flight_rule_col"`
	IsDefault        bool   `json:"is_default" db:"is_default"`
}
