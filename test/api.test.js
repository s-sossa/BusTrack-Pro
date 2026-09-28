/* ==============================================================================
   BusTrack Pro — Automated Backend & API Test Suite
   Using native node:test and node:assert (Node.js 20+)
   ============================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server/index.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise((resolve) => {
    // Listen on port 0 to allocate an ephemeral free port
    serverInstance = http.createServer(app).listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => serverInstance.close(resolve));
});

// Helper for HTTP requests using native fetch
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, headers: response.headers, body };
}

test('System Diagnostics — GET /api/v1/health', async () => {
  const res = await request('/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.ok(typeof res.body.uptimeSeconds === 'number');
  assert.ok(res.body.trackedBuses >= 12);
  assert.ok(res.headers.get('x-correlation-id'));
});

test('Transit Routes — GET /api/v1/routes', async () => {
  const res = await request('/api/v1/routes');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 4);

  const routeA = res.body.find((r) => r.id === 'A');
  assert.ok(routeA);
  assert.equal(routeA.name, 'Centro — Aeropuerto');
  assert.ok(typeof routeA.coveragePercent === 'number');
});

test('Drivers Roster — GET /api/v1/drivers', async () => {
  const res = await request('/api/v1/drivers');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 6);

  const driver1 = res.body[0];
  assert.ok(driver1.name);
  assert.ok(driver1.license);
  assert.ok(typeof driver1.rating === 'number');
});

test('Fleet Management — GET /api/v1/buses with filters', async () => {
  const resAll = await request('/api/v1/buses');
  assert.equal(resAll.status, 200);
  assert.ok(Array.isArray(resAll.body));
  assert.ok(resAll.body.length >= 12);

  // Filter by route
  const resRouteA = await request('/api/v1/buses?route=A');
  assert.equal(resRouteA.status, 200);
  assert.ok(resRouteA.body.every((b) => b.route.id === 'A'));

  // Search query
  const resSearch = await request('/api/v1/buses?search=BUS-001');
  assert.equal(resSearch.status, 200);
  assert.equal(resSearch.body.length, 1);
  assert.equal(resSearch.body[0].id, 'BUS-001');
});

test('Fleet Management — POST /api/v1/buses (create bus)', async () => {
  const res = await request('/api/v1/buses', {
    method: 'POST',
    body: JSON.stringify({ routeId: 'A', driverId: 'D001' }),
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.id.startsWith('BUS-'));
  assert.equal(res.body.status, 'stopped');
  assert.equal(res.body.speed, 0);
  assert.equal(res.body.route.id, 'A');
  assert.equal(res.body.driver.id, 'D001');
});

test('Fleet Management — PATCH /api/v1/buses/:id/status (update status)', async () => {
  const res = await request('/api/v1/buses/BUS-001/status', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'maintenance' }),
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'BUS-001');
  assert.equal(res.body.status, 'maintenance');
  assert.equal(res.body.speed, 0); // Must be 0 in maintenance
});

test('Incident Alerts — Alert lifecycle (GET, POST, PATCH)', async () => {
  // 1. Get alerts
  const resList = await request('/api/v1/alerts');
  assert.equal(resList.status, 200);
  assert.ok(Array.isArray(resList.body));

  // 2. Create alert
  const resCreate = await request('/api/v1/alerts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'critical',
      title: 'Fallo de presión hidráulica',
      desc: 'Presión por debajo del umbral de seguridad.',
      bus: 'BUS-002',
    }),
  });
  assert.equal(resCreate.status, 201);
  assert.equal(resCreate.body.title, 'Fallo de presión hidráulica');
  assert.equal(resCreate.body.type, 'critical');
  assert.equal(resCreate.body.read, false);

  // 3. Mark all as read
  const resMark = await request('/api/v1/alerts/read-all', {
    method: 'PATCH',
  });
  assert.equal(resMark.status, 200);
  assert.equal(resMark.body.success, true);
  assert.ok(typeof resMark.body.markedCount === 'number');
});

test('Analytics & Reports — GET /api/v1/reports/summary', async () => {
  const res = await request('/api/v1/reports/summary');
  assert.equal(res.status, 200);
  assert.ok(res.body.totalBuses > 0);
  assert.ok(typeof res.body.occupancyRate === 'number');
  assert.ok(typeof res.body.avgDelayMinutes === 'number');
  assert.ok(res.body.generatedAt);
});

test('Analytics & Reports — GET /api/v1/reports/export-csv', async () => {
  const res = await request('/api/v1/reports/export-csv');
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('text/csv'));
  assert.ok(res.body.includes('"Bus ID"'));
  assert.ok(res.body.includes('"Placa"'));
  assert.ok(res.body.includes('BUS-001'));
});

test('Error Handling — 404 Not Found for non-existing bus', async () => {
  const res = await request('/api/v1/buses/BUS-99999');
  assert.equal(res.status, 404);
  assert.equal(res.body.status, 404);
  assert.equal(res.body.title, 'Not Found');
});

test('Error Handling — 400 Bad Request for invalid status payload', async () => {
  const res = await request('/api/v1/buses/BUS-001/status', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'invalid_status_code' }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, 400);
  assert.equal(res.body.title, 'Bad Request');
});

test('Passenger Pilot (U Fidélitas) — GET /api/v1/passenger/stops', async () => {
  const res = await request('/api/v1/passenger/stops');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 6);

  const fidelitasStop = res.body.find(s => s.id === 'stop-fidelitas');
  assert.ok(fidelitasStop);
  assert.ok(fidelitasStop.name.includes('Fidélitas'));

  const vargasStop = res.body.find(s => s.id === 'stop-vargas-araya');
  assert.ok(vargasStop);
  assert.equal(vargasStop.name, 'Parada Barrio Vargas Araya');
});

test('Passenger Pilot (U Fidélitas) — GET /api/v1/passenger/stops/:id/arrivals', async () => {
  const res = await request('/api/v1/passenger/stops/stop-fidelitas/arrivals');
  assert.equal(res.status, 200);
  assert.equal(res.body.currentStop.id, 'stop-fidelitas');
  assert.ok(Array.isArray(res.body.arrivals));
  assert.ok(res.body.arrivals.length >= 4);

  const firstArrival = res.body.arrivals[0];
  assert.ok(firstArrival.routeName);
  assert.ok(typeof firstArrival.etaMinutes === 'number');
  assert.ok(typeof firstArrival.distanceMeters === 'number');
  assert.ok(firstArrival.occupancyLevel);
  assert.ok(firstArrival.operator);
});

