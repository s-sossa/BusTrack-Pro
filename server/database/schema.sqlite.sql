-- ==============================================================================
-- BusTrack Pro — SQLite Relational Database Schema
-- Embedded ACID Relational Engine with WAL Mode & Foreign Keys
-- ==============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'passenger',
    auth_provider TEXT DEFAULT 'email',
    provider_id TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    var_name TEXT,
    color TEXT NOT NULL,
    stops_count INTEGER DEFAULT 0,
    length_km REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 3. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    hours_worked REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

-- 4. FLEET BUSES TABLE
CREATE TABLE IF NOT EXISTS buses (
    id TEXT PRIMARY KEY,
    bus_number TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
    driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'stopped',
    speed_kmh INTEGER DEFAULT 0,
    passengers_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 52,
    fuel_percent INTEGER DEFAULT 100,
    delay_minutes INTEGER DEFAULT 0,
    next_stop TEXT,
    eta_minutes INTEGER DEFAULT 0,
    pos_x REAL DEFAULT 400.00,
    pos_y REAL DEFAULT 225.00,
    _t REAL DEFAULT 0.0,
    _step REAL DEFAULT 0.005,
    _dir INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

-- 5. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    severity TEXT NOT NULL DEFAULT 'info',
    icon TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    bus_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type TEXT DEFAULT 'info',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- 7. TRANSIT STOPS TABLE
CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtext TEXT,
    is_primary INTEGER DEFAULT 0,
    lat REAL,
    lon REAL,
    routes_json TEXT,
    pos_x REAL DEFAULT 0.0,
    pos_y REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);
