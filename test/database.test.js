/* ==============================================================================
   BusTrack Pro — Relational Database Verification Test Suite
   Verifies: Real SQL Tables, Foreign Key Constraints, Disk Persistence,
             Prepared Statements, and Database Diagnostics.
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Database, SEED_ROUTES, SEED_DRIVERS } from '../server/database/db.js';

test('Database Architecture — Real Relational Tables in SQLite Master', () => {
  const db = new Database(':memory:');
  
  const tables = db.sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all().map(t => t.name);

  assert.ok(tables.includes('routes'), 'Table routes must exist');
  assert.ok(tables.includes('drivers'), 'Table drivers must exist');
  assert.ok(tables.includes('buses'), 'Table buses must exist');
  assert.ok(tables.includes('alerts'), 'Table alerts must exist');
  assert.ok(tables.includes('activity_logs'), 'Table activity_logs must exist');
  assert.ok(tables.includes('stops'), 'Table stops must exist');

  db.close();
});

test('Database Integrity — Foreign Key Constraints Enforced', () => {
  const db = new Database(':memory:');

  // Verify foreign_keys pragma is enabled
  const fkPragma = db.sqlite.prepare('PRAGMA foreign_keys').get();
  assert.equal(fkPragma.foreign_keys, 1);

  // Attempting to insert a bus pointing to a non-existing route should violate FK
  assert.throws(() => {
    db.sqlite.prepare(`
      INSERT INTO buses (
        id, bus_number, license_plate, route_id, driver_id, status
      ) VALUES ('BUS-999', '999', 'INVALID-PLATE', 'NON_EXISTENT_ROUTE', 'D001', 'stopped')
    `).run();
  }, /FOREIGN KEY/i);

  db.close();
});

test('Database Persistence — Data Persists Across Server Restarts to Disk', () => {
  const testDbFile = path.resolve(process.cwd(), 'data', 'test_persistence.sqlite');
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }

  // 1. Open instance 1, insert new user and bus
  const db1 = new Database(testDbFile);
  const bus1 = db1.createBus({ routeId: 'A', driverId: 'D001' });
  assert.ok(bus1.id.startsWith('BUS-'));

  const alert1 = db1.createAlert({
    severity: 'warning',
    title: 'Test persistence alert',
    description: 'Testing SQLite file persistence',
    bus_id: bus1.id,
  });
  assert.equal(alert1.title, 'Test persistence alert');

  // Explicitly close DB 1
  db1.close();

  // Verify file actually exists on disk and has non-zero size
  assert.ok(fs.existsSync(testDbFile), 'Database file must physically exist on disk');
  const stats = fs.statSync(testDbFile);
  assert.ok(stats.size > 0, 'Database file must contain physical relational data');

  // 2. Open instance 2 pointing to the exact same physical SQLite file
  const db2 = new Database(testDbFile);
  const reloadedBus = db2.getBusById(bus1.id);
  assert.ok(reloadedBus, 'Created bus must survive database restart');
  assert.equal(reloadedBus.id, bus1.id);
  assert.equal(reloadedBus.plate, bus1.plate);

  const alerts = db2.getAllAlerts();
  assert.ok(alerts.some(a => a.title === 'Test persistence alert'), 'Created alert must survive restart');

  db2.close();

  // Cleanup test file and potential WAL/SHM companion files
  try {
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    if (fs.existsSync(testDbFile + '-wal')) fs.unlinkSync(testDbFile + '-wal');
    if (fs.existsSync(testDbFile + '-shm')) fs.unlinkSync(testDbFile + '-shm');
  } catch {}
});

test('Database Diagnostics — Status & Table Row Counts', () => {
  const db = new Database(':memory:');
  const status = db.getDbStatus();

  assert.equal(status.dialect, 'sqlite');
  assert.equal(status.connected, true);
  assert.ok(status.version);
  assert.ok(Array.isArray(status.tables));
  assert.ok(status.totalRows > 0);

  const busesTable = status.tables.find(t => t.name === 'buses');
  assert.ok(busesTable);
  assert.equal(busesTable.count, 12);

  const routesTable = status.tables.find(t => t.name === 'routes');
  assert.ok(routesTable);
  assert.equal(routesTable.count, 10);

  db.close();
});

test('Database Queries — Real SQL Joins and Aggregations', () => {
  const db = new Database(':memory:');
  const routes = db.getAllRoutes();

  assert.equal(routes.length, 10);
  const routeSjo = routes.find(r => r.id === 'SJO-201');
  assert.ok(routeSjo);
  assert.equal(routeSjo.operator, 'TUASA (Transportes Unidos Alajuelenses S.A.)');
  assert.equal(routeSjo.concession, 'SJO-201');
  assert.ok(typeof routeSjo.totalBuses === 'number');
  assert.ok(typeof routeSjo.passengersOnboard === 'number');
  assert.ok(typeof routeSjo.coveragePercent === 'number');

  db.close();
});
