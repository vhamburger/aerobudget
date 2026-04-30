package importer

import (
	"bytes"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
	"github.com/aerobudget/aerobudget/db"
	"github.com/aerobudget/aerobudget/models"
)

type PDFInvoice struct {
	InvoiceNumber string
	Date          string
	TotalAmount   float64
	LineItems     []*PDFLineItem
}

type PDFLineItem struct {
	AircraftRegistration string
	Date                 string
	Minutes              int
	Amount               float64 // Total
	FlightCost           float64
	FuelCost             float64
	LandingFee           float64
	ApproachFee          float64
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
func ParseInvoiceText(text string, knownAircraft []string, clubs []models.Club, fallbackName string) (PDFInvoice, error) {
	inv := PDFInvoice{}
	lines := strings.Split(text, "\n")

	var activeClub *models.Club
	for _, c := range clubs {
		if strings.Contains(text, c.SearchTerm) || strings.Contains(text, c.Name) {
			activeClub = &c
			db.Log(fmt.Sprintf("[Parser] Verein erkannt: %s (Heuristik: %s)", c.Name, c.Heuristic), false)
			break
		}
	}

	// Dynamic Regex for registrations
	var aircraftRe *regexp.Regexp
	if len(knownAircraft) > 0 {
		pattern := `\b(` + strings.Join(knownAircraft, "|") + `)\b`
		aircraftRe = regexp.MustCompile(pattern)
	} else {
		aircraftRe = regexp.MustCompile(`\b(D-[A-Z]{4}|OE-[A-Z]{3})\b`)
	}

	// Invoice Number
	var invNumRe *regexp.Regexp
	valuePattern := `([A-Z0-9-/]+)`
	if activeClub != nil && activeClub.InvoiceNumberNumericOnly {
		valuePattern = `([0-9]+)`
	}

	if activeClub != nil && activeClub.InvoiceNumberKeyword != "" {
		invNumRe = regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(activeClub.InvoiceNumberKeyword) + `\b[\s:]*` + valuePattern)
	} else {
		invNumRe = regexp.MustCompile(`(?i)\b(?:Rechnungsnummer|RechnungNr|Inv-No|Rechnung)\b[\s:]*` + valuePattern)
	}

	if matches := invNumRe.FindAllStringSubmatch(text, -1); len(matches) > 0 {
		for _, m := range matches {
			val := strings.TrimSpace(m[1])
			valLower := strings.ToLower(val)
			// Ignore false positives
			if valLower != "qr-code" && valLower != "iban" && len(val) > 2 {
				inv.InvoiceNumber = val
				db.Log(fmt.Sprintf("[Parser] Rechnungsnummer extrahiert: %s", inv.InvoiceNumber), false)
				break
			}
		}
	}
	
	if inv.InvoiceNumber == "" {
		inv.InvoiceNumber = fmt.Sprintf("INV-%s-%d", fallbackName, time.Now().UnixNano())
		db.Log(fmt.Sprintf("[Parser] KEINE valide Rechnungsnummer gefunden, verwende Fallback: %s", inv.InvoiceNumber), true)
	}

	// Invoice Date
	// Invoice Date (Supports DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY)
	dateRe := regexp.MustCompile(`\b(\d{2}[./]\d{2}[./]\d{4})\b`)
	if match := dateRe.FindStringSubmatch(text); len(match) > 1 {
		inv.Date = match[1]
	}

	// Total Amount
	amountRe := regexp.MustCompile(`(?i)(?:Gesamtbetrag|Summe|Total|Endbetrag)[\s:]*([\d,.]+)\s*(?:€|EUR)`)
	if match := amountRe.FindStringSubmatch(text); len(match) > 1 {
		inv.TotalAmount = ParseAmount(match[1], "") // Detect automatically if possible
	}

	// Extraction
	itemDateRe := regexp.MustCompile(`(\d{2}[./]\d{2}[./]\d{4})`)
	amountsRe := regexp.MustCompile(`([\d,.]+,\d{2}|[\d,.]+\.\d{2})`)
	// 1. Column Detection (Header Scan)
	type colDef struct {
		name string
		pos  int
	}
	var columns []colDef
	if activeClub != nil {
		for _, line := range lines {
			lLow := strings.ToLower(line)
			// We look for a line that contains at least one of the keywords
			found := false
			if activeClub.FlightAmountKeyword != "" && strings.Contains(lLow, strings.ToLower(activeClub.FlightAmountKeyword)) {
				columns = append(columns, colDef{"flight", strings.Index(lLow, strings.ToLower(activeClub.FlightAmountKeyword))})
				found = true
			}
			if activeClub.LandingFeeKeyword != "" && strings.Contains(lLow, strings.ToLower(activeClub.LandingFeeKeyword)) {
				columns = append(columns, colDef{"landing", strings.Index(lLow, strings.ToLower(activeClub.LandingFeeKeyword))})
				found = true
			}
			if activeClub.ApproachFeeKeyword != "" && strings.Contains(lLow, strings.ToLower(activeClub.ApproachFeeKeyword)) {
				columns = append(columns, colDef{"approach", strings.Index(lLow, strings.ToLower(activeClub.ApproachFeeKeyword))})
				found = true
			}
			if found && len(columns) >= 1 {
				db.Log(fmt.Sprintf("[Parser] Spalten-Header erkannt: %v", columns), false)
				break
			}
		}
	}

	var lastItem *PDFLineItem

	for _, line := range lines {
		lineLower := strings.ToLower(line)
		regMatch := aircraftRe.FindString(line)
		dateMatch := itemDateRe.FindString(line)

		if regMatch != "" && dateMatch != "" {
			item := &PDFLineItem{
				Date:                 dateMatch,
				AircraftRegistration: regMatch,
			}

			// Find all prices and their positions in the line
			priceMatches := amountsRe.FindAllStringIndex(line, -1)
			type priceInfo struct {
				val float64
				pos int
				claimed bool
			}
			var prices []priceInfo
			for _, m := range priceMatches {
				prices = append(prices, priceInfo{
					val: ParseAmount(line[m[0]:m[1]], ""),
					pos: m[0],
				})
			}

			// Strategy 1: Column-based (if header was found)
			if len(columns) > 0 {
				for i := range prices {
					for _, col := range columns {
						// Tolerance of +/- 15 characters for column alignment
						if prices[i].pos >= col.pos-15 && prices[i].pos <= col.pos+15 {
							switch col.name {
							case "flight": item.FlightCost = prices[i].val
							case "landing": item.LandingFee = prices[i].val
							case "approach": item.ApproachFee = prices[i].val
							}
							prices[i].claimed = true
						}
					}
				}
			}

			// Strategy 2: Keyword-based on same line (if not claimed yet)
			if activeClub != nil {
				keywords := []struct {
					name string
					kw   string
				}{
					{"flight", activeClub.FlightAmountKeyword},
					{"landing", activeClub.LandingFeeKeyword},
					{"approach", activeClub.ApproachFeeKeyword},
				}

				for _, kw := range keywords {
					if kw.kw == "" { continue }
					kwPos := strings.Index(lineLower, strings.ToLower(kw.kw))
					if kwPos != -1 {
						// Find the closest UNCLAIMED price after this keyword
						bestIdx := -1
						minDist := 9999
						for i := range prices {
							if prices[i].claimed { continue }
							dist := prices[i].pos - kwPos
							if dist > 0 && dist < minDist {
								minDist = dist
								bestIdx = i
							}
						}
						if bestIdx != -1 {
							switch kw.name {
							case "flight": item.FlightCost = prices[bestIdx].val
							case "landing": item.LandingFee = prices[bestIdx].val
							case "approach": item.ApproachFee = prices[bestIdx].val
							}
							prices[bestIdx].claimed = true
						}
					}
				}
			}

			// Strategy 3: Defaulting (Everything unclaimed goes to FlightCost)
			for i := range prices {
				if !prices[i].claimed {
					// If we already have a flight cost, we add to it (e.g. multi-part flight costs)
					item.FlightCost += prices[i].val
					prices[i].claimed = true
				}
			}

			// 4. Try to extract minutes (Duration)
			durationRe := regexp.MustCompile(`(\d+)h\s*(\d+)m|(\d+)[:.](\d+)\s*h?`)
			if m := durationRe.FindStringSubmatch(line); len(m) > 0 {
				if m[1] != "" {
					h, _ := strconv.Atoi(m[1])
					mi, _ := strconv.Atoi(m[2])
					item.Minutes = h*60 + mi
				} else if m[3] != "" {
					h, _ := strconv.Atoi(m[3])
					mi, _ := strconv.Atoi(m[4])
					// Handle both 1:30 and 1.5 format
					if strings.Contains(m[0], ":") {
						item.Minutes = h*60 + mi
					} else {
						// It's likely decimal hours (1.25)
						f, _ := strconv.ParseFloat(m[3]+"."+m[4], 64)
						item.Minutes = int(f * 60)
					}
				}
			}

			item.Amount = item.FlightCost + item.LandingFee + item.ApproachFee
			inv.LineItems = append(inv.LineItems, item)
			lastItem = item
			db.Log(fmt.Sprintf("[Parser] NEUER Flug: %s %s | %.2f € | Min: %d", 
				item.AircraftRegistration, item.Date, item.Amount, item.Minutes), false)

		} else if lastItem != nil && activeClub != nil {
			// Follow-up logic (e.g. fees on the next line)
			priceMatches := amountsRe.FindAllStringSubmatch(line, -1)
			if len(priceMatches) > 0 {
				price := ParseAmount(priceMatches[len(priceMatches)-1][1], "")
				if activeClub.LandingFeeKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.LandingFeeKeyword)) {
					lastItem.LandingFee += price
					lastItem.Amount += price
					db.Log(fmt.Sprintf("[Parser] ADD Folgezeile Ldg: %.2f", price), false)
				} else if activeClub.ApproachFeeKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.ApproachFeeKeyword)) {
					lastItem.ApproachFee += price
					lastItem.Amount += price
					db.Log(fmt.Sprintf("[Parser] ADD Folgezeile ACG: %.2f", price), false)
				}
			}
		}
	}

	return inv, nil
}

func ParseAmount(s string, locale string) float64 {
	// If locale is empty, try to guess
	// If it contains a comma and then two digits at the end, it's likely German format (1.234,56)
	// If it contains a dot and then two digits at the end, it's likely English format (1,234.56)
	
	isGerman := strings.Contains(s, ",") && (len(s) - strings.LastIndex(s, ",") == 3)
	
	if locale == "de" || (locale == "" && isGerman) {
		s = strings.ReplaceAll(s, ".", "")
		s = strings.ReplaceAll(s, ",", ".")
	} else {
		// English format
		s = strings.ReplaceAll(s, ",", "")
	}
	
	val, _ := strconv.ParseFloat(s, 64)
	return val
}
