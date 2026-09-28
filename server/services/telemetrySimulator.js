/* ==============================================================================
   BusTrack Pro — Real-Time Telemetry & WebSocket Engine
   ============================================================================== */

import { db, SEED_STOPS } from '../database/db.js';
import { config } from '../config.js';
import { PassengerService } from './passengerService.js';

const ROUTE_PATHS = {
  A: t => ({ x: 50 + t * 700, y: 150 + Math.sin(t * Math.PI) * 30 }),
  B: t => ({ x: 50 + t * 700, y: 300 + Math.sin(t * Math.PI + 1) * 25 }),
  C: t => ({ x: 200 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
  D: t => ({ x: 600 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
};

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class TelemetryEngine {
  constructor() {
    this.wsClients = new Set();
    this.telemetryInterval = null;
    this.activityInterval = null;
    this.isRunning = false;
  }

  registerClient(ws) {
    this.wsClients.add(ws);
    // Send initial snapshot on connect
    const snapshot = {
      event: 'snapshot',
      timestamp: new Date().toISOString(),
      data: {
        buses: db.getAllBuses(),
        routes: db.getAllRoutes(),
        drivers: db.getAllDrivers(),
        alerts: db.getAllAlerts(),
        activities: db.getActivities(),
      },
    };
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(snapshot));
    }
  }

  unregisterClient(ws) {
    this.wsClients.delete(ws);
  }

  broadcast(event, payload) {
    if (this.wsClients.size === 0) return;
    const message = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });
    for (const client of this.wsClients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Fast-tick positions & telemetry updates
    this.telemetryInterval = setInterval(() => {
      this.tick();
    }, config.telemetryIntervalMs);

    // Periodic activity log simulation
    this.activityInterval = setInterval(() => {
      this.tickActivity();
    }, config.activityIntervalMs);

    console.log(`[TELEMETRY] Engine started. Broadcasting every ${config.telemetryIntervalMs}ms.`);
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.telemetryInterval);
    clearInterval(this.activityInterval);
    this.isRunning = false;
    console.log('[TELEMETRY] Engine stopped.');
  }

  tick() {
    const buses = db.getAllBuses();
    const updates = [];

    for (const b of buses) {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        b._t += (b._dir || 1) * (b._step || 0.005) * (b.speed / 40);
        if (b._t >= 1) {
          b._t = 1;
          b._dir = -1;
        } else if (b._t <= 0) {
          b._t = 0;
          b._dir = 1;
        }

        const pathFn = ROUTE_PATHS[b.route.id] || ROUTE_PATHS.A;
        b.pos = pathFn(b._t);

        // Fluctuate speed, passengers, fuel
        b.passengers = Math.max(0, Math.min(b.capacity, b.passengers + randInt(-2, 2)));
        b.speed = Math.max(16, Math.min(65, b.speed + randInt(-4, 4)));
        b.updatedAgo = 1;

        if (Math.random() < 0.12) {
          b.nextStop = pick(SEED_STOPS).name;
          b.etaMin = randInt(2, 9);
        }
        if (Math.random() < 0.06) {
          b.fuel = Math.max(5, b.fuel - 1);
        }
      }

      updates.push({
        id: b.id,
        status: b.status,
        speed: b.speed,
        passengers: b.passengers,
        fuel: b.fuel,
        delay: b.delay,
        nextStop: b.nextStop,
        etaMin: b.etaMin,
        pos: b.pos,
        updatedAgo: b.updatedAgo,
      });
    }

    this.broadcast('telemetry_tick', updates);

    // Broadcast real-time ETA updates for passenger pilot stops
    const pilotStops = PassengerService.getPilotStops();
    if (pilotStops.length) {
      const etaUpdates = [];
      for (const stop of pilotStops) {
        const arrivals = PassengerService.getStopArrivals(stop.id).arrivals;
        arrivals.forEach(a => {
          etaUpdates.push({
            stopId: stop.id,
            busId: a.busId,
            etaMinutes: a.etaMinutes,
            distanceMeters: a.distanceMeters,
            distanceFormatted: a.distanceFormatted,
            occupancyPercent: a.occupancyPercent
          });
        });
      }
      this.broadcast('passenger_eta_update', etaUpdates);
    }
  }

  tickActivity() {
    const buses = db.getAllBuses();
    if (!buses.length) return;
    const bus = pick(buses);
    const stop = pick(SEED_STOPS);
    const templates = [
      { text: `${bus.id} arribó a la parada ${stop.name}`, type: 'info' },
      { text: `${bus.id} reportó velocidad crucero de ${bus.speed} km/h`, type: 'ok' },
      { text: `${bus.driver.name} actualizó estado de viaje en Ruta ${bus.route.id}`, type: 'info' },
    ];
    const picked = pick(templates);
    const act = db.pushActivity(picked.text, picked.type);
    this.broadcast('activity_new', act);
  }
}

export const telemetryEngine = new TelemetryEngine();
