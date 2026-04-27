CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    aircraft TEXT NOT NULL,
    departure TEXT,
    arrival TEXT,
    block_minutes INTEGER DEFAULT 0,
    flight_minutes INTEGER DEFAULT 0,
    training_type TEXT DEFAULT 'PIC',
    pilot TEXT,
    cost REAL DEFAULT 0.0,
    invoice_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    aircraft TEXT NOT NULL,
    amount REAL DEFAULT 0.0,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    billing_type TEXT DEFAULT 'flight_time' -- 'flight_time', 'block_time', 'custom'
);
