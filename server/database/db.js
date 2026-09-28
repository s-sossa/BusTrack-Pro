/* ==============================================================================
   BusTrack Pro — Persistence & Data Repository Layer
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

// --- SEED DEFINITIONS (Synchronized with BusTrack Domain) ---

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
  { name: 'Terminal Central',  x: 200, y: 150 },
  { name: 'Parque Central',    x: 400, y: 150 },
  { name: 'Hospital San Juan', x: 600, y: 150 },
  { name: 'Mercado Norte',     x: 200, y: 300 },
  { name: 'Universidad',       x: 400, y: 300 },
  { name: 'Zona Industrial',   x: 600, y: 300 },
  { name: 'Estadio',           x: 200, y: 225 },
  { name: 'Aeropuerto',        x: 600, y: 225 },
  { name: 'Barrio Escalante',  x: 100, y: 225 },
  { name: 'Centro Cívico',     x: 700, y: 225 },
  // Fidélitas Pilot Stops
  { id: 'stop-fidelitas', name: 'Entrada Principal U Fidélitas', x: 400, y: 225 },
  { id: 'stop-vargas-araya', name: 'Parada Barrio Vargas Araya', x: 350, y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Colegio Calasanz', x: 300, y: 225 },
  { id: 'stop-san-pedro', name: 'Parada Muñoz & Nanne / Plaza del Sol', x: 250, y: 225 },
  { id: 'stop-mall-sp', name: 'Parada Mall San Pedro / Hispanidad', x: 200, y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', x: 150, y: 225 },
];

export const SEED_ALERTS = [
  { id: 1, type: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', desc: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus: 'BUS-011', time: 'hace 3 min', read: false, createdAt: new Date(Date.now() - 3 * 60000).toISOString() },
  { id: 2, type: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', desc: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus: 'BUS-007', time: 'hace 8 min', read: false, createdAt: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: 3, type: 'warning',  icon: '⛽', title: 'Combustible bajo', desc: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus: 'BUS-004', time: 'hace 15 min', read: false, createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 4, type: 'info',     icon: '📊', title: 'Reporte diario generado', desc: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus: 'Sistema', time: 'hace 32 min', read: true, createdAt: new Date(Date.now() - 32 * 60000).toISOString() },
  { id: 5, type: 'info',     icon: '🔄', title: 'Mantenimiento programado', desc: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus: 'BUS-012', time: 'hace 1 h', read: true, createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
];

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function generateInitialBuses(count = 12) {
  const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
  const list = [];
  for (let i = 1; i <= count; i++) {
    const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
    const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
    const status = statuses[(i - 1) % statuses.length];
    const moving = status === 'active' || status === 'delayed';
    list.push({
      id: 'BUS-' + String(i).padStart(3, '0'),
      num: String(i).padStart(3, '0'),
      plate: 'SJB-' + String(1000 + i),
      route: { ...route },
      driver: { ...driver },
      status,
      speed: moving ? randInt(28, 58) : 0,
      passengers: randInt(4, 44),
      capacity: 52,
      fuel: randInt(25, 96),
      delay: status === 'delayed' ? randInt(3, 11) : 0,
      nextStop: SEED_STOPS[(i - 1) % SEED_STOPS.length].name,
      etaMin: randInt(2, 9),
      updatedAgo: 1,
      pos: { x: 400, y: 225 },
      _t: (i * 0.08) % 1.0,
      _step: 0.005 + (i % 3) * 0.001,
      _dir: i % 2 === 0 ? 1 : -1,
    });
  }
  return list;
}

class Database {
  constructor() {
    this.users = [
      {
        id: 'usr-admin-01',
        email: 'admin@bustrack.com',
        // password is 'Admin123!' hashed with bcrypt
        passwordHash: '$2a$10$wNlh4J6m5n9S8d.WvYQk8.L0yW.fO2e9jG4iZ5rK7hM3oP2nQ1r2s',
        name: 'Gerente Admin',
        role: 'admin',
        provider: 'email',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Gerente%20Admin',
        createdAt: new Date().toISOString(),
      }
    ];
    this.routes = JSON.parse(JSON.stringify(SEED_ROUTES));
    this.drivers = JSON.parse(JSON.stringify(SEED_DRIVERS));
    this.stops = JSON.parse(JSON.stringify(SEED_STOPS));
    this.buses = generateInitialBuses(12);
    this.alerts = JSON.parse(JSON.stringify(SEED_ALERTS));
    this.activities = [
      { id: 1, text: 'BUS-003 completó la Ruta B en horario', time: 'hace 2 min', type: 'ok' },
      { id: 2, text: 'BUS-007 reportó retraso de 8 min por congestión', time: 'hace 6 min', type: 'warn' },
      { id: 3, text: 'Conductor Carlos Mendoza inició turno en Ruta A', time: 'hace 14 min', type: 'info' },
    ];
  }

  // --- BUSES ---
  getAllBuses(filters = {}) {
    let result = [...this.buses];
    if (filters.route && filters.route !== 'all') {
      result = result.filter(b => b.route.id.toLowerCase() === filters.route.toLowerCase());
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter(b => b.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(b =>
        b.id.toLowerCase().includes(q) ||
        b.plate.toLowerCase().includes(q) ||
        b.driver.name.toLowerCase().includes(q) ||
        b.route.name.toLowerCase().includes(q)
      );
    }
    return result;
  }

  getBusById(id) {
    return this.buses.find(b => b.id.toLowerCase() === id.toLowerCase()) || null;
  }

  createBus(data = {}) {
    const nextNum = this.buses.length + 1;
    const busId = 'BUS-' + String(nextNum).padStart(3, '0');
    const route = data.routeId
      ? this.getRouteById(data.routeId) || this.routes[0]
      : this.routes[(nextNum - 1) % this.routes.length];
    const driver = data.driverId
      ? this.getDriverById(data.driverId) || this.drivers[0]
      : this.drivers[(nextNum - 1) % this.drivers.length];

    const newBus = {
      id: busId,
      num: String(nextNum).padStart(3, '0'),
      plate: 'SJB-' + String(1000 + nextNum),
      route: { ...route },
      driver: { ...driver },
      status: 'stopped',
      speed: 0,
      passengers: 0,
      capacity: 52,
      fuel: 100,
      delay: 0,
      nextStop: this.stops[0].name,
      etaMin: 0,
      updatedAgo: 0,
      pos: { x: 400, y: 225 },
      _t: Math.random(),
      _step: 0.005,
      _dir: 1,
    };

    this.buses.push(newBus);
    return newBus;
  }

  updateBusStatus(id, newStatus) {
    const bus = this.getBusById(id);
    if (!bus) return null;

    bus.status = newStatus;
    if (newStatus === 'stopped' || newStatus === 'maintenance') {
      bus.speed = 0;
      bus.delay = 0;
    } else if (newStatus === 'active') {
      bus.delay = 0;
      if (bus.speed === 0) bus.speed = randInt(25, 55);
    } else if (newStatus === 'delayed') {
      if (bus.speed === 0) bus.speed = randInt(20, 48);
      if (bus.delay === 0) bus.delay = randInt(3, 10);
    }
    bus.updatedAgo = 0;
    return bus;
  }

  // --- ROUTES ---
  getAllRoutes() {
    return this.routes.map(r => {
      const own = this.buses.filter(b => b.route.id === r.id);
      const active = own.filter(b => b.status === 'active').length;
      return {
        ...r,
        totalBuses: own.length,
        activeBuses: active,
        coveragePercent: own.length ? Math.round((active / own.length) * 100) : 0,
        passengersOnboard: own.reduce((s, b) => s + b.passengers, 0),
        avgDelayMinutes: own.length ? +(own.reduce((s, b) => s + b.delay, 0) / own.length).toFixed(1) : 0,
      };
    });
  }

  getRouteById(id) {
    return this.routes.find(r => r.id.toLowerCase() === id.toLowerCase()) || null;
  }

  // --- DRIVERS ---
  getAllDrivers() {
    return this.drivers.map(d => {
      const assignedBus = this.buses.find(b => b.driver.id === d.id && b.status !== 'stopped');
      return {
        ...d,
        assignedBusId: assignedBus ? assignedBus.id : null,
        status: assignedBus ? 'on_duty' : 'off_duty',
      };
    });
  }

  getDriverById(id) {
    return this.drivers.find(d => d.id.toLowerCase() === id.toLowerCase()) || null;
  }

  // --- ALERTS ---
  getAllAlerts(severity = 'all') {
    if (!severity || severity === 'all') return [...this.alerts];
    return this.alerts.filter(a => a.type === severity);
  }

  createAlert(data) {
    const alert = {
      id: Date.now(),
      type: data.type || 'info',
      icon: data.icon || (data.type === 'critical' ? '🚨' : data.type === 'warning' ? '⚠️' : 'ℹ️'),
      title: data.title,
      desc: data.desc,
      bus: data.bus || 'Sistema',
      time: 'ahora mismo',
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();
    return alert;
  }

  markAllAlertsAsRead() {
    let count = 0;
    this.alerts.forEach(a => {
      if (!a.read) {
        a.read = true;
        count++;
      }
    });
    return count;
  }

  // --- USERS ---
  findUserByEmail(email) {
    if (!email) return null;
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  findUserById(id) {
    return this.users.find(u => u.id === id) || null;
  }

  createUser(userData) {
    const newUser = {
      id: 'usr-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      email: userData.email,
      passwordHash: userData.passwordHash || null,
      name: userData.name,
      role: userData.role || 'passenger',
      provider: userData.provider || 'email',
      avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  // --- ACTIVITIES ---
  getActivities() {
    return [...this.activities];
  }

  pushActivity(text, type = 'info') {
    const act = {
      id: Date.now(),
      text,
      time: 'ahora mismo',
      type,
    };
    this.activities.unshift(act);
    if (this.activities.length > 20) this.activities.pop();
    return act;
  }
}

export const db = new Database();
