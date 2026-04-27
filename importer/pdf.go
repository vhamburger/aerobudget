package importer

import (
	"bytes"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// PDFInvoice represents extracted data from a PDF invoice
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

// ExtractText uses pdftotext (from poppler-utils) to extract text from a PDF file.
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

// ParseInvoiceText is a rudimentary parser that uses Regex to find dates, amounts, and aircrafts.
// In a real scenario, this would be highly customized to the specific club's invoice layout.
func ParseInvoiceText(text string) (PDFInvoice, error) {
	inv := PDFInvoice{}
	
	// Example naive regex for Date (DD.MM.YYYY)
	dateRe := regexp.MustCompile(`\b(\d{2}\.\d{2}\.\d{4})\b`)
	if match := dateRe.FindStringSubmatch(text); len(match) > 1 {
		inv.Date = match[1]
	} else {
		inv.Date = time.Now().Format("02.01.2006")
	}

	// Example naive regex for Invoice Number (Rechnungsnummer: 12345)
	invNumRe := regexp.MustCompile(`(?i)Rechnungsnummer[\s:]*([A-Z0-9-]+)`)
	if match := invNumRe.FindStringSubmatch(text); len(match) > 1 {
		inv.InvoiceNumber = strings.TrimSpace(match[1])
	} else {
		inv.InvoiceNumber = fmt.Sprintf("INV-%d", time.Now().Unix())
	}

	// Example naive regex for total amount
	amountRe := regexp.MustCompile(`(?i)(?:Gesamtbetrag|Summe|Total)[\s:]*([\d,.]+)\s*(?:€|EUR)`)
	if match := amountRe.FindStringSubmatch(text); len(match) > 1 {
		valStr := strings.ReplaceAll(match[1], ".", "")
		valStr = strings.ReplaceAll(valStr, ",", ".")
		if val, err := strconv.ParseFloat(valStr, 64); err == nil {
			inv.TotalAmount = val
		}
	}

	// Example naive regex for finding a flight line item:
	// Date | Aircraft | Minutes | Amount
	// 01.05.2024 D-EXYZ 60 150,00
	itemRe := regexp.MustCompile(`\b(\d{2}\.\d{2}\.\d{4})\s+([D]-[A-Z]{4})\s+(\d+)\s+([\d,.]+)\b`)
	matches := itemRe.FindAllStringSubmatch(text, -1)
	for _, match := range matches {
		if len(match) == 5 {
			valStr := strings.ReplaceAll(match[4], ".", "")
			valStr = strings.ReplaceAll(valStr, ",", ".")
			amount, _ := strconv.ParseFloat(valStr, 64)
			minutes, _ := strconv.Atoi(match[3])
			
			inv.LineItems = append(inv.LineItems, PDFLineItem{
				Date:                 match[1],
				AircraftRegistration: match[2],
				Minutes:              minutes,
				Amount:               amount,
			})
		}
	}

	return inv, nil
}
