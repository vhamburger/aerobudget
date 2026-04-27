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
	"github.com/aerobudget/aerobudget/models"
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
	Amount               float64 // Total
	FlightCost           float64
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
func ParseInvoiceText(text string, knownAircraft []string, clubs []models.Club) (PDFInvoice, error) {
	inv := PDFInvoice{}
	lines := strings.Split(text, "\n")

	var activeClub *models.Club
	for _, c := range clubs {
		if strings.Contains(text, c.SearchTerm) || strings.Contains(text, c.Name) {
			activeClub = &c
			log.Printf("[Parser] Verein erkannt: %s (Heuristik: %s)", c.Name, c.Heuristic)
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
	invNumRe := regexp.MustCompile(`(?i)(?:Rechnungsnummer|RechnungNr|Inv-No)[\s:]*([A-Z0-9-]+)`)
	if match := invNumRe.FindStringSubmatch(text); len(match) > 1 {
		inv.InvoiceNumber = strings.TrimSpace(match[1])
	} else {
		inv.InvoiceNumber = fmt.Sprintf("INV-%d", time.Now().Unix())
	}

	// Invoice Date
	dateRe := regexp.MustCompile(`\b(\d{2}\.\d{2}\.\d{4})\b`)
	if match := dateRe.FindStringSubmatch(text); len(match) > 1 {
		inv.Date = match[1]
	}

	// Total Amount
	amountRe := regexp.MustCompile(`(?i)(?:Gesamtbetrag|Summe|Total|Endbetrag)[\s:]*([\d,.]+)\s*(?:€|EUR)`)
	if match := amountRe.FindStringSubmatch(text); len(match) > 1 {
		inv.TotalAmount = parseGermanAmount(match[1])
	}

	// Extraction
	itemDateRe := regexp.MustCompile(`(\d{2}\.\d{2}\.\d{4})`)
	amountsRe := regexp.MustCompile(`\b(\d+(?:[.,]\d{2}))\b`)
	
	var lastItem *PDFLineItem

	for _, line := range lines {
		lineLower := strings.ToLower(line)
		regMatch := aircraftRe.FindString(line)
		dateMatch := itemDateRe.FindString(line)

		if regMatch != "" && dateMatch != "" {
			// Classification based on user-defined keywords
			hasLandingKw := activeClub != nil && activeClub.LandingFeeKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.LandingFeeKeyword))
			hasApproachKw := activeClub != nil && activeClub.ApproachFeeKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.ApproachFeeKeyword))
			hasFlightKw := activeClub != nil && activeClub.FlightAmountKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.FlightAmountKeyword))

			// Standalone Fee Row detection (HB style): Has fee keyword but no flight keyword
			if (hasLandingKw || hasApproachKw) && !hasFlightKw {
				if lastItem != nil && (lastItem.Date == dateMatch || dateMatch == "") && lastItem.AircraftRegistration == regMatch {
					matches := amountsRe.FindAllStringSubmatch(line, -1)
					if len(matches) > 0 {
						price := parseGermanAmount(matches[len(matches)-1][1])
						if hasLandingKw {
							lastItem.LandingFee += price
							lastItem.Amount += price
							log.Printf("[Parser] + Landegebühr (Keyword: %s): %.2f €", activeClub.LandingFeeKeyword, price)
						} else if hasApproachKw {
							lastItem.ApproachFee += price
							lastItem.Amount += price
							log.Printf("[Parser] + Anfluggebühr (Keyword: %s): %.2f €", activeClub.ApproachFeeKeyword, price)
						}
					}
					continue
				}
			}

			// Otherwise, treat as New Flight or Combined Row
			item := PDFLineItem{
				Date:                 dateMatch,
				AircraftRegistration: regMatch,
			}
			
			matches := amountsRe.FindAllStringSubmatch(line, -1)
			var extractedPrices []float64
			for _, m := range matches {
				p := parseGermanAmount(m[1])
				if p > 0 { 
					extractedPrices = append(extractedPrices, p)
				}
			}

			// 1. Try to find values via explicit keywords in the line
			if hasFlightKw {
				re := regexp.MustCompile(`(?i)` + regexp.QuoteMeta(activeClub.FlightAmountKeyword) + `[\s:]*([\d.,]+)`)
				if m := re.FindStringSubmatch(line); len(m) > 1 {
					item.FlightCost = parseGermanAmount(m[1])
				}
			}
			if hasLandingKw {
				re := regexp.MustCompile(`(?i)` + regexp.QuoteMeta(activeClub.LandingFeeKeyword) + `[\s:]*([\d.,]+)`)
				if m := re.FindStringSubmatch(line); len(m) > 1 {
					item.LandingFee = parseGermanAmount(m[1])
				}
			}
			if hasApproachKw {
				re := regexp.MustCompile(`(?i)` + regexp.QuoteMeta(activeClub.ApproachFeeKeyword) + `[\s:]*([\d.,]+)`)
				if m := re.FindStringSubmatch(line); len(m) > 1 {
					item.ApproachFee = parseGermanAmount(m[1])
				}
			}

			// 2. Fallback for Table structures (Fly Linz style)
			if item.FlightCost == 0 && len(extractedPrices) > 0 {
				if len(extractedPrices) >= 3 {
					// Multi-column row: [Flight, Landing, Approach, ...]
					item.FlightCost = extractedPrices[0]
					if item.LandingFee == 0 { item.LandingFee = extractedPrices[1] }
					if item.ApproachFee == 0 { item.ApproachFee = extractedPrices[2] }
				} else {
					// Single price row
					item.FlightCost = extractedPrices[len(extractedPrices)-1]
				}
			}
			
			item.Amount = item.FlightCost + item.LandingFee + item.ApproachFee

			inv.LineItems = append(inv.LineItems, item)
			lastItem = &inv.LineItems[len(inv.LineItems)-1]
			log.Printf("[Parser] Flug: %s am %s (%.2f €)", regMatch, dateMatch, item.Amount)
		} else if lastItem != nil && activeClub != nil {
			// Check for follow-up lines without registration/date (classical HB fee line)
			matches := amountsRe.FindAllStringSubmatch(line, -1)
			if len(matches) > 0 {
				price := parseGermanAmount(matches[len(matches)-1][1])
				
				if activeClub.LandingFeeKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.LandingFeeKeyword)) {
					lastItem.LandingFee += price
					lastItem.Amount += price
					log.Printf("[Parser] + Landegebühr (Folgezeile): %.2f €", price)
				} else if activeClub.ApproachFeeKeyword != "" && strings.Contains(lineLower, strings.ToLower(activeClub.ApproachFeeKeyword)) {
					lastItem.ApproachFee += price
					lastItem.Amount += price
					log.Printf("[Parser] + Anfluggebühr (Folgezeile): %.2f €", price)
				}
			}
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
