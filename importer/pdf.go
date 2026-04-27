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

type ClubConfig struct {
	Name        string `db:"name"`
	BillingType string `db:"billing_type"`
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

// ParseInvoiceText akzeptiert nun eine Liste bekannter Kennzeichen aus der DB und Vereins-Konfigurationen
func ParseInvoiceText(text string, knownAircraft []string, clubs []ClubConfig) (PDFInvoice, error) {
	inv := PDFInvoice{}
	lines := strings.Split(text, "\n")

	heuristic := "default"
	for _, c := range clubs {
		if strings.Contains(text, c.Name) {
			heuristic = c.BillingType
			log.Printf("[Parser] Verein erkannt: %s, nutze Heuristik: %s", c.Name, heuristic)
			break
		}
	}

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
			var price float64

			// Suche nach allen Beträgen mit 2 Nachkommastellen in der Zeile
			amountsRe := regexp.MustCompile(`\b(\d+(?:[.,]\d{2}))\b`)
			matches := amountsRe.FindAllStringSubmatch(line, -1)
			
			var extractedPrices []float64
			for _, m := range matches {
				p := parseGermanAmount(m[1])
				if p > 0 {
					extractedPrices = append(extractedPrices, p)
				}
			}

			if len(extractedPrices) > 0 {
				if heuristic == "highest_value" {
					for _, p := range extractedPrices {
						if p > price {
							price = p
						}
					}
				} else if heuristic == "last_column" {
					price = extractedPrices[len(extractedPrices)-1]
				} else {
					// Default: Try to get the very last amount of the line
					price = extractedPrices[len(extractedPrices)-1]
				}
			} else if heuristic == "default" {
				// Fallback auf alten Ansatz, falls RegEx ohne Kommastellen
				priceRe := regexp.MustCompile(`([\d,.]+)\s*$`)
				priceMatch := priceRe.FindStringSubmatch(strings.TrimSpace(line))
				if len(priceMatch) > 1 {
					price = parseGermanAmount(priceMatch[1])
				}
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
