package db

import (
	_ "embed"
	"log"
	"os"
	"path/filepath"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schema string

var DB *sqlx.DB

// InitDB initializes the SQLite database
func InitDB(dbPath string) error {
	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return err
	}

	var err error
	DB, err = sqlx.Connect("sqlite", dbPath)
	if err != nil {
		return err
	}

	// Apply embedded schema (CREATE TABLE IF NOT EXISTS - safe to re-run)
	_, err = DB.Exec(schema)
	if err != nil {
		return err
	}

	// Run column migrations (ALTER TABLE ... ADD COLUMN - silently ignore if already exists)
	migrations := []string{
		`ALTER TABLE flights ADD COLUMN flight_rule TEXT DEFAULT 'VFR'`,
		`ALTER TABLE flights ADD COLUMN training_type TEXT DEFAULT ''`,
		`ALTER TABLE clubs ADD COLUMN search_term TEXT DEFAULT ''`,
		`ALTER TABLE clubs ADD COLUMN heuristic TEXT DEFAULT 'highest_value'`,
		`ALTER TABLE clubs ADD COLUMN flight_amount_keyword TEXT DEFAULT ''`,
		`ALTER TABLE clubs ADD COLUMN landing_fee_keyword TEXT DEFAULT ''`,
		`ALTER TABLE clubs ADD COLUMN approach_fee_keyword TEXT DEFAULT ''`,
		`ALTER TABLE flights ADD COLUMN flight_cost REAL DEFAULT 0.0`,
		`ALTER TABLE flights ADD COLUMN landing_fee REAL DEFAULT 0.0`,
		`ALTER TABLE flights ADD COLUMN approach_fee REAL DEFAULT 0.0`,
	}
	for _, m := range migrations {
		if _, err := DB.Exec(m); err != nil {
			// SQLite returns an error if column already exists - that's fine
			log.Printf("[DB] Migration skipped (already applied): %v", err)
		}
	}

	// Seed default CSV templates if not yet present
	var count int
	DB.Get(&count, `SELECT COUNT(*) FROM csv_templates`)
	if count == 0 {
		log.Println("[DB] Seeding default CSV templates...")
		DB.Exec(`INSERT INTO csv_templates (name, delimiter, has_header, date_format, date_col, aircraft_col, departure_col, arrival_col, block_minutes_col, flight_minutes_col, pilot_col, training_type_col, flight_rule_col, is_default)
			VALUES ('B4 Takeoff', ';', 1, '02.01.2006', 0, 1, 4, 5, 6, 7, 3, 11, 2, 1)`)
		DB.Exec(`INSERT INTO csv_templates (name, delimiter, has_header, date_format, date_col, aircraft_col, departure_col, arrival_col, block_minutes_col, flight_minutes_col, pilot_col, training_type_col, flight_rule_col, is_default)
			VALUES ('Generic', ';', 1, '02.01.2006', 0, 1, 2, 3, 4, 5, 6, -1, -1, 0)`)
	}

	log.Println("Database initialized successfully.")
	return nil
}
