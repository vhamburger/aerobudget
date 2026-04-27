package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/aerobudget/aerobudget/db"
	"github.com/aerobudget/aerobudget/importer"
	"github.com/aerobudget/aerobudget/models"
	"github.com/aerobudget/aerobudget/watcher"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jmoiron/sqlx"
)

const AppVersion = "1.0.37"

func main() {
	log.Printf("=========================================")
	log.Printf("   Aerobudget Starting (v%s)", AppVersion)
	log.Printf("=========================================")
	
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/aerobudget.db"
	}

	if err := db.InitDB(dbPath); err != nil {
		log.Fatalf("Fehler beim Initialisieren der DB: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"https://*", "http://*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
	}))

	// --- FLIGHTS API ---
	r.Get("/api/flights", func(w http.ResponseWriter, r *http.Request) {
		var flights []struct {
			ID            int     `db:"id" json:"id"`
			Date          string  `db:"date" json:"date"`
			Aircraft      string  `db:"aircraft" json:"aircraft"`
			Departure     string  `db:"departure" json:"departure"`
			Arrival       string  `db:"arrival" json:"arrival"`
			BlockMinutes  int     `db:"block_minutes" json:"block_minutes"`
			FlightMinutes int     `db:"flight_minutes" json:"flight_minutes"`
			TrainingType  string  `db:"training_type" json:"training_type"`
			FlightRule    string  `db:"flight_rule" json:"flight_rule"`
			Pilot         string  `db:"pilot" json:"pilot"`
			Cost          float64 `db:"cost" json:"cost"`
			FlightCost    float64 `db:"flight_cost" json:"flight_cost"`
			LandingFee    float64 `db:"landing_fee" json:"landing_fee"`
			ApproachFee   float64 `db:"approach_fee" json:"approach_fee"`
			InvoiceID     *int    `db:"invoice_id" json:"invoice_id"`
		}
		err := db.DB.Select(&flights, `SELECT id, date, aircraft, departure, arrival, block_minutes, flight_minutes, training_type, flight_rule, pilot, cost, flight_cost, landing_fee, approach_fee, invoice_id FROM flights ORDER BY date DESC`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		if flights == nil {
			flights = []struct {
				ID            int     `db:"id" json:"id"`
				Date          string  `db:"date" json:"date"`
				Aircraft      string  `db:"aircraft" json:"aircraft"`
				Departure     string  `db:"departure" json:"departure"`
				Arrival       string  `db:"arrival" json:"arrival"`
				BlockMinutes  int     `db:"block_minutes" json:"block_minutes"`
				FlightMinutes int     `db:"flight_minutes" json:"flight_minutes"`
				TrainingType  string  `db:"training_type" json:"training_type"`
				FlightRule    string  `db:"flight_rule" json:"flight_rule"`
				Pilot         string  `db:"pilot" json:"pilot"`
				Cost          float64 `db:"cost" json:"cost"`
				FlightCost    float64 `db:"flight_cost" json:"flight_cost"`
				LandingFee    float64 `db:"landing_fee" json:"landing_fee"`
				ApproachFee   float64 `db:"approach_fee" json:"approach_fee"`
				InvoiceID     *int    `db:"invoice_id" json:"invoice_id"`
			}{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(flights)
	})

	r.Post("/api/flights/delete-batch", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			IDs []int `json:"ids"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Ungültige Anfrage", 400)
			return
		}
		if len(req.IDs) == 0 {
			w.WriteHeader(200)
			return
		}
		query, args, _ := sqlx.In(`DELETE FROM flights WHERE id IN (?)`, req.IDs)
		db.DB.Exec(db.DB.Rebind(query), args...)
		w.WriteHeader(200)
	})

	// --- STATS API ---
	r.Get("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		type AircraftStat struct {
			Aircraft string  `db:"aircraft" json:"aircraft"`
			Minutes  int     `db:"minutes" json:"minutes"`
			Cost     float64 `db:"cost" json:"cost"`
		}
		type MonthlyStat struct {
			Month string  `db:"month" json:"month"`
			Cost  float64 `db:"cost" json:"cost"`
		}
		type TrainingStat struct {
			Name  string  `json:"name"`
			Cost  float64 `json:"cost"`
			Hours float64 `json:"hours"`
		}
		type Stats struct {
			TotalFlights       int            `json:"total_flights"`
			TotalFlightMinutes int            `json:"total_flight_minutes"`
			TotalCost          float64        `json:"total_cost"`
			CostPerHour        float64        `json:"cost_per_hour"`
			AircraftStats      []AircraftStat `json:"aircraft_stats"`
			MonthlyCosts       []MonthlyStat  `json:"monthly_costs"`
			TrainingStats      []TrainingStat `json:"training_stats"`
		}

		var stats Stats
		db.DB.QueryRowx(`SELECT COUNT(*), COALESCE(SUM(flight_minutes),0), COALESCE(SUM(cost),0) FROM flights`).
			Scan(&stats.TotalFlights, &stats.TotalFlightMinutes, &stats.TotalCost)

		if stats.TotalFlightMinutes > 0 {
			stats.CostPerHour = stats.TotalCost / (float64(stats.TotalFlightMinutes) / 60.0)
		}

		// Aircraft Stats
		rows, _ := db.DB.Queryx(`SELECT aircraft, SUM(flight_minutes) as minutes, SUM(cost) as cost FROM flights GROUP BY aircraft ORDER BY minutes DESC`)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var a AircraftStat
				if err := rows.StructScan(&a); err != nil {
					continue
				}
				stats.AircraftStats = append(stats.AircraftStats, a)
			}
		}

		// Monthly Costs
		rows2, _ := db.DB.Queryx(`SELECT strftime('%Y-%m', date) as month, SUM(cost) as cost FROM flights GROUP BY month ORDER BY month ASC`)
		if rows2 != nil {
			defer rows2.Close()
			for rows2.Next() {
				var m MonthlyStat
				if err := rows2.StructScan(&m); err != nil {
					continue
				}
				stats.MonthlyCosts = append(stats.MonthlyCosts, m)
			}
		}

		// Training Stats: for each training period, sum costs of training flights in that date range
		var trainings []models.Training
		db.DB.Select(&trainings, `SELECT id, name, start_date, end_date FROM trainings ORDER BY start_date ASC`)
		for _, t := range trainings {
			var cost float64
			var minutes int
			db.DB.QueryRowx(`
				SELECT COALESCE(SUM(cost),0), COALESCE(SUM(flight_minutes),0) FROM flights 
				WHERE date >= ? AND date <= ? 
				AND training_type != '' AND training_type != 'Nein'`,
				t.StartDate, t.EndDate).Scan(&cost, &minutes)
			stats.TrainingStats = append(stats.TrainingStats, TrainingStat{
				Name:  t.Name,
				Cost:  cost,
				Hours: float64(minutes) / 60.0,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	})

	// --- CLUBS API ---
	r.Get("/api/clubs", func(w http.ResponseWriter, r *http.Request) {
		var clubs []struct {
			ID          int    `db:"id" json:"id"`
			Name        string `db:"name" json:"name"`
			BillingType string `db:"billing_type" json:"billing_type"`
		}
		db.DB.Select(&clubs, `SELECT id, name, billing_type FROM clubs ORDER BY name ASC`)
		if clubs == nil {
			clubs = []struct {
				ID          int    `db:"id" json:"id"`
				Name        string `db:"name" json:"name"`
				BillingType string `db:"billing_type" json:"billing_type"`
			}{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(clubs)
	})

	// --- CLUBS API ---
	r.Get("/api/clubs", func(w http.ResponseWriter, r *http.Request) {
		var clubs []models.Club
		err := db.DB.Select(&clubs, `SELECT id, name, search_term, heuristic, flight_amount_keyword, landing_fee_keyword, approach_fee_keyword FROM clubs ORDER BY name ASC`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		if clubs == nil { clubs = []models.Club{} }
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(clubs)
	})

	r.Post("/api/clubs", func(w http.ResponseWriter, r *http.Request) {
		var club models.Club
		if err := json.NewDecoder(r.Body).Decode(&club); err != nil {
			http.Error(w, "Invalid club data", 400)
			return
		}
		_, err := db.DB.Exec(`INSERT INTO clubs (name, search_term, heuristic, flight_amount_keyword, landing_fee_keyword, approach_fee_keyword) VALUES (?, ?, ?, ?, ?, ?)`, 
			club.Name, club.SearchTerm, club.Heuristic, club.FlightAmountKeyword, club.LandingFeeKeyword, club.ApproachFeeKeyword)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(201)
	})

	r.Put("/api/clubs/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var club models.Club
		if err := json.NewDecoder(r.Body).Decode(&club); err != nil {
			http.Error(w, "Invalid club data", 400)
			return
		}
		_, err := db.DB.Exec(`UPDATE clubs SET name=?, search_term=?, heuristic=?, flight_amount_keyword=?, landing_fee_keyword=?, approach_fee_keyword=? WHERE id=?`, 
			club.Name, club.SearchTerm, club.Heuristic, club.FlightAmountKeyword, club.LandingFeeKeyword, club.ApproachFeeKeyword, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(200)
	})

	r.Delete("/api/clubs/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		db.DB.Exec(`DELETE FROM clubs WHERE id = ?`, id)
		w.WriteHeader(200)
	})

	// --- TRAININGS API ---
	r.Get("/api/trainings", func(w http.ResponseWriter, r *http.Request) {
		var trainings []models.Training
		db.DB.Select(&trainings, `SELECT id, name, start_date, end_date FROM trainings ORDER BY start_date ASC`)
		if trainings == nil {
			trainings = []models.Training{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(trainings)
	})

	r.Post("/api/trainings", func(w http.ResponseWriter, r *http.Request) {
		var t struct {
			Name      string `json:"name"`
			StartDate string `json:"start_date"`
			EndDate   string `json:"end_date"`
		}
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, "Invalid training data", 400)
			return
		}
		_, err := db.DB.Exec(`INSERT INTO trainings (name, start_date, end_date) VALUES (?, ?, ?)`, t.Name, t.StartDate, t.EndDate)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(201)
	})

	r.Delete("/api/trainings/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		db.DB.Exec(`DELETE FROM trainings WHERE id = ?`, id)
		w.WriteHeader(200)
	})

	// --- CSV TEMPLATES API ---
	r.Get("/api/csv-templates", func(w http.ResponseWriter, r *http.Request) {
		var templates []models.CSVTemplate
		db.DB.Select(&templates, `SELECT id, name, delimiter, has_header, date_format, date_col, aircraft_col, departure_col, arrival_col, block_minutes_col, flight_minutes_col, pilot_col, training_type_col, flight_rule_col, is_default FROM csv_templates ORDER BY is_default DESC, name ASC`)
		if templates == nil {
			templates = []models.CSVTemplate{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(templates)
	})

	r.Post("/api/csv-templates", func(w http.ResponseWriter, r *http.Request) {
		var t models.CSVTemplate
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, "Invalid template data", 400)
			return
		}
		_, err := db.DB.Exec(`INSERT INTO csv_templates (name, delimiter, has_header, date_format, date_col, aircraft_col, departure_col, arrival_col, block_minutes_col, flight_minutes_col, pilot_col, training_type_col, flight_rule_col, is_default) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			t.Name, t.Delimiter, t.HasHeader, t.DateFormat, t.DateCol, t.AircraftCol, t.DepartureCol, t.ArrivalCol, t.BlockMinutesCol, t.FlightMinutesCol, t.PilotCol, t.TrainingTypeCol, t.FlightRuleCol, t.IsDefault)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(201)
	})

	r.Put("/api/csv-templates/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		var t models.CSVTemplate
		if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
			http.Error(w, "Invalid template data", 400)
			return
		}
		_, err := db.DB.Exec(`UPDATE csv_templates SET name=?, delimiter=?, has_header=?, date_format=?, date_col=?, aircraft_col=?, departure_col=?, arrival_col=?, block_minutes_col=?, flight_minutes_col=?, pilot_col=?, training_type_col=?, flight_rule_col=?, is_default=? WHERE id=?`,
			t.Name, t.Delimiter, t.HasHeader, t.DateFormat, t.DateCol, t.AircraftCol, t.DepartureCol, t.ArrivalCol, t.BlockMinutesCol, t.FlightMinutesCol, t.PilotCol, t.TrainingTypeCol, t.FlightRuleCol, t.IsDefault, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(200)
	})

	r.Delete("/api/csv-templates/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		db.DB.Exec(`DELETE FROM csv_templates WHERE id = ?`, id)
		w.WriteHeader(200)
	})

	r.Post("/api/csv-templates/{id}/set-default", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		tx, err := db.DB.Beginx()
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer tx.Rollback()

		tx.Exec(`UPDATE csv_templates SET is_default = 0`)
		tx.Exec(`UPDATE csv_templates SET is_default = 1 WHERE id = ?`, id)
		
		if err := tx.Commit(); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(200)
	})

	// --- IMPORT API ---
	r.Post("/api/import/logbook", func(w http.ResponseWriter, r *http.Request) {
		file, _, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "Fehler beim Datei-Upload", 400)
			return
		}
		defer file.Close()

		// Get template ID from form
		templateIDStr := r.FormValue("template_id")
		var tmpl models.CSVTemplate

		if templateIDStr != "" {
			templateID, _ := strconv.Atoi(templateIDStr)
			err = db.DB.Get(&tmpl, `SELECT id, name, delimiter, has_header, date_format, date_col, aircraft_col, departure_col, arrival_col, block_minutes_col, flight_minutes_col, pilot_col, training_type_col, flight_rule_col, is_default FROM csv_templates WHERE id = ?`, templateID)
		}
		if err != nil || templateIDStr == "" {
			// Fallback: use default template
			err = db.DB.Get(&tmpl, `SELECT id, name, delimiter, has_header, date_format, date_col, aircraft_col, departure_col, arrival_col, block_minutes_col, flight_minutes_col, pilot_col, training_type_col, flight_rule_col, is_default FROM csv_templates WHERE is_default = 1 LIMIT 1`)
			if err != nil {
				// Final fallback: B4 Takeoff hardcoded
				tmpl = models.CSVTemplate{Delimiter: ";", HasHeader: true, DateFormat: "02.01.2006", DateCol: 0, AircraftCol: 1, DepartureCol: 4, ArrivalCol: 5, BlockMinutesCol: 6, FlightMinutesCol: 7, PilotCol: 3, TrainingTypeCol: 11, FlightRuleCol: 2}
			}
		}

		flights, err := importer.ParseCSV(file, tmpl)
		if err != nil {
			http.Error(w, "Fehler beim Parsen der CSV: "+err.Error(), 500)
			return
		}

		count := 0
		for _, f := range flights {
			_, err := db.DB.Exec(`INSERT INTO flights (date, aircraft, departure, arrival, block_minutes, flight_minutes, training_type, flight_rule, pilot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				f.Date, f.Aircraft, f.Departure, f.Arrival, f.BlockMinutes, f.FlightMinutes, f.TrainingType, f.FlightRule, f.Pilot)
			if err == nil {
				count++
			}
		}
		w.Write([]byte(fmt.Sprintf("Erfolgreich %d Flüge importiert", count)))
	})

	// --- MATCHING / RECONCILE ---
	r.Post("/api/reconcile", func(w http.ResponseWriter, r *http.Request) {
		count, err := watcher.ReconcileMissingCosts()
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"matched": %d}`, count)
	})

	// --- STATIC FILES (React SPA Support) ---
	staticDir := "./frontend/dist"
	fs := http.FileServer(http.Dir(staticDir))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(staticDir, r.URL.Path)
		_, err := os.Stat(path)
		if os.IsNotExist(err) || r.URL.Path == "/" {
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	// Background Watcher
	watchDir := os.Getenv("INVOICE_WATCH_DIR")
	if watchDir == "" {
		watchDir = "data/invoices"
	}
	os.MkdirAll(watchDir, 0755)
	go watcher.Watch(watchDir)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server gestartet auf Port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
