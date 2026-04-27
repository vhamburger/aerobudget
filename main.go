package main

import (
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
