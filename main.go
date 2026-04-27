package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/aerobudget/aerobudget/db"
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
		json.NewDecoder(r.Body).Decode(&req)
		query, args, _ := sqlx.In(`DELETE FROM flights WHERE id IN (?)`, req.IDs)
		db.DB.Exec(db.DB.Rebind(query), args...)
		w.WriteHeader(200)
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
		json.NewDecoder(r.Body).Decode(&club)
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

	// --- STATS & IMPORT (gekürzt für Übersicht) ---
	r.Get("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		// ... (deine bestehende Stats-Logik)
	})

	r.Post("/api/import/logbook", func(w http.ResponseWriter, r *http.Request) {
		// ... (deine bestehende Import-Logik)
	})

	// Background Watcher & Static Serve
	watchDir := os.Getenv("INVOICE_WATCH_DIR")
	if watchDir == "" {
		watchDir = "data/invoices"
	}
	os.MkdirAll(watchDir, 0755)
	go watcher.Watch(watchDir)

	http.Handle("/", http.FileServer(http.Dir("./frontend/dist")))
	log.Fatal(http.ListenAndServe(":8080", r))
}
