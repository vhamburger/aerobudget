package importer

import (
	"bytes"
	"fmt"
	"log"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type PDFInvoice struct {
	InvoiceNumber string
	Date          string
	TotalAmount   float64
	LineItems     []PDFLineItem
}

type PDFLineItem struct {
	AircraftRegistration string
	Date                 string
	Minutes              int
	Amount               float64
}

func ExtractText(filePath string) (string, error) {
	cmd := exec.Command("pdftotext", "-layout", filePath, "-")
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("pdftotext failed: %s, err: %w", stderr.String(), err)
	}
	return out.String(), nil
}

// ParseInvoiceText akzeptiert nun eine Liste bekannter Kennzeichen aus der DB
func ParseInvoiceText(text string, knownAircraft []string) (PDFInvoice, error) {
	inv := PDFInvoice{}
	lines := strings.Split(text, "\n")

	// 1. Dynamischen Regex für Kennzeichen erstellen
	var aircraftRe *regexp.Regexp
	if len(knownAircraft) > 0 {
		// Erstellt ein Muster wie: (D-EXYZ|OE-ABC|D-EABC)
		pattern := `\b(` + strings.Join(knownAircraft, "|") + `)\b`
		aircraftRe = regexp.MustCompile(pattern)
		log.Printf("[Parser] Suche gezielt nach %d bekannten Kennzeichen", len(knownAircraft))
	} else {
		// Fallback auf allgemeines Muster, falls DB leer ist
		aircraftRe = regexp.MustCompile(`\b(D-[A-Z]{4}|OE-[A-Z]{3})\b`)
		log.Println("[Parser] Keine bekannten Kennzeichen in DB gefunden. Nutze Standard-Muster.")
	}

	// 2. Rechnungsnummer
	invNumRe := regexp.MustCompile(`(?i)(?:Rechnungsnummer|RechnungNr|Inv-No)[\s:]*([A-Z0-9-]+)`)
	if match := invNumRe.FindStringSubmatch(text); len(match) > 1 {
		inv.InvoiceNumber = strings.TrimSpace(match[1])
	} else {
		inv.InvoiceNumber = fmt.Sprintf("INV-%d", time.Now().Unix())
	}

	// 3. Rechnungsdatum
	dateRe := regexp.MustCompile(`\b(\d{2}\.\d{2}\.\d{4})\b`)
	if match := dateRe.FindStringSubmatch(text); len(match) > 1 {
		inv.Date = match[1]
	}

	// 4. Gesamtbetrag
	amountRe := regexp.MustCompile(`(?i)(?:Gesamtbetrag|Summe|Total|Endbetrag)[\s:]*([\d,.]+)\s*(?:€|EUR)`)
	if match := amountRe.FindStringSubmatch(text); len(match) > 1 {
		inv.TotalAmount = parseGermanAmount(match[1])
	}

	// 5. Zeilenweise Extraktion
	itemDateRe := regexp.MustCompile(`(\d{2}\.\d{2}\.\d{4})`)

	for _, line := range lines {
		regMatch := aircraftRe.FindString(line)
		dateMatch := itemDateRe.FindString(line)

		if regMatch != "" && dateMatch != "" {
			// Suche nach dem Betrag (oft am Zeilenende)
			priceRe := regexp.MustCompile(`([\d,.]+)\s*$`)
			priceMatch := priceRe.FindStringSubmatch(strings.TrimSpace(line))

			var price float64
			if len(priceMatch) > 1 {
				price = parseGermanAmount(priceMatch[1])
			}

			inv.LineItems = append(inv.LineItems, PDFLineItem{
				Date:                 dateMatch,
				AircraftRegistration: regMatch,
				Amount:               price,
			})
			log.Printf("[Parser] Treffer: %s am %s (%.2f €)", regMatch, dateMatch, price)
		}
	}

	return inv, nil
}

func parseGermanAmount(s string) float64 {
	s = strings.ReplaceAll(s, ".", "")
	s = strings.ReplaceAll(s, ",", ".")
	val, _ := strconv.ParseFloat(s, 64)
	return val
}
