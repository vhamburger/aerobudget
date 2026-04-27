package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/aerobudget/aerobudget/db"
	"github.com/aerobudget/aerobudget/importer"
	"github.com/aerobudget/aerobudget/watcher"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jmoiron/sqlx"
)

func main() {
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
			Pilot         string  `db:"pilot" json:"pilot"`
			Cost          float64 `db:"cost" json:"cost"`
			InvoiceID     *int    `db:"invoice_id" json:"invoice_id"`
		}
		err := db.DB.Select(&flights, `SELECT * FROM flights ORDER BY date DESC`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
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
		// Explizite Typen mit beiden Tags verhindern Compiler-Fehler
		type AircraftStat struct {
			Aircraft string  `db:"aircraft" json:"aircraft"`
			Minutes  int     `db:"minutes" json:"minutes"`
			Cost     float64 `db:"cost" json:"cost"`
		}
		type MonthlyStat struct {
			Month string  `db:"month" json:"month"`
			Cost  float64 `db:"cost" json:"cost"`
		}
		type Stats struct {
			TotalFlights       int            `json:"total_flights"`
			TotalFlightMinutes int            `json:"total_flight_minutes"`
			TotalCost          float64        `json:"total_cost"`
			CostPerHour        float64        `json:"cost_per_hour"`
			AircraftStats      []AircraftStat `json:"aircraft_stats"`
			MonthlyCosts       []MonthlyStat  `json:"monthly_costs"`
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
		db.DB.Select(&clubs, `SELECT * FROM clubs ORDER BY name ASC`)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(clubs)
	})

	r.Post("/api/clubs", func(w http.ResponseWriter, r *http.Request) {
		var club struct {
			Name        string `json:"name"`
			BillingType string `json:"billing_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&club); err != nil {
			http.Error(w, "Invalid club data", 400)
			return
		}
		_, err := db.DB.Exec(`INSERT INTO clubs (name, billing_type) VALUES (?, ?)`, club.Name, club.BillingType)
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		w.WriteHeader(201)
	})

	r.Delete("/api/clubs/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		db.DB.Exec(`DELETE FROM clubs WHERE id = ?`, id)
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

		flights, err := importer.ParseCSV(file, importer.B4TakeoffTemplate)
		if err != nil {
			http.Error(w, "Fehler beim Parsen der CSV: "+err.Error(), 500)
			return
		}

		count := 0
		for _, f := range flights {
			_, err := db.DB.Exec(`INSERT INTO flights (date, aircraft, departure, arrival, block_minutes, flight_minutes, pilot) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				f.Date, f.Aircraft, f.Departure, f.Arrival, f.BlockMinutes, f.FlightMinutes, f.Pilot)
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
