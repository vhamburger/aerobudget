package watcher

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/aerobudget/aerobudget/db"
	"github.com/aerobudget/aerobudget/importer"
	"github.com/aerobudget/aerobudget/models"
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
	var clubs []models.Club
	err = db.DB.Select(&clubs, `SELECT id, name, search_term, heuristic, flight_amount_keyword, landing_fee_keyword, approach_fee_keyword FROM clubs`)
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
	matchedFlightIDs := make(map[int]bool)
	for _, item := range invoice.LineItems {
		if flightID, err := MatchInvoiceToFlight(item.Date, item.AircraftRegistration, item, int(invoiceID), matchedFlightIDs); err == nil {
			matches++
			matchedFlightIDs[flightID] = true
		}
	}

	log.Printf("[Watcher] Ende. %d von %d Posten verknüpft.", matches, len(invoice.LineItems))
}

// MatchInvoiceToFlight führt das eigentliche SQL-Update durch
func MatchInvoiceToFlight(date string, aircraft string, item *importer.PDFLineItem, invoiceID int, matchedFlightIDs map[int]bool) (int, error) {
	// Konvertiere PDF Datum (DD.MM.YYYY) zu DB Datum (YYYY-MM-DD)
	dbDate := date
	if parts := strings.Split(date, "."); len(parts) == 3 {
		dbDate = fmt.Sprintf("%s-%s-%s", parts[2], parts[1], parts[0])
	}

	// Filter aus den bereits gematchten IDs bauen
	var excludeIDs []string
	for id := range matchedFlightIDs {
		excludeIDs = append(excludeIDs, fmt.Sprintf("%d", id))
	}
	excludeClause := ""
	if len(excludeIDs) > 0 {
		excludeClause = fmt.Sprintf("AND id NOT IN (%s)", strings.Join(excludeIDs, ","))
	}

	var flightID int
	// Suche Flug am selben Tag mit selbem Kennzeichen, der noch keine Rechnung hat ODER schon diese Rechnung hat
	query := fmt.Sprintf(`
		SELECT id FROM flights 
		WHERE date = ? AND aircraft = ? AND (invoice_id IS NULL OR invoice_id = ?) %s
		ORDER BY id ASC
		LIMIT 1
	`, excludeClause)

	err := db.DB.Get(&flightID, query, dbDate, aircraft, invoiceID)

	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("[Matcher] Kein Flug für %s am %s", aircraft, dbDate)
		}
		return 0, err
	}

	_, err = db.DB.Exec(`UPDATE flights SET cost = ?, flight_cost = ?, landing_fee = ?, approach_fee = ?, invoice_id = ? WHERE id = ?`, 
		item.Amount, item.FlightCost, item.LandingFee, item.ApproachFee, invoiceID, flightID)
	if err != nil {
		return 0, err
	}

	log.Printf("[Matcher] Flug %d erfolgreich verknüpft.", flightID)
	return flightID, nil
}

// ReconcileMissingCosts für den manuellen Abgleich
func ReconcileMissingCosts() (int, error) {
	log.Println("[Matcher] Reconcile wird ausgeführt...")

	watchDir := os.Getenv("INVOICE_WATCH_DIR")
	if watchDir == "" {
		watchDir = "data/invoices"
	}

	files, err := filepath.Glob(filepath.Join(watchDir, "*.pdf"))
	if err != nil {
		return 0, err
	}

	count := 0
	for _, file := range files {
		processNewInvoice(file)
		count++ // just returning the number of processed invoices for now
	}

	return count, nil
}
