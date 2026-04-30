package db

import (
	_ "embed"
	"log"
	"os"
	"path/filepath"

	"strings"

	"golang.org/x/crypto/bcrypt"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schema string

var DB *sqlx.DB
var DebugMode bool = false
var GlobalLogLevel string = "INFO"

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
		`ALTER TABLE invoices ADD COLUMN file_path TEXT DEFAULT ''`,
		`ALTER TABLE clubs ADD COLUMN invoice_number_keyword TEXT DEFAULT ''`,
		`ALTER TABLE clubs ADD COLUMN invoice_number_numeric_only INTEGER DEFAULT 0`,
		`ALTER TABLE invoices ADD COLUMN file_hash TEXT DEFAULT ''`,
		`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, role TEXT, requires_password_change INTEGER, locale TEXT DEFAULT 'de')`,
		`ALTER TABLE users ADD COLUMN locale TEXT DEFAULT 'de'`,
		`ALTER TABLE flights ADD COLUMN manual_override INTEGER DEFAULT 0`,
		`ALTER TABLE clubs ADD COLUMN is_dry INTEGER DEFAULT 0`,
		`CREATE TABLE IF NOT EXISTS airfield_fees (icao TEXT NOT NULL, year INTEGER NOT NULL, landing_fee REAL DEFAULT 0.0, approach_fee REAL DEFAULT 0.0, PRIMARY KEY (icao, year))`,
		`ALTER TABLE flights ADD COLUMN fuel_cost REAL DEFAULT 0.0`,
	}
	migrationCount := 0
	for _, m := range migrations {
		if _, err := DB.Exec(m); err != nil {
			// Silently ignore "duplicate column" errors
			if !strings.Contains(err.Error(), "duplicate column name") {
				log.Printf("[DB] Migration error: %v", err)
			}
		} else {
			migrationCount++
		}
	}
	if migrationCount > 0 {
		log.Printf("[DB] %d migrations applied.", migrationCount)
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

	// Initialize DebugMode from DB
	var dbMode string
	DB.Get(&dbMode, `SELECT value FROM settings WHERE key = 'debug_mode'`)
	if dbMode == "" {
		DB.Exec(`INSERT INTO settings (key, value) VALUES ('debug_mode', 'false')`)
	}
	DebugMode = (dbMode == "true")

	// Seed Admin User
	seedAdmin()

	log.Println("Database initialized successfully.")
	return nil
}

func seedAdmin() {
	var count int
	DB.Get(&count, "SELECT COUNT(*) FROM users")
	if count == 0 {
		user := os.Getenv("ADMIN_USER")
		pass := os.Getenv("ADMIN_PASSWORD")
		requiresChange := 1
		if user == "" {
			user = "admin"
			pass = "admin"
		} else {
			requiresChange = 0 // If env provided, assume it's set
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
		_, err := DB.Exec("INSERT INTO users (username, password_hash, role, requires_password_change) VALUES (?, ?, 'admin', ?)", user, string(hash), requiresChange)
		if err == nil {
			log.Printf("[Auth] Initial admin user created: %s", user)
		}
	}
}

func Log(msg string, isDebug bool) {
	if isDebug && !DebugMode {
		return
	}
	prefix := "[INFO]"
	if isDebug { prefix = "[DEBUG]" }
	log.Printf("%s %s", prefix, msg)
}
