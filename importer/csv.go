package importer

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/aerobudget/aerobudget/models"
)

// parseHHMM converts "HH:MM" to total minutes
func parseHHMM(timeStr string) (int, error) {
	parts := strings.Split(strings.TrimSpace(timeStr), ":")
	if len(parts) != 2 {
		return strconv.Atoi(strings.TrimSpace(timeStr))
	}
	hours, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, err
	}
	minutes, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, err
	}
	return hours*60 + minutes, nil
}

// ParseCSV reads a CSV based on the template and returns a slice of flights
func ParseCSV(reader io.Reader, tmpl models.CSVTemplate) ([]models.Flight, error) {
	delimRune := ';'
	if len(tmpl.Delimiter) > 0 {
		delimRune = rune(tmpl.Delimiter[0])
	}

	r := csv.NewReader(reader)
	r.Comma = delimRune
	r.FieldsPerRecord = -1 // Allow variable number of fields
	r.LazyQuotes = true    // Be lenient with quotes

	var flights []models.Flight

	if tmpl.HasHeader {
		if _, err := r.Read(); err != nil {
			if err == io.EOF {
				return flights, nil
			}
			return nil, fmt.Errorf("failed to read header: %w", err)
		}
	}

	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read record: %w", err)
		}

		flight := models.Flight{}

		if len(record) > tmpl.DateCol {
			dateStr := strings.TrimSpace(record[tmpl.DateCol])
			parsed, err := time.Parse(tmpl.DateFormat, dateStr)
			if err != nil {
				continue // Skip rows with invalid/non-date values (e.g. "Gesamt", "Übertrag")
			}
			flight.Date = parsed.Format("2006-01-02") // Store as YYYY-MM-DD
		} else {
			continue
		}

		if len(record) > tmpl.AircraftCol {
			flight.Aircraft = strings.TrimSpace(record[tmpl.AircraftCol])
		}
		if len(record) > tmpl.DepartureCol {
			flight.Departure = strings.TrimSpace(record[tmpl.DepartureCol])
		}
		if len(record) > tmpl.ArrivalCol {
			flight.Arrival = strings.TrimSpace(record[tmpl.ArrivalCol])
		}
		if len(record) > tmpl.BlockMinutesCol {
			if val, err := parseHHMM(record[tmpl.BlockMinutesCol]); err == nil {
				flight.BlockMinutes = val
			}
		}
		if len(record) > tmpl.FlightMinutesCol {
			if val, err := parseHHMM(record[tmpl.FlightMinutesCol]); err == nil {
				flight.FlightMinutes = val
			}
		}
		if len(record) > tmpl.PilotCol {
			flight.Pilot = strings.TrimSpace(record[tmpl.PilotCol])
		}

		// Training type (e.g. "Schulflug", "Nein", "Prüfungsflug")
		if tmpl.TrainingTypeCol >= 0 && len(record) > tmpl.TrainingTypeCol {
			tt := strings.TrimSpace(record[tmpl.TrainingTypeCol])
			flight.TrainingType = tt
		}

		// Flight rule from labels column (e.g. "IFR", "IFR Training", "Wingly.io" → default VFR)
		if tmpl.FlightRuleCol >= 0 && len(record) > tmpl.FlightRuleCol {
			labels := strings.ToUpper(strings.TrimSpace(record[tmpl.FlightRuleCol]))
			if strings.Contains(labels, "IFR") {
				flight.FlightRule = "IFR"
			} else {
				flight.FlightRule = "VFR"
			}
		} else {
			flight.FlightRule = "VFR"
		}

		flights = append(flights, flight)
	}

	return flights, nil
}
