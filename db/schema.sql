CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    aircraft TEXT NOT NULL,
    departure TEXT,
    arrival TEXT,
    block_minutes INTEGER DEFAULT 0,
    flight_minutes INTEGER DEFAULT 0,
    training_type TEXT DEFAULT '',
    flight_rule TEXT DEFAULT 'VFR',
    pilot TEXT,
    cost REAL DEFAULT 0.0,
    flight_cost REAL DEFAULT 0.0,
    landing_fee REAL DEFAULT 0.0,
    approach_fee REAL DEFAULT 0.0,
    invoice_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    aircraft TEXT NOT NULL,
    amount REAL DEFAULT 0.0,
    file_path TEXT DEFAULT '',
    file_hash TEXT UNIQUE DEFAULT '',
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    search_term TEXT DEFAULT '',
    heuristic TEXT DEFAULT 'highest_value',
    flight_amount_keyword TEXT DEFAULT '',
    landing_fee_keyword TEXT DEFAULT '',
    approach_fee_keyword TEXT DEFAULT '',
    invoice_number_keyword TEXT DEFAULT '',
    invoice_number_numeric_only INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS csv_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    delimiter TEXT DEFAULT ';',
    has_header INTEGER DEFAULT 1,
    date_format TEXT DEFAULT '02.01.2006',
    date_col INTEGER DEFAULT 0,
    aircraft_col INTEGER DEFAULT 1,
    departure_col INTEGER DEFAULT 4,
    arrival_col INTEGER DEFAULT 5,
    block_minutes_col INTEGER DEFAULT 6,
    flight_minutes_col INTEGER DEFAULT 7,
    pilot_col INTEGER DEFAULT 3,
    training_type_col INTEGER DEFAULT -1,
    flight_rule_col INTEGER DEFAULT -1,
    is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Column migrations for existing databases
-- These will fail silently if columns already exist
