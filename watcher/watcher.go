package watcher

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
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
	db.Log(fmt.Sprintf("[Watcher] === Verarbeite Datei: %s ===", filepath.Base(filePath)), false)

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

	invoice, err := importer.ParseInvoiceText(text, knownAircraft, clubs, filepath.Base(filePath))
	if err != nil {
		log.Printf("[Watcher] Fehler beim Parsen: %v", err)
		return
	}

	// 2.5 Falls keine LineItems gefunden wurden, probiere Sprit-Parser
	if len(invoice.LineItems) == 0 {
		fuel := importer.ParseFuelReceipt(text)
		if fuel != nil {
			db.Log(fmt.Sprintf("[Watcher] Sprit-Beleg erkannt: %s am %s", fuel.Aircraft, fuel.Date), false)
			invoice.Date = fuel.Date
			invoice.TotalAmount = fuel.TotalAmount
			invoice.LineItems = []*importer.PDFLineItem{
				{
					AircraftRegistration: fuel.Aircraft,
					Date:                 fuel.Date,
					Amount:               fuel.TotalAmount,
					FuelCost:             fuel.TotalAmount,
				},
			}
		}
	}

	// Bestimme ein Haupt-Kennzeichen für die Rechnungstabelle
	aircraft := "UNKNOWN"
	if len(invoice.LineItems) > 0 {
		aircraft = invoice.LineItems[0].AircraftRegistration
	}

	// Hash berechnen für Eindeutigkeit
	fileHash := calculateFileHash(filePath)
	uniqueInvoiceNumber := invoice.InvoiceNumber
	if fileHash != "" {
		uniqueInvoiceNumber = fmt.Sprintf("%s-%s", invoice.InvoiceNumber, fileHash[:8])
	}

	// Reset existing links for this invoice to prevent double-counting costs
	_, err = db.DB.Exec(`
		UPDATE flights SET 
			cost = cost - (flight_cost + landing_fee + approach_fee + fuel_cost),
			flight_cost = 0,
			landing_fee = 0,
			approach_fee = 0,
			fuel_cost = 0,
			invoice_id = NULL
		WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number = ?)`, uniqueInvoiceNumber)
	if err != nil {
		log.Printf("[Watcher] Hinweis: Keine alten Verknüpfungen zum Zurücksetzen gefunden oder Fehler: %v", err)
	}

	absPath, _ := filepath.Abs(filePath)
	res, err := db.DB.Exec(`
        INSERT INTO invoices (invoice_number, date, amount, aircraft, file_path, file_hash) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(invoice_number) DO UPDATE SET file_path = excluded.file_path, file_hash = excluded.file_hash`,
		uniqueInvoiceNumber, invoice.Date, invoice.TotalAmount, aircraft, absPath, fileHash)

	if err != nil {
		log.Printf("[Watcher] DB Error: %v", err)
		return
	}

	var invoiceDBID int64
	db.DB.Get(&invoiceDBID, "SELECT id FROM invoices WHERE invoice_number = ?", uniqueInvoiceNumber)

	// 4. Matching der Einzelposten gegen bestehende Flüge
	matches := 0
	matchedFlightIDs := make(map[int]bool)
	for _, item := range invoice.LineItems {
		if flightID, err := MatchInvoiceToFlight(item.Date, item.AircraftRegistration, item, int(invoiceDBID), matchedFlightIDs); err == nil {
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
	// Try to match by minutes if available to distinguish multiple flights on the same day
	orderBy := "id ASC"
	if item.Minutes > 0 {
		orderBy = fmt.Sprintf("ABS(block_minutes - %d) ASC, id ASC", item.Minutes)
	}

	// Suche Flug am selben Tag mit selbem Kennzeichen, der noch keine Rechnung hat ODER schon diese Rechnung hat
	query := fmt.Sprintf(`
		SELECT id FROM flights 
		WHERE date = ? AND aircraft = ? AND (invoice_id IS NULL OR invoice_id = ?) %s
		ORDER BY %s
		LIMIT 1
	`, excludeClause, orderBy)

	err := db.DB.Get(&flightID, query, dbDate, aircraft, invoiceID)

	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("[Matcher] SQL Fehler beim Matching: %v", err)
		}
		return 0, err
	}

	_, err = db.DB.Exec(`UPDATE flights SET cost = cost + ?, flight_cost = flight_cost + ?, fuel_cost = fuel_cost + ?, landing_fee = landing_fee + ?, approach_fee = approach_fee + ?, invoice_id = ? WHERE id = ?`, 
		item.Amount, item.FlightCost, item.FuelCost, item.LandingFee, item.ApproachFee, invoiceID, flightID)
	if err != nil {
		return 0, err
	}

	db.Log(fmt.Sprintf("[Matcher] Flug %d (%s, %s) erfolgreich mit Rechnung %d verknüpft.", flightID, aircraft, dbDate, invoiceID), false)

	// Update airfield fees for historical tracking
	if item.LandingFee > 0 || item.ApproachFee > 0 {
		var f models.Flight
		db.DB.Get(&f, "SELECT * FROM flights WHERE id = ?", flightID)
		if f.Arrival != "" {
			year, _ := strconv.Atoi(dbDate[:4])
			db.DB.Exec(`INSERT INTO airfield_fees (icao, year, landing_fee, approach_fee) VALUES (?, ?, ?, ?)
				ON CONFLICT(icao, year) DO UPDATE SET 
				landing_fee = CASE WHEN EXCLUDED.landing_fee > 0 THEN EXCLUDED.landing_fee ELSE airfield_fees.landing_fee END,
				approach_fee = CASE WHEN EXCLUDED.approach_fee > 0 THEN EXCLUDED.approach_fee ELSE airfield_fees.approach_fee END`,
				f.Arrival, year, item.LandingFee, item.ApproachFee)
		}
	}

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
func calculateFileHash(filePath string) string {
	f, err := os.Open(filePath)
	if err != nil {
		return ""
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return ""
	}
	return hex.EncodeToString(h.Sum(nil))
}
