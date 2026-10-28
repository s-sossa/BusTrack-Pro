/* ==============================================================================
   BusTrack Pro — REST API Router
   ============================================================================== */

import { Router } from 'express';
import { FleetService } from '../services/fleetService.js';
import { AlertService } from '../services/alertService.js';
import { PassengerService } from '../services/passengerService.js';
import { telemetryEngine } from '../services/telemetrySimulator.js';
import { db } from '../database/db.js';
import { authRouter } from './authRoutes.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { validateBusStatus, validateAlertSeverity } from '../middleware/sanitizer.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const apiRouter = Router();

// --- AUTHENTICATION ROUTES ---
apiRouter.use('/auth', authRouter);

// --- 1. SYSTEM HEALTH & DIAGNOSTICS ---
// Note: Does NOT expose stack traces, environment secrets, or internal paths
apiRouter.get('/health', (req, res) => {
  const uptime = process.uptime();
  const dbStatus = typeof db.getDbStatus === 'function' ? db.getDbStatus() : null;
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    activeConnections: telemetryEngine.wsClients.size,
    trackedBuses: db.getAllBuses().length,
    database: dbStatus ? {
      engine: dbStatus.engine,
      dialect: dbStatus.dialect,
      connected: dbStatus.connected,
      storage: dbStatus.storage,
      totalRows: dbStatus.totalRows,
    } : { engine: 'in-memory', connected: true },
    version: '1.0.0',
    // NOTE: 'environment' is intentionally omitted from the public health endpoint
    // to avoid leaking deployment context to potential attackers.
  });
});

// ⛔ ítem #3: database/status solo accesible para admins autenticados
apiRouter.get('/database/status', authenticateToken, requireRole('admin'), (req, res) => {
  if (typeof db.getDbStatus === 'function') {
    res.json(db.getDbStatus());
  } else {
    res.json({ status: 'connected', engine: 'in-memory' });
  }
});

// --- 2. ROUTES ---
apiRouter.get('/routes', (req, res) => {
  const routes = FleetService.getRoutes();
  res.json(routes);
});

apiRouter.get('/routes/:id', (req, res, next) => {
  try {
    const route = FleetService.getRouteById(req.params.id);
    res.json(route);
  } catch (err) {
    next(err);
  }
});

// --- 3. DRIVERS ---
// ⛔ ítem #8: /drivers requiere autenticación para proteger datos sensibles
apiRouter.get('/drivers', authenticateToken, requireRole('admin'), (req, res) => {
  const drivers = FleetService.getDrivers();
  res.json(drivers);
});

apiRouter.get('/drivers/:id', authenticateToken, requireRole('admin'), (req, res, next) => {
  try {
    const driver = FleetService.getDriverById(req.params.id);
    res.json(driver);
  } catch (err) {
    next(err);
  }
});

// --- 4. FLEET BUSES ---
apiRouter.get('/buses', (req, res) => {
  const { route, status, search } = req.query;
  const buses = FleetService.getBuses({ route, status, search });
  res.json(buses);
});

// ⛔ ítem #3: POST y PATCH de buses requieren autenticación + rol admin
apiRouter.post('/buses', authenticateToken, requireRole('admin'), writeLimiter, (req, res, next) => {
  try {
    const bus = FleetService.createBus(req.body);
    telemetryEngine.broadcast('bus_created', bus);
    res.status(201).json(bus);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/buses/:id', (req, res, next) => {
  try {
    const bus = FleetService.getBusById(req.params.id);
    res.json(bus);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/buses/:id/status', authenticateToken, requireRole('admin'), writeLimiter, validateBusStatus, (req, res, next) => {
  try {
    const { status } = req.body;
    const bus = FleetService.updateBusStatus(req.params.id, status);
    telemetryEngine.broadcast('bus_status_changed', bus);
    res.json(bus);
  } catch (err) {
    next(err);
  }
});

// --- 5. ALERTS & INCIDENTS ---
apiRouter.get('/alerts', authenticateToken, (req, res) => {
  const { severity } = req.query;
  const alerts = AlertService.getAlerts(severity);
  res.json(alerts);
});

// ⛔ ítem #3: POST y PATCH de alertas requieren autenticación + rol admin
apiRouter.post('/alerts', authenticateToken, requireRole('admin'), writeLimiter, validateAlertSeverity, (req, res, next) => {
  try {
    const alert = AlertService.createAlert(req.body);
    telemetryEngine.broadcast('alert_created', alert);
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch('/alerts/read-all', authenticateToken, requireRole('admin'), writeLimiter, (req, res) => {
  const result = AlertService.markAllAsRead();
  telemetryEngine.broadcast('alerts_read_all', result);
  res.json(result);
});

// --- 6. ACTIVITIES ---
apiRouter.get('/activities', authenticateToken, requireRole('admin'), (req, res) => {
  res.json(db.getActivities());
});

// --- 7. REPORTS & ANALYTICS ---
apiRouter.get('/reports/summary', authenticateToken, requireRole('admin'), (req, res) => {
  const summary = FleetService.getOperationalSummary();
  res.json(summary);
});

apiRouter.get('/reports/export-csv', authenticateToken, requireRole('admin'), (req, res) => {
  const csv = FleetService.generateFleetCsv();
  const filename = `flota-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Prevent CSV injection: the CSV content is generated internally, but
  // as a precaution add a no-cache header so sensitive exports aren't cached.
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
});

// --- 8. PASSENGER EXPERIENCE (UNIVERSIDAD FIDÉLITAS PILOT) ---
apiRouter.get('/passenger/stops', (req, res) => {
  res.json(PassengerService.getPilotStops());
});

apiRouter.get('/passenger/stops/:id/arrivals', (req, res) => {
  const arrivals = PassengerService.getStopArrivals(req.params.id);
  res.json(arrivals);
});
