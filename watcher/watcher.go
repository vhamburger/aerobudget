package watcher

import (
	"database/sql"
	"fmt"
	"log"
	"path/filepath"
	"strings"

	"github.com/aerobudget/aerobudget/db"
	"github.com/aerobudget/aerobudget/importer"
	"github.com/fsnotify/fsnotify"
)

// Watch überwacht das Verzeichnis auf neue PDF-Dateien
func Watch(dir string) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	defer watcher.Close()

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Op&fsnotify.Create == fsnotify.Create {
					if strings.ToLower(filepath.Ext(event.Name)) == ".pdf" {
						processNewInvoice(event.Name)
					}
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("[Watcher] Fehler:", err)
			}
		}
	}()

	if err := watcher.Add(dir); err != nil {
		return err
	}
	log.Printf("[Watcher] Monitoring gestartet: %s", dir)
	select {}
}

func processNewInvoice(filePath string) {
	log.Printf("[Watcher] === Verarbeite Datei: %s ===", filepath.Base(filePath))

	// 1. Bekannte Kennzeichen aus dem Flugbuch laden
	var knownAircraft []string
	err := db.DB.Select(&knownAircraft, `SELECT DISTINCT aircraft FROM flights`)
	if err != nil {
		log.Printf("[Watcher] Fehler beim Abrufen der Kennzeichen: %v", err)
	}

	// 1.5 Vereins-Konfigurationen laden
	var clubs []importer.ClubConfig
	err = db.DB.Select(&clubs, `SELECT name, billing_type FROM clubs`)
	if err != nil {
		log.Printf("[Watcher] Fehler beim Abrufen der Vereine: %v", err)
	}

	text, err := importer.ExtractText(filePath)
	if err != nil {
		log.Printf("[Watcher] Fehler beim Auslesen der PDF: %v", err)
		return
	}

	// 2. Parser mit den Kennzeichen und Vereinen aufrufen
	invoice, err := importer.ParseInvoiceText(text, knownAircraft, clubs)
	if err != nil {
		log.Printf("[Watcher] Fehler beim Parsen: %v", err)
		return
	}

	// Bestimme ein Haupt-Kennzeichen für die Rechnungstabelle
	aircraft := "UNKNOWN"
	if len(invoice.LineItems) > 0 {
		aircraft = invoice.LineItems[0].AircraftRegistration
	}

	// 3. Rechnung in DB speichern
	res, err := db.DB.Exec(`
        INSERT INTO invoices (invoice_number, date, amount, aircraft) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(invoice_number) DO NOTHING`,
		invoice.InvoiceNumber, invoice.Date, invoice.TotalAmount, aircraft)

	if err != nil {
		log.Printf("[Watcher] DB Error: %v", err)
		return
	}

	var invoiceID int64
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected > 0 {
		invoiceID, _ = res.LastInsertId()
		log.Printf("[Watcher] Rechnung %s neu angelegt.", invoice.InvoiceNumber)
	} else {
		db.DB.Get(&invoiceID, "SELECT id FROM invoices WHERE invoice_number = ?", invoice.InvoiceNumber)
		log.Printf("[Watcher] Rechnung %s existiert bereits.", invoice.InvoiceNumber)
	}

	// 4. Matching der Einzelposten gegen bestehende Flüge
	matches := 0
	for _, item := range invoice.LineItems {
		if err := MatchInvoiceToFlight(item.Date, item.AircraftRegistration, item.Amount, int(invoiceID)); err == nil {
			matches++
		}
	}

	log.Printf("[Watcher] Ende. %d von %d Posten verknüpft.", matches, len(invoice.LineItems))
}

// MatchInvoiceToFlight führt das eigentliche SQL-Update durch
func MatchInvoiceToFlight(date string, aircraft string, cost float64, invoiceID int) error {
	// Konvertiere PDF Datum (DD.MM.YYYY) zu DB Datum (YYYY-MM-DD)
	dbDate := date
	if parts := strings.Split(date, "."); len(parts) == 3 {
		dbDate = fmt.Sprintf("%s-%s-%s", parts[2], parts[1], parts[0])
	}

	var flightID int
	// Suche Flug am selben Tag mit selbem Kennzeichen, der noch keine Rechnung hat
	err := db.DB.Get(&flightID, `
		SELECT id FROM flights 
		WHERE date = ? AND aircraft = ? AND invoice_id IS NULL
		LIMIT 1
	`, dbDate, aircraft)

	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("[Matcher] Kein Flug für %s am %s", aircraft, dbDate)
		}
		return err
	}

	_, err = db.DB.Exec(`UPDATE flights SET cost = ?, invoice_id = ? WHERE id = ?`, cost, invoiceID, flightID)
	if err != nil {
		return err
	}

	log.Printf("[Matcher] Flug %d erfolgreich verknüpft.", flightID)
	return nil
}

// ReconcileMissingCosts für den manuellen Abgleich
func ReconcileMissingCosts() (int, error) {
	log.Println("[Matcher] Reconcile wird ausgeführt...")
	type Unmatched struct {
		ID       int     `db:"id"`
		Date     string  `db:"date"`
		Amount   float64 `db:"amount"`
		Aircraft string  `db:"aircraft"`
	}
	var unmatched []Unmatched
	err := db.DB.Select(&unmatched, `
		SELECT id, date, amount, aircraft FROM invoices 
		WHERE id NOT IN (SELECT invoice_id FROM flights WHERE invoice_id IS NOT NULL)
	`)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, inv := range unmatched {
		err := MatchInvoiceToFlight(inv.Date, inv.Aircraft, inv.Amount, inv.ID)
		if err == nil {
			count++
		}
	}
	return count, nil
}
