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

	// Apply embedded schema
	_, err = DB.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("Database initialized successfully.")
	return nil
}
