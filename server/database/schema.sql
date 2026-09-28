-- ==============================================================================
-- BusTrack Pro — Database Schema & Row Level Security (RLS) Blueprint
-- Target DB: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver', 'passenger');
CREATE TYPE bus_status AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    full_name VARCHAR(120) NOT NULL,
    role user_role DEFAULT 'passenger',
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'apple'
    provider_id VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for authentication lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);

-- 4. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL,
    stops_count INT DEFAULT 0,
    length_km NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    trips_completed INT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 5.0,
    hours_worked NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BUSES TABLE (FLEET)
CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(20) PRIMARY KEY,
    bus_number VARCHAR(10) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    route_id VARCHAR(10) REFERENCES routes(id) ON DELETE SET NULL,
    driver_id VARCHAR(20) REFERENCES drivers(id) ON DELETE SET NULL,
    status bus_status DEFAULT 'stopped',
    speed_kmh INT DEFAULT 0,
    passengers_count INT DEFAULT 0,
    capacity INT DEFAULT 52,
    fuel_percent INT DEFAULT 100,
    delay_minutes INT DEFAULT 0,
    next_stop VARCHAR(100),
    eta_minutes INT DEFAULT 0,
    pos_x NUMERIC(6,2) DEFAULT 400.00,
    pos_y NUMERIC(6,2) DEFAULT 225.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for spatial/telemetry queries
CREATE INDEX idx_buses_route ON buses(route_id);
CREATE INDEX idx_buses_status ON buses(status);

-- 7. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity NOT NULL DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20) REFERENCES buses(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_severity_read ON alerts(severity, is_read);

-- 8. ACTIVITIES LOG TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_text TEXT NOT NULL,
    action_type VARCHAR(30) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data privacy, isolation & protection against public DB leaks
-- ==============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
-- Users can view their own profile; admins can view all users
CREATE POLICY user_self_read ON users FOR SELECT
    USING (auth.uid() = id OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

CREATE POLICY user_self_update ON users FOR UPDATE
    USING (auth.uid() = id);

-- 2. PUBLIC READ POLICIES (Routes, Buses telemetry, Public Stops)
-- All authenticated & anonymous users can view live route & bus telemetry
CREATE POLICY routes_public_read ON routes FOR SELECT USING (true);
CREATE POLICY buses_public_read ON buses FOR SELECT USING (true);
CREATE POLICY drivers_public_read ON drivers FOR SELECT USING (true);
CREATE POLICY alerts_public_read ON alerts FOR SELECT USING (true);

-- 3. ADMIN / DISPATCHER WRITE POLICIES
-- Only Admins and Dispatchers can insert or update buses, routes & alerts
CREATE POLICY buses_admin_write ON buses FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));

CREATE POLICY alerts_admin_write ON alerts FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));

CREATE POLICY activity_logs_admin_read ON activity_logs FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'dispatcher'));
