/* ==============================================================================
   BusTrack Pro — Production-Grade Relational Database Repository
   Engine: 100% Real Embedded SQLite (ACID, WAL Mode, Foreign Keys)
   Compatible with PostgreSQL schema via server/database/schema.sql
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SEED DEFINITIONS (Synchronized with BusTrack Transit Domain) ---

export const SEED_ROUTES = [
  { id: 'A', name: 'Centro — Aeropuerto',   varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'B', name: 'Norte — Sur',           varName: '--route-b', color: '#7c4ddb', stops: 12, length: 35 },
  { id: 'C', name: 'Este — Centro',         varName: '--route-c', color: '#2aa3c4', stops: 6,  length: 18 },
  { id: 'D', name: 'Sur — Zona Industrial', varName: '--route-d', color: '#2bb885', stops: 10, length: 28 },
];

export const SEED_DRIVERS = [
  { id: 'D001', name: 'Carlos Mendoza', initials: 'CM', license: 'CR-2-0456-0891', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Ana García',     initials: 'AG', license: 'CR-1-0782-0334', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Roberto López',  initials: 'RL', license: 'CR-3-0219-0645', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'María Flores',   initials: 'MF', license: 'CR-1-1043-0277', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Jorge Ramírez',  initials: 'JR', license: 'CR-4-0388-0912', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Lucía Castro',   initials: 'LC', license: 'CR-2-0955-0158', trips: 891,  rating: 4.9, hours: 8.0 },
];

export const SEED_STOPS = [
  { id: 'stop-central', name: 'Terminal Central',  subtext: 'Andén Principal', isPrimary: 0, lat: 9.9325, lon: -84.0815, pos_x: 200, pos_y: 150 },
  { id: 'stop-parque', name: 'Parque Central',    subtext: 'Parada Sur', isPrimary: 0, lat: 9.9333, lon: -84.0792, pos_x: 400, pos_y: 150 },
  { id: 'stop-hospital', name: 'Hospital San Juan', subtext: 'Pabellón Urgencias', isPrimary: 0, lat: 9.9348, lon: -84.0864, pos_x: 600, pos_y: 150 },
  { id: 'stop-mercado', name: 'Mercado Norte',     subtext: 'Avenida 3', isPrimary: 0, lat: 9.9372, lon: -84.0789, pos_x: 200, pos_y: 300 },
  { id: 'stop-universidad', name: 'Universidad',       subtext: 'Circunvalación', isPrimary: 0, lat: 9.9365, lon: -84.0512, pos_x: 400, pos_y: 300 },
  { id: 'stop-industrial', name: 'Zona Industrial',   subtext: 'Complejo Logístico', isPrimary: 0, lat: 9.9412, lon: -84.0389, pos_x: 600, pos_y: 300 },
  { id: 'stop-estadio', name: 'Estadio',           subtext: 'Acceso Este', isPrimary: 0, lat: 9.9355, lon: -84.1042, pos_x: 200, pos_y: 225 },
  { id: 'stop-aeropuerto', name: 'Aeropuerto',        subtext: 'Terminal Internacional', isPrimary: 0, lat: 10.0004, lon: -84.2141, pos_x: 600, pos_y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante',  subtext: 'Calle 33', isPrimary: 0, lat: 9.9358, lon: -84.0625, pos_x: 100, pos_y: 225 },
  { id: 'stop-civico', name: 'Centro Cívico',     subtext: 'Plaza de las Artes', isPrimary: 0, lat: 9.9315, lon: -84.0735, pos_x: 700, pos_y: 225 },
  // Fidélitas Pilot Stops
  { id: 'stop-fidelitas', name: 'Entrada Principal U Fidélitas', subtext: 'Santa Marta de Montes de Oca — Frente al Campus', isPrimary: 1, lat: 9.9392, lon: -84.0321, pos_x: 400, pos_y: 225 },
  { id: 'stop-vargas-araya', name: 'Parada Barrio Vargas Araya', subtext: 'Paso universitario y residencial contiguo a Lourdes', isPrimary: 0, lat: 9.9374, lon: -84.0382, pos_x: 350, pos_y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Colegio Calasanz', subtext: 'Salida de Lourdes hacia San Pedro centro', isPrimary: 0, lat: 9.9362, lon: -84.0441, pos_x: 300, pos_y: 225 },
  { id: 'stop-san-pedro', name: 'Parada Muñoz & Nanne / Plaza del Sol', subtext: 'San Pedro Centro — Comercio y transbordos', isPrimary: 0, lat: 9.9338, lon: -84.0535, pos_x: 250, pos_y: 225 },
  { id: 'stop-mall-sp', name: 'Parada Mall San Pedro / Hispanidad', subtext: 'Rotonda de la Bandera / Los Yoses', isPrimary: 0, lat: 9.9341, lon: -84.0620, pos_x: 200, pos_y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', subtext: 'Avenida Central / Cuesta de Moras', isPrimary: 0, lat: 9.9332, lon: -84.0768, pos_x: 150, pos_y: 225 },
];

export const SEED_ALERTS = [
  { severity: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', description: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus_id: 'BUS-011', is_read: 0 },
  { severity: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', description: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus_id: 'BUS-007', is_read: 0 },
  { severity: 'warning',  icon: '⛽', title: 'Combustible bajo', description: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus_id: 'BUS-004', is_read: 0 },
  { severity: 'info',     icon: '📊', title: 'Reporte diario generado', description: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus_id: 'Sistema', is_read: 1 },
  { severity: 'info',     icon: '🔄', title: 'Mantenimiento programado', description: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus_id: 'BUS-012', is_read: 1 },
];

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export class Database {
  /**
   * Initializes real SQLite database with ACID schema, WAL mode, foreign keys, and seeds
   */
  constructor(customPath = null) {
    const isTest = process.env.NODE_ENV === 'test';
    const rawPath = customPath || (isTest && !process.env.DB_FILE ? ':memory:' : config.dbFile);

    if (rawPath === ':memory:') {
      this.filePath = ':memory:';
      this.sqlite = new DatabaseSync(':memory:');
    } else {
      const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.filePath = resolved;
      this.sqlite = new DatabaseSync(resolved);
    }

    this._initPragmas();
    this._initTables();
    this._seedDatabase();
    this._compileStatements();
  }

  _initPragmas() {
    this.sqlite.exec('PRAGMA foreign_keys = ON;');
    if (this.filePath !== ':memory:') {
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  _initTables() {
    this.sqlite.exec(`
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

      -- 7. STOPS TABLE
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
    `);
  }

  _seedDatabase() {
    // 1. Seed Users
    const userCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@bustrack.com');
    if (userCount.count === 0) {
      const insertUser = this.sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      insertUser.run(
        'usr-admin-01',
        'admin@bustrack.com',
        '$2a$10$wNlh4J6m5n9S8d.WvYQk8.L0yW.fO2e9jG4iZ5rK7hM3oP2nQ1r2s', // Admin123!
        'Gerente Admin',
        'admin',
        'email',
        'https://api.dicebear.com/7.x/initials/svg?seed=Gerente%20Admin'
      );
    }

    // 2. Seed Routes
    const routeCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM routes').get();
    if (routeCount.count === 0) {
      const insertRoute = this.sqlite.prepare(`
        INSERT INTO routes (id, name, var_name, color, stops_count, length_km, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const r of SEED_ROUTES) {
        insertRoute.run(r.id, r.name, r.varName, r.color, r.stops, r.length);
      }
    }

    // 3. Seed Drivers
    const driverCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM drivers').get();
    if (driverCount.count === 0) {
      const insertDriver = this.sqlite.prepare(`
        INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const d of SEED_DRIVERS) {
        insertDriver.run(d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours);
      }
    }

    // 4. Seed Stops
    const stopCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM stops').get();
    if (stopCount.count === 0) {
      const insertStop = this.sqlite.prepare(`
        INSERT INTO stops (id, name, subtext, is_primary, lat, lon, routes_json, pos_x, pos_y, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const s of SEED_STOPS) {
        insertStop.run(
          s.id || `stop-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          s.name,
          s.subtext || null,
          s.isPrimary || 0,
          s.lat || 9.9333,
          s.lon || -84.0833,
          JSON.stringify(s.routes || []),
          s.pos_x || s.x || 400,
          s.pos_y || s.y || 225
        );
      }
    }

    // 5. Seed Buses (12 operational units)
    const busCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get();
    if (busCount.count === 0) {
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      const insertBus = this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const num = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? randInt(28, 58) : 0;
        const passengers = randInt(4, 44);
        const fuel = randInt(25, 96);
        const delay = status === 'delayed' ? randInt(3, 11) : 0;
        const stop = SEED_STOPS[(i - 1) % SEED_STOPS.length];

        insertBus.run(
          busId,
          num,
          plate,
          route.id,
          driver.id,
          status,
          speed,
          passengers,
          52,
          fuel,
          delay,
          stop.name,
          randInt(2, 9),
          400.0,
          225.0,
          (i * 0.08) % 1.0,
          0.005 + (i % 3) * 0.001,
          i % 2 === 0 ? 1 : -1
        );
      }
    }

    // 6. Seed Alerts
    const alertCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM alerts').get();
    if (alertCount.count === 0) {
      const insertAlert = this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const a of SEED_ALERTS) {
        insertAlert.run(a.severity, a.icon, a.title, a.description, a.bus_id, a.is_read);
      }
    }

    // 7. Seed Activity Logs
    const actCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM activity_logs').get();
    if (actCount.count === 0) {
      const insertAct = this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `);
      insertAct.run('BUS-003 completó la Ruta B en horario', 'ok');
      insertAct.run('BUS-007 reportó retraso de 8 min por congestión', 'warn');
      insertAct.run('Conductor Carlos Mendoza inició turno en Ruta A', 'info');
    }
  }

  _compileStatements() {
    this.stmts = {
      // Buses
      selectBusById: this.sqlite.prepare(`
        SELECT 
          b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
          b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
          b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
          r.id as route_id, r.name as route_name, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
          d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
        FROM buses b
        LEFT JOIN routes r ON b.route_id = r.id
        LEFT JOIN drivers d ON b.driver_id = d.id
        WHERE LOWER(b.id) = LOWER(?)
      `),

      insertBus: this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'stopped', 0, 0, 52, 100, 0, ?, 0, 400.0, 225.0, ?, 0.005, 1, datetime('now'))
      `),

      updateBusStatus: this.sqlite.prepare(`
        UPDATE buses
        SET status = ?, speed_kmh = ?, delay_minutes = ?, updated_at = datetime('now')
        WHERE LOWER(id) = LOWER(?)
      `),

      updateBusTelemetryBatch: this.sqlite.prepare(`
        UPDATE buses SET
          speed_kmh = ?, passengers_count = ?, fuel_percent = ?, delay_minutes = ?,
          next_stop = ?, eta_minutes = ?, pos_x = ?, pos_y = ?, _t = ?, _dir = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `),

      // Routes
      selectAllRoutes: this.sqlite.prepare(`
        SELECT 
          r.id, r.name, r.var_name as varName, r.color, r.stops_count as stops, r.length_km as length,
          COUNT(b.id) as totalBuses,
          SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as activeBuses,
          COALESCE(SUM(b.passengers_count), 0) as passengersOnboard,
          COALESCE(AVG(b.delay_minutes), 0.0) as avgDelayMinutes
        FROM routes r
        LEFT JOIN buses b ON r.id = b.route_id
        GROUP BY r.id
        ORDER BY r.id ASC
      `),

      selectRouteById: this.sqlite.prepare(`
        SELECT id, name, var_name as varName, color, stops_count as stops, length_km as length
        FROM routes
        WHERE LOWER(id) = LOWER(?)
      `),

      // Drivers
      selectAllDrivers: this.sqlite.prepare(`
        SELECT 
          d.id, d.name, d.initials, d.license_number as license, d.trips_completed as trips, d.rating, d.hours_worked as hours,
          (SELECT b.id FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped' LIMIT 1) as assignedBusId,
          CASE 
            WHEN EXISTS(SELECT 1 FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped') THEN 'on_duty' 
            ELSE 'off_duty' 
          END as status
        FROM drivers d
        ORDER BY d.id ASC
      `),

      selectDriverById: this.sqlite.prepare(`
        SELECT id, name, initials, license_number as license, trips_completed as trips, rating, hours_worked as hours
        FROM drivers
        WHERE LOWER(id) = LOWER(?)
      `),

      // Alerts
      insertAlert: this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
      `),

      markAllAlertsRead: this.sqlite.prepare(`
        UPDATE alerts SET is_read = 1 WHERE is_read = 0
      `),

      // Users
      selectUserByEmail: this.sqlite.prepare(`
        SELECT id, email, password_hash as passwordHash, full_name as name, role, auth_provider as provider, avatar_url as avatarUrl, created_at as createdAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
      `),

      selectUserById: this.sqlite.prepare(`
        SELECT id, email, password_hash as passwordHash, full_name as name, role, auth_provider as provider, avatar_url as avatarUrl, created_at as createdAt
        FROM users
        WHERE id = ?
      `),

      insertUser: this.sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, auth_provider, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `),

      // Activities
      selectActivities: this.sqlite.prepare(`
        SELECT id, action_text as text, action_type as type, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT 20
      `),

      insertActivity: this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `),

      // Stops
      selectAllStops: this.sqlite.prepare(`
        SELECT id, name, subtext, is_primary as isPrimary, lat, lon, routes_json, pos_x as x, pos_y as y
        FROM stops
        ORDER BY rowid ASC
      `),
    };
  }

  // --- COMPATIBILITY GETTERS ---
  get stops() {
    return this.getAllStops();
  }

  get buses() {
    return this.getAllBuses();
  }

  get routes() {
    return this.getAllRoutes();
  }

  get drivers() {
    return this.getAllDrivers();
  }

  get alerts() {
    return this.getAllAlerts();
  }

  get activities() {
    return this.getActivities();
  }

  get users() {
    return this.sqlite.prepare('SELECT id, email, full_name as name, role, auth_provider as provider FROM users').all();
  }

  // --- STOPS API ---
  getAllStops() {
    const rows = this.stmts.selectAllStops.all();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      subtext: r.subtext || undefined,
      isPrimary: Boolean(r.isPrimary),
      lat: r.lat,
      lon: r.lon,
      routes: r.routes_json ? JSON.parse(r.routes_json) : [],
      x: r.x,
      y: r.y,
    }));
  }

  // --- BUSES REPOSITORY ---
  _mapBusRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      num: row.bus_number,
      plate: row.license_plate,
      route: {
        id: row.route_id || 'A',
        name: row.route_name || 'Ruta General',
        varName: row.route_var_name || `--route-${(row.route_id || 'a').toLowerCase()}`,
        color: row.route_color || '#5b6ef5',
        stops: row.route_stops || 0,
        length: row.route_length || 0,
      },
      driver: {
        id: row.driver_id || 'D001',
        name: row.driver_name || 'Conductor No Asignado',
        initials: row.driver_initials || 'NA',
        license: row.driver_license || '',
        trips: row.driver_trips || 0,
        rating: row.driver_rating || 5.0,
        hours: row.driver_hours || 0.0,
      },
      status: row.status,
      speed: row.speed_kmh,
      passengers: row.passengers_count,
      capacity: row.capacity,
      fuel: row.fuel_percent,
      delay: row.delay_minutes,
      nextStop: row.next_stop || 'Terminal Central',
      etaMin: row.eta_minutes,
      updatedAgo: 1,
      pos: { x: Number(row.pos_x), y: Number(row.pos_y) },
      _t: Number(row._t || 0),
      _step: Number(row._step || 0.005),
      _dir: Number(row._dir || 1),
    };
  }

  getAllBuses(filters = {}) {
    let sql = `
      SELECT 
        b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
        b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
        b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
        r.id as route_id, r.name as route_name, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
        d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.route && filters.route !== 'all') {
      sql += ' AND LOWER(b.route_id) = LOWER(?)';
      params.push(filters.route);
    }
    if (filters.status && filters.status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      sql += ' AND (LOWER(b.id) LIKE ? OR LOWER(b.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(r.name) LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY b.id ASC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => this._mapBusRow(r));
  }

  getBusById(id) {
    if (!id) return null;
    const row = this.stmts.selectBusById.get(id);
    return this._mapBusRow(row);
  }

  createBus(data = {}) {
    const totalCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get().count;
    const nextNum = totalCount + 1;
    const busId = 'BUS-' + String(nextNum).padStart(3, '0');
    const busNum = String(nextNum).padStart(3, '0');
    const plate = 'SJB-' + String(1000 + nextNum);

    const routes = this.getAllRoutes();
    const drivers = this.getAllDrivers();
    const stops = this.getAllStops();

    const route = data.routeId
      ? this.getRouteById(data.routeId) || routes[0]
      : routes[(nextNum - 1) % routes.length];

    const driver = data.driverId
      ? this.getDriverById(data.driverId) || drivers[0]
      : drivers[(nextNum - 1) % drivers.length];

    const nextStopName = stops.length ? stops[0].name : 'Terminal Central';

    this.stmts.insertBus.run(
      busId,
      busNum,
      plate,
      route.id,
      driver.id,
      nextStopName,
      Math.random()
    );

    return this.getBusById(busId);
  }

  updateBusStatus(id, newStatus) {
    const bus = this.getBusById(id);
    if (!bus) return null;

    let speed = bus.speed;
    let delay = bus.delay;

    if (newStatus === 'stopped' || newStatus === 'maintenance') {
      speed = 0;
      delay = 0;
    } else if (newStatus === 'active') {
      delay = 0;
      if (speed === 0) speed = randInt(25, 55);
    } else if (newStatus === 'delayed') {
      if (speed === 0) speed = randInt(20, 48);
      if (delay === 0) delay = randInt(3, 10);
    }

    this.stmts.updateBusStatus.run(newStatus, speed, delay, id);
    return this.getBusById(id);
  }

  updateAllBusesTelemetry(busesList) {
    for (const b of busesList) {
      this.stmts.updateBusTelemetryBatch.run(
        b.speed,
        b.passengers,
        b.fuel,
        b.delay,
        b.nextStop,
        b.etaMin,
        b.pos.x,
        b.pos.y,
        b._t,
        b._dir,
        b.id
      );
    }
  }

  // --- ROUTES REPOSITORY ---
  getAllRoutes() {
    const rows = this.stmts.selectAllRoutes.all();
    return rows.map(r => {
      const total = Number(r.totalBuses || 0);
      const active = Number(r.activeBuses || 0);
      return {
        id: r.id,
        name: r.name,
        varName: r.varName || `--route-${r.id.toLowerCase()}`,
        color: r.color,
        stops: Number(r.stops),
        length: Number(r.length),
        totalBuses: total,
        activeBuses: active,
        coveragePercent: total ? Math.round((active / total) * 100) : 0,
        passengersOnboard: Number(r.passengersOnboard || 0),
        avgDelayMinutes: total ? +(Number(r.avgDelayMinutes) / 1).toFixed(1) : 0,
      };
    });
  }

  getRouteById(id) {
    if (!id) return null;
    const row = this.stmts.selectRouteById.get(id);
    if (!row) return null;
    const buses = this.getAllBuses({ route: row.id });
    const active = buses.filter(b => b.status === 'active').length;
    return {
      id: row.id,
      name: row.name,
      varName: row.varName || `--route-${row.id.toLowerCase()}`,
      color: row.color,
      stops: Number(row.stops),
      length: Number(row.length),
      totalBuses: buses.length,
      activeBuses: active,
      coveragePercent: buses.length ? Math.round((active / buses.length) * 100) : 0,
      passengersOnboard: buses.reduce((s, b) => s + b.passengers, 0),
      avgDelayMinutes: buses.length ? +(buses.reduce((s, b) => s + b.delay, 0) / buses.length).toFixed(1) : 0,
    };
  }

  // --- DRIVERS REPOSITORY ---
  getAllDrivers() {
    const rows = this.stmts.selectAllDrivers.all();
    return rows.map(d => ({
      id: d.id,
      name: d.name,
      initials: d.initials,
      license: d.license,
      trips: Number(d.trips),
      rating: Number(d.rating),
      hours: Number(d.hours),
      assignedBusId: d.assignedBusId || null,
      status: d.status,
    }));
  }

  getDriverById(id) {
    if (!id) return null;
    const row = this.stmts.selectDriverById.get(id);
    if (!row) return null;
    const assignedBus = this.getAllBuses().find(b => b.driver.id === row.id && b.status !== 'stopped');
    return {
      id: row.id,
      name: row.name,
      initials: row.initials,
      license: row.license,
      trips: Number(row.trips),
      rating: Number(row.rating),
      hours: Number(row.hours),
      assignedBusId: assignedBus ? assignedBus.id : null,
      status: assignedBus ? 'on_duty' : 'off_duty',
    };
  }

  // --- ALERTS REPOSITORY ---
  getAllAlerts(severity = 'all') {
    let sql = 'SELECT id, severity as type, icon, title, description as desc, bus_id as bus, is_read as read, created_at as createdAt FROM alerts';
    const params = [];
    if (severity && severity !== 'all') {
      sql += ' WHERE severity = ?';
      params.push(severity);
    }
    sql += ' ORDER BY id DESC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      icon: r.icon || (r.type === 'critical' ? '🚨' : r.type === 'warning' ? '⚠️' : 'ℹ️'),
      title: r.title,
      desc: r.desc,
      bus: r.bus || 'Sistema',
      time: 'hace momentos',
      read: Boolean(r.read),
      createdAt: r.createdAt,
    }));
  }

  createAlert(data) {
    const type = data.type || 'info';
    const icon = data.icon || (type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️');
    const title = data.title;
    const desc = data.desc;
    const bus = data.bus || 'Sistema';

    const info = this.stmts.insertAlert.run(type, icon, title, desc, bus);
    return {
      id: Number(info.lastInsertRowid),
      type,
      icon,
      title,
      desc,
      bus,
      time: 'ahora mismo',
      read: false,
      createdAt: new Date().toISOString(),
    };
  }

  markAllAlertsAsRead() {
    const info = this.stmts.markAllAlertsRead.run();
    return Number(info.changes);
  }

  // --- USERS REPOSITORY ---
  findUserByEmail(email) {
    if (!email) return null;
    const row = this.stmts.selectUserByEmail.get(email.trim());
    return row || null;
  }

  findUserById(id) {
    if (!id) return null;
    const row = this.stmts.selectUserById.get(id);
    return row || null;
  }

  createUser(userData) {
    const id = userData.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const email = userData.email.toLowerCase().trim();
    const name = userData.name.trim();
    const role = userData.role || 'passenger';
    const provider = userData.provider || 'email';
    const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    this.stmts.insertUser.run(
      id,
      email,
      userData.passwordHash || null,
      name,
      role,
      provider,
      avatarUrl
    );

    return this.findUserById(id);
  }

  // --- ACTIVITIES LOG ---
  getActivities() {
    const rows = this.stmts.selectActivities.all();
    return rows.map(r => ({
      id: r.id,
      text: r.text,
      time: 'hace unos momentos',
      type: r.type,
      createdAt: r.created_at,
    }));
  }

  pushActivity(text, type = 'info') {
    const info = this.stmts.insertActivity.run(text, type);
    return {
      id: Number(info.lastInsertRowid),
      text,
      time: 'ahora mismo',
      type,
    };
  }

  // --- DB METADATA & DIAGNOSTICS ---
  getDbStatus() {
    let sizeBytes = 0;
    try {
      if (this.filePath !== ':memory:' && fs.existsSync(this.filePath)) {
        sizeBytes = fs.statSync(this.filePath).size;
      }
    } catch {}

    const sqliteVer = this.sqlite.prepare('SELECT sqlite_version() as v').get().v;
    const tables = [
      { name: 'users', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM users').get().c },
      { name: 'routes', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM routes').get().c },
      { name: 'drivers', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM drivers').get().c },
      { name: 'buses', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM buses').get().c },
      { name: 'alerts', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM alerts').get().c },
      { name: 'activity_logs', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM activity_logs').get().c },
      { name: 'stops', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM stops').get().c },
    ];

    const totalRows = tables.reduce((acc, t) => acc + t.count, 0);

    return {
      engine: 'SQLite 3 (ACID Relational File DB)',
      version: sqliteVer,
      dialect: 'sqlite',
      connected: true,
      storage: this.filePath === ':memory:' ? 'in_memory_sqlite' : 'persistent_file',
      filePath: this.filePath,
      fileSizeBytes: sizeBytes,
      fileSizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
      totalRows,
      tables,
      features: {
        foreignKeys: true,
        walJournalMode: this.filePath !== ':memory:',
        acidTransactions: true,
        postgresCompatible: true,
      },
    };
  }

  close() {
    try {
      this.sqlite.close();
    } catch {}
  }
}

export const db = new Database();
