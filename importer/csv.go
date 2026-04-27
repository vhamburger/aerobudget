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

// CSVTemplate defines how to map CSV columns to flight fields
type CSVTemplate struct {
	Name            string `json:"name"`
	Delimiter       rune   `json:"delimiter"`
	HasHeader       bool   `json:"has_header"`
	DateFormat      string `json:"date_format"`
	DateCol         int    `json:"date_col"`
	AircraftCol     int    `json:"aircraft_col"`
	DepartureCol    int    `json:"departure_col"`
	ArrivalCol      int    `json:"arrival_col"`
	BlockMinutesCol int    `json:"block_minutes_col"`
	FlightMinutesCol int    `json:"flight_minutes_col"`
	PilotCol        int    `json:"pilot_col"`
}

// B4TakeoffTemplate is a default template for B4 Takeoff export
var B4TakeoffTemplate = CSVTemplate{
	Name:            "B4 Takeoff",
	Delimiter:       ';',
	HasHeader:       true,
	DateFormat:      "02.01.2006", // DD.MM.YYYY format
	DateCol:         0,
	AircraftCol:     1,
	DepartureCol:    4,
	ArrivalCol:      5,
	BlockMinutesCol: 6,
	FlightMinutesCol: 7,
	PilotCol:        3,
}

// parseHHMM converts "HH:MM" to total minutes
func parseHHMM(timeStr string) (int, error) {
	parts := strings.Split(strings.TrimSpace(timeStr), ":")
	if len(parts) != 2 {
		// Try to parse as normal integer if not HH:MM
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
func ParseCSV(reader io.Reader, tmpl CSVTemplate) ([]models.Flight, error) {
	r := csv.NewReader(reader)
	r.Comma = tmpl.Delimiter
	r.FieldsPerRecord = -1 // Allow variable number of fields

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
			// Parse date using template's format and convert to ISO (YYYY-MM-DD) for correct SQLite sorting
			parsed, err := time.Parse(tmpl.DateFormat, dateStr)
			if err != nil {
				continue // Skip rows with invalid/non-date values (e.g. "Gesamt", "Übertrag")
			}
			flight.Date = parsed.Format("2006-01-02") // Store as YYYY-MM-DD
		} else {
			continue // No date column available
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

		flights = append(flights, flight)
	}

	return flights, nil
}
