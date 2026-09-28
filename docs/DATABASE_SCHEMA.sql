-- =============================================================================
-- BusTrack Pro — Enterprise PostgreSQL Database Schema
-- Architecture Version: 1.0.0
-- Target Engine: PostgreSQL 15+ / 16+
-- Optimized for high-throughput telematics, low-latency spatial queries & auditability
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS & DOMAINS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE bus_status_enum AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity_enum AS ENUM ('critical', 'warning', 'info');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TRANSIT ROUTES & STOPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(10) PRIMARY KEY,              -- e.g. 'A', 'B', 'C', 'D'
    name VARCHAR(150) NOT NULL,              -- e.g. 'Centro — Aeropuerto'
    var_name VARCHAR(50) NOT NULL,           -- e.g. '--route-a'
    color VARCHAR(20) NOT NULL,              -- e.g. '#5b6ef5'
    stops_count INTEGER NOT NULL DEFAULT 0,
    length_km NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    path_d TEXT,                             -- SVG path definition or GeoJSON LineString
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    pos_x NUMERIC(8, 2) NOT NULL,            -- Spatial X coordinate on city grid
    pos_y NUMERIC(8, 2) NOT NULL,            -- Spatial Y coordinate on city grid
    latitude NUMERIC(10, 7),                 -- Optional WGS84 GPS latitude
    longitude NUMERIC(10, 7),                -- Optional WGS84 GPS longitude
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
    route_id VARCHAR(10) REFERENCES routes(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    PRIMARY KEY (route_id, stop_id),
    CONSTRAINT uq_route_sequence UNIQUE (route_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, sequence_order);

-- =============================================================================
-- 3. DRIVERS (OPERATORS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,              -- e.g. 'D001', 'D002'
    name VARCHAR(150) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license VARCHAR(50) NOT NULL UNIQUE,
    trips_completed INTEGER NOT NULL DEFAULT 0 CHECK (trips_completed >= 0),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    shift_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0 CHECK (shift_hours >= 0.0),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating DESC);

-- =============================================================================
-- 4. FLEET BUSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(20) PRIMARY KEY,              -- e.g. 'BUS-001'
    num VARCHAR(10) NOT NULL,                -- e.g. '001'
    plate VARCHAR(20) NOT NULL UNIQUE,       -- e.g. 'SJB-1001'
    route_id VARCHAR(10) REFERENCES routes(id) ON UPDATE CASCADE,
    driver_id VARCHAR(20) REFERENCES drivers(id) ON UPDATE CASCADE,
    status bus_status_enum NOT NULL DEFAULT 'stopped',
    speed NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (speed >= 0.0),
    passengers INTEGER NOT NULL DEFAULT 0 CHECK (passengers >= 0),
    capacity INTEGER NOT NULL DEFAULT 52 CHECK (capacity > 0),
    fuel_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.0 CHECK (fuel_percent >= 0.0 AND fuel_percent <= 100.0),
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    next_stop_name VARCHAR(150),
    eta_minutes INTEGER DEFAULT 0,
    pos_x NUMERIC(8, 2) NOT NULL DEFAULT 400.0,
    pos_y NUMERIC(8, 2) NOT NULL DEFAULT 225.0,
    trajectory_t NUMERIC(6, 5) DEFAULT 0.0,  -- 0.0 to 1.0 progress along route curve
    trajectory_dir SMALLINT DEFAULT 1,       -- 1 = forward, -1 = reverse
    trajectory_step NUMERIC(6, 5) DEFAULT 0.005,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_driver ON buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_fuel ON buses(fuel_percent) WHERE fuel_percent < 20;

-- =============================================================================
-- 5. TIME-SERIES TELEMETRY LOGS (Partitioned by Month for Big Data Scale)
-- =============================================================================

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL,
    bus_id VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pos_x NUMERIC(8, 2) NOT NULL,
    pos_y NUMERIC(8, 2) NOT NULL,
    speed NUMERIC(5, 2) NOT NULL,
    fuel_percent NUMERIC(5, 2) NOT NULL,
    passengers INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    status bus_status_enum NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);

-- Partition examples for monthly storage:
CREATE TABLE IF NOT EXISTS telemetry_y2026m01 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_y2026m02 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_y2026m03 PARTITION OF telemetry_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS telemetry_default PARTITION OF telemetry_logs DEFAULT;

CREATE INDEX IF NOT EXISTS idx_telemetry_bus_time ON telemetry_logs (bus_id, recorded_at DESC);

-- =============================================================================
-- 6. ALERTS & INCIDENT MANAGEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity_enum NOT NULL DEFAULT 'info',
    icon VARCHAR(10) NOT NULL DEFAULT 'ℹ️',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20),                      -- Can be 'BUS-011' or 'Sistema'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC);

-- =============================================================================
-- 7. AUDIT LOGGING & STATUS TRANSITION TRIGGER
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,             -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100) DEFAULT 'system',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_audit_bus_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_logs (entity_name, entity_id, action, old_data, new_data)
        VALUES (
            'buses',
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object('status', OLD.status, 'speed', OLD.speed, 'delay', OLD.delay),
            jsonb_build_object('status', NEW.status, 'speed', NEW.speed, 'delay', NEW.delay)
        );
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_buses_status_change ON buses;
CREATE TRIGGER trg_buses_status_change
    BEFORE UPDATE ON buses
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_bus_status_change();
