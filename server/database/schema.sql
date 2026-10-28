-- ==============================================================================
-- BusTrack Pro — Non-Auth Database Schema & RLS Blueprint for PostgreSQL / Supabase
-- Target DB: PostgreSQL 15+ / Supabase
-- (Note: User management is handled exclusively by Supabase Auth in public.users)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE bus_status AS ENUM ('active', 'delayed', 'stopped', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    color VARCHAR(20) NOT NULL,
    var_name VARCHAR(20),
    stops_count INT DEFAULT 0,
    length_km NUMERIC(6,2) DEFAULT 0.0,
    operator VARCHAR(120),
    concession VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(20) PRIMARY KEY,
    user_id UUID,
    name VARCHAR(120) NOT NULL,
    initials VARCHAR(5) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    trips_completed INT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 5.0,
    hours_worked NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BUSES TABLE (FLEET)
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
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

-- 6. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    severity alert_severity NOT NULL DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    bus_id VARCHAR(20) REFERENCES buses(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

-- 7. ACTIVITIES LOG TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action_text TEXT NOT NULL,
    action_type VARCHAR(30) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. COMPATIBILITY VIEW FOR REALTIME BUS POSITIONS
CREATE OR REPLACE VIEW bus_positions AS
SELECT 
    id as bus_id,
    id,
    bus_number,
    license_plate,
    route_id,
    driver_id,
    status,
    speed_kmh,
    passengers_count,
    pos_x,
    pos_y,
    updated_at
FROM buses;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Routes: Public Read
DO $$ BEGIN
    DROP POLICY IF EXISTS routes_public_read ON routes;
    CREATE POLICY routes_public_read ON routes FOR SELECT USING (true);
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- Buses: Public Read for General Transit (Positions & Status)
DO $$ BEGIN
    DROP POLICY IF EXISTS buses_public_read ON buses;
    CREATE POLICY buses_public_read ON buses FOR SELECT USING (true);
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- ⛔ Drivers: Solo personal autorizado (admin / dispatcher) puede leer información de choferes
DO $$ BEGIN
    DROP POLICY IF EXISTS drivers_public_read ON drivers;
    DROP POLICY IF EXISTS drivers_admin_read ON drivers;
    CREATE POLICY drivers_admin_read ON drivers FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher')));
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- ⛔ Alerts: Solo usuarios autenticados pueden consultar alertas operativas
DO $$ BEGIN
    DROP POLICY IF EXISTS alerts_public_read ON alerts;
    DROP POLICY IF EXISTS alerts_authenticated_read ON alerts;
    CREATE POLICY alerts_authenticated_read ON alerts FOR SELECT TO authenticated
        USING (true);
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- Admin / Dispatcher Write Policies (con verificación estricta contra public.users y WITH CHECK)
DO $$ BEGIN
    DROP POLICY IF EXISTS buses_admin_write ON buses;
    CREATE POLICY buses_admin_write ON buses FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher')))
        WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher')));
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS alerts_admin_write ON alerts;
    CREATE POLICY alerts_admin_write ON alerts FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher')))
        WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher')));
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS activity_logs_admin_read ON activity_logs;
    CREATE POLICY activity_logs_admin_read ON activity_logs FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'dispatcher')));
EXCEPTION WHEN undefined_object THEN null;
END $$;
