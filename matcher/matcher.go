package matcher

import (
	"log"

	"github.com/aerobudget/aerobudget/importer"
	"github.com/aerobudget/aerobudget/models"
	"github.com/jmoiron/sqlx"
)

// MatchInvoiceToFlights tries to match extracted invoice items to existing flights
func MatchInvoiceToFlights(db *sqlx.DB, inv importer.PDFInvoice) error {
	// First, save the invoice
	res, err := db.NamedExec(`INSERT INTO invoices (invoice_number, date, amount) VALUES (:invoice_number, :date, :amount)`, inv)
	if err != nil {
		return err
	}
	invoiceID, _ := res.LastInsertId()

	for _, item := range inv.LineItems {
		// Find potential flight match based on Date and Aircraft
		var flights []models.Flight
		err := db.Select(&flights, `SELECT * FROM flights WHERE date = ? AND aircraft = ? AND invoice_id IS NULL`, item.Date, item.AircraftRegistration)
		if err != nil {
			log.Printf("Error searching flights for %s on %s: %v", item.AircraftRegistration, item.Date, err)
			continue
		}

		// Simplified matching logic: just take the first unbilled flight that matches date/aircraft
		// In a real scenario, we'd compare minutes, handle multi-flight days, and check billing config.
		if len(flights) > 0 {
			flight := flights[0]
			
			// Update flight with cost and invoice mapping
			_, err = db.Exec(`UPDATE flights SET cost = ?, invoice_id = ? WHERE id = ?`, item.Amount, invoiceID, flight.ID)
			if err != nil {
				log.Printf("Error updating flight %d with cost %f: %v", flight.ID, item.Amount, err)
			} else {
				log.Printf("Successfully matched flight %d to invoice item (Amount: %f)", flight.ID, item.Amount)
			}
		} else {
			log.Printf("Warning: Could not find matching unbilled flight for %s on %s", item.AircraftRegistration, item.Date)
		}
	}

	return nil
}
