package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

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
		log.Fatalf("Failed to initialize database: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	r.Get("/api/flights", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.DB.Queryx(`SELECT id, date, aircraft, departure, arrival, block_minutes, flight_minutes, pilot, cost FROM flights ORDER BY date DESC`)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type Flight struct {
			ID            int     `db:"id" json:"id"`
			Date          string  `db:"date" json:"date"`
			Aircraft      string  `db:"aircraft" json:"aircraft"`
			Departure     string  `db:"departure" json:"departure"`
			Arrival       string  `db:"arrival" json:"arrival"`
			BlockMinutes  int     `db:"block_minutes" json:"block_minutes"`
			FlightMinutes int     `db:"flight_minutes" json:"flight_minutes"`
			Pilot         string  `db:"pilot" json:"pilot"`
			Cost          float64 `db:"cost" json:"cost"`
		}

		var flights []Flight
		for rows.Next() {
			var f Flight
			if err := rows.StructScan(&f); err != nil {
				continue
			}
			flights = append(flights, f)
		}
		if flights == nil {
			flights = []Flight{}
		}

		w.Header().Set("Content-Type", "application/json")
		enc := json.NewEncoder(w)
		enc.Encode(flights)
	})

	r.Delete("/api/flights/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		_, err := db.DB.Exec(`DELETE FROM flights WHERE id = ?`, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	r.Post("/api/flights/delete-batch", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			IDs []int `json:"ids"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if len(req.IDs) == 0 {
			w.WriteHeader(http.StatusOK)
			return
		}

		// sqlx.In hilft uns, das Slice (?) in eine (id1, id2, ...) Liste umzuwandeln
		query, args, err := sqlx.In(`DELETE FROM flights WHERE id IN (?)`, req.IDs)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		query = db.DB.Rebind(query) // Für SQLite/Postgres Kompatibilität

		_, err = db.DB.Exec(query, args...)
		if err != nil {
			http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"message": "Erfolgreich %d Flüge gelöscht"}`, len(req.IDs))
	})

	r.Get("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		type Stats struct {
			TotalFlights       int     `json:"total_flights"`
			TotalFlightMinutes int     `json:"total_flight_minutes"`
			TotalCost          float64 `json:"total_cost"`
			CostPerHour        float64 `json:"cost_per_hour"`
			AircraftStats      []struct {
				Aircraft string  `json:"aircraft"`
				Minutes  int     `json:"minutes"`
				Cost     float64 `json:"cost"`
			} `json:"aircraft_stats"`
			MonthlyCosts []struct {
				Month string  `json:"month"`
				Cost  float64 `json:"cost"`
			} `json:"monthly_costs"`
		}

		var stats Stats

		db.DB.QueryRowx(`SELECT COUNT(*), COALESCE(SUM(flight_minutes),0), COALESCE(SUM(cost),0) FROM flights`).
			Scan(&stats.TotalFlights, &stats.TotalFlightMinutes, &stats.TotalCost)

		if stats.TotalFlightMinutes > 0 {
			stats.CostPerHour = stats.TotalCost / (float64(stats.TotalFlightMinutes) / 60.0)
		}

		rows, _ := db.DB.Queryx(`SELECT aircraft, SUM(flight_minutes) as minutes, SUM(cost) as cost FROM flights GROUP BY aircraft ORDER BY minutes DESC`)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var a struct {
					Aircraft string  `db:"aircraft"`
					Minutes  int     `db:"minutes"`
					Cost     float64 `db:"cost"`
				}
				rows.StructScan(&a)
				stats.AircraftStats = append(stats.AircraftStats, struct {
					Aircraft string  `json:"aircraft"`
					Minutes  int     `json:"minutes"`
					Cost     float64 `json:"cost"`
				}{a.Aircraft, a.Minutes, a.Cost})
			}
		}

		rows2, _ := db.DB.Queryx(`SELECT strftime('%Y-%m', date) as month, SUM(cost) as cost FROM flights GROUP BY month ORDER BY month ASC`)
		if rows2 != nil {
			defer rows2.Close()
			for rows2.Next() {
				var m struct {
					Month string  `db:"month"`
					Cost  float64 `db:"cost"`
				}
				rows2.StructScan(&m)
				stats.MonthlyCosts = append(stats.MonthlyCosts, struct {
					Month string  `json:"month"`
					Cost  float64 `json:"cost"`
				}{m.Month, m.Cost})
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	})

	r.Post("/api/import/logbook", func(w http.ResponseWriter, r *http.Request) {
		file, _, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		flights, err := importer.ParseCSV(file, importer.B4TakeoffTemplate)
		if err != nil {
			http.Error(w, "Failed to parse CSV: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Insert into DB
		count := 0
		for _, f := range flights {
			_, err := db.DB.Exec(`INSERT INTO flights (date, aircraft, departure, arrival, block_minutes, flight_minutes, pilot) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				f.Date, f.Aircraft, f.Departure, f.Arrival, f.BlockMinutes, f.FlightMinutes, f.Pilot)
			if err != nil {
				log.Printf("Error inserting flight: %v", err)
			} else {
				count++
			}
		}

		w.Write([]byte(fmt.Sprintf("Successfully imported %d flights", count)))
	})

	// Start Background Watcher
	watchDir := os.Getenv("INVOICE_WATCH_DIR")
	if watchDir == "" {
		watchDir = "data/invoices"
	}
	os.MkdirAll(watchDir, 0755)

	go func() {
		log.Printf("Starting background watcher on %s", watchDir)
		err := watcher.Watch(watchDir)
		if err != nil {
			log.Printf("Watcher error: %v", err)
		}
	}()

	// Serve Static Frontend (Vite Build)
	fs := http.FileServer(http.Dir("./frontend/dist"))
	r.Handle("/*", http.StripPrefix("/", fs))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
