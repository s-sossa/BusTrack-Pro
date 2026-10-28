/* ==============================================================================
   BusTrack Pro — Database Schema & Seed Initializer for PostgreSQL / Supabase
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config.js';
import { SEED_ROUTES, SEED_DRIVERS, SEED_ALERTS } from './db.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initPostgresDatabase(connectionString) {
  if (!connectionString) {
    console.log('[DB] No DATABASE_URL provided. Operating in high-performance memory mode.');
    return null;
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocal
      ? false
      : (process.env.PG_CA_CERT
          ? { ca: process.env.PG_CA_CERT, rejectUnauthorized: true }
          : { rejectUnauthorized: process.env.NODE_ENV === 'production' }),
  });

  try {
    const client = await pool.connect();
    console.log('[DB] Connected successfully to PostgreSQL database.');

    // Load and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await client.query(sql);
      console.log('[DB] Schema and RLS policies verified successfully.');
    }


    // Seed Routes if empty
    const routeCheck = await client.query('SELECT COUNT(*) FROM routes');
    if (parseInt(routeCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding routes...');
      for (const r of SEED_ROUTES) {
        await client.query(
          'INSERT INTO routes (id, name, color, stops_count, length_km) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [r.id, r.name, r.color, r.stops, r.length]
        );
      }
    }

    // Seed Drivers if empty
    const driverCheck = await client.query('SELECT COUNT(*) FROM drivers');
    if (parseInt(driverCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding drivers...');
      for (const d of SEED_DRIVERS) {
        await client.query(
          'INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours]
        );
      }
    }

    // Seed Buses if empty
    const busCheck = await client.query('SELECT COUNT(*) FROM buses');
    if (parseInt(busCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding fleet buses...');
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const busNum = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? Math.floor(Math.random() * 30) + 28 : 0;
        const passengers = Math.floor(Math.random() * 40) + 4;
        const fuel = Math.floor(Math.random() * 70) + 25;
        const delay = status === 'delayed' ? Math.floor(Math.random() * 8) + 3 : 0;

        await client.query(`
          INSERT INTO buses (id, bus_number, license_plate, route_id, driver_id, status, speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes, next_stop, eta_minutes, pos_x, pos_y)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          busId, busNum, plate, route.id, driver.id, status, speed, passengers, 52, fuel, delay, 'Terminal Central', 5, 400.00, 225.00
        ]);
      }
    }

    // Seed Alerts if empty
    const alertCheck = await client.query('SELECT COUNT(*) FROM alerts');
    if (parseInt(alertCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding alerts...');
      for (const a of SEED_ALERTS) {
        const severity = a.severity || a.type || 'info';
        const description = a.description || a.desc || '';
        const busId = (a.bus_id || a.bus || '').includes('BUS') ? (a.bus_id || a.bus) : null;
        const isRead = Boolean(a.is_read != null ? a.is_read : a.read);
        await client.query(
          'INSERT INTO alerts (severity, title, description, bus_id, is_read) VALUES ($1, $2, $3, $4, $5)',
          [severity, a.title, description, busId, isRead]
        );
      }
    }

    client.release();
    console.log('[DB] PostgreSQL Database initialization complete.');
    return pool;
  } catch (err) {
    console.error('[DB] PostgreSQL Connection failed. Falling back to memory DB:', err.message);
    return null;
  }
}

// Allow direct execution from CLI: node server/database/initDb.js
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.error('ERROR: Please specify DATABASE_URL environment variable or set it in .env');
    process.exit(1);
  }
  initPostgresDatabase(dbUrl).then((pool) => {
    if (pool) pool.end();
    process.exit(0);
  });
}
