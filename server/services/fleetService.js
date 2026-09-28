/* ==============================================================================
   BusTrack Pro — Fleet & Operations Service
   ============================================================================== */

import { db } from '../database/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const VALID_STATUSES = ['active', 'delayed', 'stopped', 'maintenance'];

export class FleetService {
  static getBuses(filters = {}) {
    return db.getAllBuses(filters);
  }

  static getBusById(id) {
    const bus = db.getBusById(id);
    if (!bus) {
      throw ApiError.notFound(`Bus with ID '${id}' was not found in fleet records.`);
    }
    return bus;
  }

  static createBus(payload) {
    if (payload.routeId && !db.getRouteById(payload.routeId)) {
      throw ApiError.badRequest(`Route '${payload.routeId}' does not exist.`);
    }
    if (payload.driverId && !db.getDriverById(payload.driverId)) {
      throw ApiError.badRequest(`Driver '${payload.driverId}' does not exist.`);
    }
    const bus = db.createBus(payload);
    db.pushActivity(`Bus ${bus.id} incorporado a la flota activa`, 'ok');
    return bus;
  }

  static updateBusStatus(id, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status '${newStatus}'. Allowed values: ${VALID_STATUSES.join(', ')}`
      );
    }
    const bus = db.updateBusStatus(id, newStatus);
    if (!bus) {
      throw ApiError.notFound(`Bus with ID '${id}' was not found.`);
    }
    db.pushActivity(`Estado de ${bus.id} actualizado a '${newStatus}'`, newStatus === 'maintenance' ? 'warn' : 'info');
    return bus;
  }

  static getRoutes() {
    return db.getAllRoutes();
  }

  static getRouteById(id) {
    const route = db.getRouteById(id);
    if (!route) {
      throw ApiError.notFound(`Route with ID '${id}' was not found.`);
    }
    return route;
  }

  static getDrivers() {
    return db.getAllDrivers();
  }

  static getDriverById(id) {
    const driver = db.getDriverById(id);
    if (!driver) {
      throw ApiError.notFound(`Driver with ID '${id}' was not found.`);
    }
    return driver;
  }

  static getOperationalSummary() {
    const buses = db.getAllBuses();
    const total = buses.length;
    const circulating = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
    const totalPassengers = buses.reduce((s, b) => s + b.passengers, 0);
    const totalCapacity = buses.reduce((s, b) => s + b.capacity, 0) || 1;
    const occupancyRate = Math.round((totalPassengers / totalCapacity) * 100);
    const totalDelay = buses.reduce((s, b) => s + b.delay, 0);
    const avgDelayMinutes = total ? +(totalDelay / total).toFixed(1) : 0;
    const inMaintenance = buses.filter(b => b.status === 'maintenance').length;
    const lowFuelCount = buses.filter(b => b.fuel < 20).length;

    return {
      totalBuses: total,
      circulating,
      totalPassengers,
      occupancyRate,
      avgDelayMinutes,
      inMaintenance,
      lowFuelCount,
      generatedAt: new Date().toISOString(),
    };
  }

  static generateFleetCsv() {
    const buses = db.getAllBuses();
    const headers = [
      'Bus ID', 'Placa', 'Ruta', 'Conductor', 'Velocidad (km/h)',
      'Pasajeros', 'Capacidad', 'Estado', 'Combustible (%)', 'Retraso (min)', 'Proxima Parada', 'ETA (min)'
    ];

    const rows = buses.map(b => [
      b.id,
      b.plate,
      `Ruta ${b.route.id}`,
      b.driver.name,
      b.speed,
      b.passengers,
      b.capacity,
      b.status,
      b.fuel,
      b.delay,
      b.nextStop,
      b.etaMin
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    return '\uFEFF' + csvContent; // BOM for proper Excel UTF-8 display
  }
}
