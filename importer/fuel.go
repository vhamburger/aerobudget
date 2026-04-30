package importer

import (
	"regexp"
)

type FuelReceipt struct {
	Aircraft    string
	Airport     string
	Date        string
	TotalAmount float64
}

func ParseFuelReceipt(text string) *FuelReceipt {
	r := &FuelReceipt{}
	
	// Aircraft: registracija letala OE-AFL
	reAircraft := regexp.MustCompile(`registracija letala\s+([A-Z0-9-]+)`)
	if m := reAircraft.FindStringSubmatch(text); len(m) > 1 {
		r.Aircraft = m[1]
	}

	// Airport: PORTOROŽ / LJPZ
	reAirport := regexp.MustCompile(`PORTOROŽ\s*/\s*([A-Z]{4})`)
	if m := reAirport.FindStringSubmatch(text); len(m) > 1 {
		r.Airport = m[1]
	}

	// Date: datum 30.08.2024
	reDate := regexp.MustCompile(`datum\s+(\d{2}\.\d{2}\.\d{4})`)
	if m := reDate.FindStringSubmatch(text); len(m) > 1 {
		r.Date = m[1]
	}

	// Total: total amount 49,22
	// Handle both comma and dot as decimal separator
	reTotal := regexp.MustCompile(`total amount\s+(\d+[,.]\d+)`)
	if m := reTotal.FindStringSubmatch(text); len(m) > 1 {
		r.TotalAmount = ParseAmount(m[1], "de")
	}

	// Fallback for amount if "total amount" fails
	if r.TotalAmount == 0 {
		reTotalFallback := regexp.MustCompile(`skupni znesek\s+(\d+[,.]\d+)`)
		if m := reTotalFallback.FindStringSubmatch(text); len(m) > 1 {
			r.TotalAmount = ParseAmount(m[1], "de")
		}
	}

	if r.Aircraft == "" || r.Date == "" || r.TotalAmount == 0 {
		return nil
	}
	return r
}
