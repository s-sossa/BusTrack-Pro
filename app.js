/* ============================================================
   BusTrack Pro — lógica de la aplicación
   JavaScript sin dependencias. Los datos son simulados.
 
   Organización del archivo:
     1. Datos y utilidades
     2. Preferencias (localStorage)
     3. Navegación y sidebar
     4. Panel principal
     5. Flota (tabla, filtros, orden, CSV)
     6. Mapas (render, zoom, arrastre)
     7. Rutas, alertas, conductores, reportes
     8. Notificaciones y avisos
     9. Ciclo de vida (intervalos, resize, init)
   ============================================================ */
 
'use strict';
 
/* ==========================================================
   1. DATOS Y UTILIDADES 
   ========================================================== */
 
// Los colores salen del CSS para que cambiar el acento repinte
// también los gráficos y los marcadores del mapa.
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* ==========================================================
   BACKEND API & WEBSOCKET CLIENT
   ========================================================== */

const API_BASE = window.location.protocol.startsWith('http')
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:3000';
const WS_BASE = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws/telemetry`
  : `ws://${window.location.host || 'localhost:3000'}/ws/telemetry`;

let backendConnected = false;
let wsInstance = null;

function updateBackendStatusBadge(status, text) {
  const pill = $('serverStatusPill');
  const label = $('serverStatusLabel');
  if (!pill || !label) return;
  pill.className = 'server-status-pill ' + status;
  label.textContent = text;
}

// Helper: escapa caracteres HTML para evitar XSS al usar innerHTML (ítem #35)
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper: obtiene el token JWT del almacenamiento local
function getAuthToken() {
  try {
    const s = localStorage.getItem('bustrack_session');
    return s ? JSON.parse(s).token : null;
  } catch { return null; }
}

const api = {
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`, { signal: AbortSignal.timeout(2500) });
      return res.ok;
    } catch {
      return false;
    }
  },
  async getBuses() {
    const res = await fetch(`${API_BASE}/api/v1/buses`);
    if (!res.ok) throw new Error(`Error ${res.status} al obtener buses`);
    return res.json();
  },
  async getAlerts() {
    const res = await fetch(`${API_BASE}/api/v1/alerts`);
    if (!res.ok) throw new Error(`Error ${res.status} al obtener alertas`);
    return res.json();
  },
  async updateBusStatus(id, status) {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/v1/buses/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Error ${res.status} al actualizar estado del bus`);
    return res.json();
  },
  async createBus(payload) {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/v1/buses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Error ${res.status} al crear bus`);
    return res.json();
  },
  async createAlert(payload) {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/v1/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Error ${res.status} al crear alerta`);
    return res.json();
  },
  async markAllAlertsRead() {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/v1/alerts/read-all`, {
      method: 'PATCH',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Error ${res.status} al marcar alertas`);
    return res.json();
  },
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || 'Error al iniciar sesión');
    }
    return res.json();
  },
  async register(payload) {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || 'Error al registrarse');
    }
    return res.json();
  },
  // loginGoogle y loginApple eliminados — se usa Supabase JS SDK en el cliente
  async getMe(token) {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
  async getDatabaseStatus() {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/v1/database/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Error fetching DB status:', err);
      return null;
    }
  }
};

async function fetchAndUpdateDbStatus() {
  const data = await api.getDatabaseStatus();
  const pillLabel = $('dbStatusLabel');
  const pill = $('dbStatusPill');

  if (!data) {
    if (pillLabel) pillLabel.textContent = 'BD: Sin conexión';
    if (pill) pill.className = 'db-status-pill';
    return;
  }

  // Update status pill label and style
  if (pillLabel) {
    const dialectName = data.dialect === 'sqlite' ? 'SQLite 3' : (data.dialect === 'postgres' ? 'PostgreSQL 16' : 'En Memoria');
    pillLabel.textContent = `BD: ${dialectName} (100% Real)`;
  }
  if (pill) {
    pill.className = 'db-status-pill real-db';
  }

  // Update modal contents if modal elements exist
  const modalEngine = $('dbModalEngine');
  const modalStorage = $('dbModalStorage');
  const modalSize = $('dbModalSize');
  const modalTotalRows = $('dbModalTotalRows');
  const modalPath = $('dbModalPath');
  const modalTableList = $('dbModalTableList');

  if (modalEngine) modalEngine.textContent = data.engine || 'SQLite 3 (ACID Relational File DB)';
  if (modalStorage) {
    modalStorage.textContent = data.storage === 'persistent_file' ? 'Archivo en Disco (WAL)' : 'En Memoria';
  }
  if (modalSize) modalSize.textContent = data.fileSizeFormatted || (data.fileSizeBytes ? `${(data.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A');
  if (modalTotalRows) modalTotalRows.textContent = `${data.totalRows || 0} filas`;
  if (modalPath) modalPath.textContent = data.filePath || 'RAM (In-Memory)';

  if (modalTableList && Array.isArray(data.tables)) {
    modalTableList.innerHTML = data.tables.map(t => `
      <div class="db-table-row">
        <span class="db-table-name">📋 ${esc(t.name)}</span>
        <span class="db-table-count">${fmt(t.count)} registros</span>
      </div>
    `).join('');
  }
}


function handleServerEvent(msg) {
  if (!msg || !msg.event) return;
  if (msg.event === 'snapshot') {
    if (msg.data && msg.data.buses) {
      buses = msg.data.buses;
      refreshCounters();
      renderBusList();
      if (state.view === 'fleet') renderFleet();
      if (state.view === 'map') renderMapBusList();
      drawMapMarkers(true);
    }
    if (msg.data && msg.data.alerts) {
      alerts = msg.data.alerts;
      renderAlerts();
    }
  } else if (msg.event === 'telemetry_tick') {
    const updates = msg.data;
    if (Array.isArray(updates)) {
      updates.forEach(u => {
        const b = buses.find(x => x.id === u.id);
        if (b) {
          b.speed = u.speed;
          b.passengers = u.passengers;
          b.fuel = u.fuel;
          b.delay = u.delay;
          b.nextStop = u.nextStop;
          b.etaMin = u.etaMin;
          b.pos = u.pos;
          b.updatedAgo = u.updatedAgo;
        }
      });
      refreshCounters();
      drawMapMarkers();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'map') renderMapBusList();
      if (state.view === 'fleet') renderFleet();
    }
  } else if (msg.event === 'bus_status_changed') {
    const updated = msg.data;
    const b = buses.find(x => x.id === updated.id);
    if (b) {
      Object.assign(b, updated);
      refreshAfterStatusChange(b);
    }
  } else if (msg.event === 'bus_created') {
    const exists = buses.find(x => x.id === msg.data.id);
    if (!exists) {
      buses.push(msg.data);
      refreshCounters();
      renderBusList();
      if (state.view === 'fleet') renderFleet();
    }
  } else if (msg.event === 'alert_created') {
    const exists = alerts.find(x => x.id === msg.data.id);
    if (!exists) {
      alerts.unshift(msg.data);
      renderAlerts();
      // ítem #35: esc() para datos del servidor antes de insertar en DOM
      addNotification(msg.data.icon, `<strong>${esc(msg.data.title)}:</strong> ${esc(msg.data.bus)}`);
    }
  } else if (msg.event === 'alerts_read_all') {
    alerts.forEach(a => { a.read = true; });
    renderAlerts();
  }
}

// ítem #34: Reconexión WebSocket con backoff exponencial
let wsRetryDelay = 1000;
const WS_MAX_DELAY = 30000;

function connectWebSocket() {
  try {
    wsInstance = new WebSocket(WS_BASE);
    wsInstance.onopen = () => {
      backendConnected = true;
      wsRetryDelay = 1000; // reset backoff
      updateBackendStatusBadge('online', 'API Online (WS)');
    };
    wsInstance.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleServerEvent(data);
      } catch (err) {
        console.warn('WS JSON parse error:', err);
      }
    };
    wsInstance.onclose = () => {
      backendConnected = false;
      updateBackendStatusBadge('offline', 'Modo Local');
      // Reintentar con backoff
      setTimeout(() => {
        wsRetryDelay = Math.min(wsRetryDelay * 2, WS_MAX_DELAY);
        connectWebSocket();
      }, wsRetryDelay);
    };
    wsInstance.onerror = () => {
      // onclose se disparará tras onerror; el backoff lo maneja
      backendConnected = false;
      updateBackendStatusBadge('offline', 'Modo Local');
    };
  } catch (err) {
    console.warn('WebSocket init failed:', err);
  }
}

function initBackendConnection() {
  api.checkHealth().then(ok => {
    if (ok) {
      backendConnected = true;
      updateBackendStatusBadge('online', 'API Online');
      connectWebSocket();
    } else {
      backendConnected = false;
      updateBackendStatusBadge('offline', 'Modo Local');
    }
  }).catch(() => {
    backendConnected = false;
    updateBackendStatusBadge('offline', 'Modo Local');
  });
}

 
const ROUTES = [
  // Rutas reales del Gran Área Metropolitana y regiones de Costa Rica
  { id: 'SJO-201', name: 'SJO-201 – San José ↔ Alajuela (vía Aeropuerto SJO)',  varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22,
    stopIds: ['stop-central', 'stop-coca-cola', 'stop-sabana', 'stop-escazu', 'stop-santa-ana', 'stop-city-mall', 'stop-aeropuerto-sjo', 'stop-alajuela-fecosa'] },
  { id: 'SJO-300', name: 'SJO-300 – San José ↔ Heredia (vía Ruta 3)',           varName: '--route-b', color: '#7c4ddb', stops: 6,  length: 18,
    stopIds: ['stop-central', 'stop-7-10', 'stop-parque', 'stop-heredia-terminal', 'stop-santo-domingo', 'stop-san-pablo'] },
  { id: 'SJO-400', name: 'SJO-400 – San José ↔ Cartago (vía Autopista Florencio del Castillo)', varName: '--route-c', color: '#2aa3c4', stops: 7, length: 25,
    stopIds: ['stop-central', 'stop-hospital', 'stop-san-pedro', 'stop-ucr', 'stop-curridabat', 'stop-tres-rios', 'stop-cartago-mall'] },
  { id: 'SJO-401', name: 'SJO-401 – San José ↔ Turrialba (vía Cartago)',        varName: '--route-d', color: '#2bb885', stops: 6,  length: 90,
    stopIds: ['stop-central', 'stop-cartago-mall', 'stop-tres-rios', 'stop-paraiso', 'stop-cervantes', 'stop-turrialba'] },
  { id: 'SJO-402', name: 'SJO-402 – Cartago ↔ San José (Express Ciudad Jardín)', varName: '--route-e', color: '#f5a623', stops: 5, length: 24,
    stopIds: ['stop-cartago-mall', 'stop-tres-rios', 'stop-curridabat', 'stop-san-pedro', 'stop-central'] },
  { id: 'SJO-600', name: 'SJO-600 – San José ↔ Desamparados ↔ Aserrí',         varName: '--route-f', color: '#e24c6c', stops: 5,  length: 20,
    stopIds: ['stop-central', 'stop-sanjose', 'stop-zapote', 'stop-desamparados', 'stop-aserri'] },
  { id: 'SJO-601', name: 'SJO-601 – San José ↔ San Isidro de El General',       varName: '--route-g', color: '#ff7043', stops: 5,  length: 120,
    stopIds: ['stop-central', 'stop-hospital', 'stop-desamparados', 'stop-empalme', 'stop-san-isidro'] },
  { id: 'PAC-327', name: 'PAC-327 – San José ↔ Puntarenas (vía Esparza)',        varName: '--route-h', color: '#26c6da', stops: 5,  length: 110,
    stopIds: ['stop-coca-cola', 'stop-san-ramon', 'stop-esparza', 'stop-puntarenas-muelle', 'stop-puntarenas-terminal'] },
  { id: 'GUA-900', name: 'GUA-900 – San José ↔ Liberia (vía Cañas)',             varName: '--route-i', color: '#66bb6a', stops: 6,  length: 230,
    stopIds: ['stop-coca-cola', 'stop-alajuela-fecosa', 'stop-coyol', 'stop-canas', 'stop-liberia-terminal', 'stop-la-cruz'] },
  { id: 'CAR-32',  name: 'CAR-32  – San José ↔ Limón (vía Siquirres)',           varName: '--route-j', color: '#ab47bc', stops: 6,  length: 160,
    stopIds: ['stop-7-10', 'stop-cartago-mall', 'stop-turrialba', 'stop-siquirres', 'stop-guapiles', 'stop-limon-terminal'] },
];
 
const DRIVERS = [
  { id: 'D001', name: 'Carlos Mendoza',  initials: 'CM', license: 'CR-2-0456-0891', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Ana García',      initials: 'AG', license: 'CR-1-0782-0334', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Roberto López',   initials: 'RL', license: 'CR-3-0219-0645', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'María Flores',    initials: 'MF', license: 'CR-1-1043-0277', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Jorge Ramírez',   initials: 'JR', license: 'CR-4-0388-0912', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Lucía Castro',    initials: 'LC', license: 'CR-2-0955-0158', trips: 891,  rating: 4.9, hours: 8.0 },
];
 
const STOPS = [
  // --- SAN JOSÉ (GAM) ---
  { id: 'stop-central', name: 'Terminal Central San José', province: 'San José', lat: 9.9325, lon: -84.0815, x: 200, y: 150 },
  { id: 'stop-coca-cola', name: 'Terminal Coca Cola', province: 'San José', lat: 9.9366, lon: -84.0845, x: 220, y: 155 },
  { id: 'stop-7-10', name: 'Terminal 7-10 Interurbana', province: 'San José', lat: 9.9398, lon: -84.0827, x: 240, y: 160 },
  { id: 'stop-parque', name: 'Parque Central San José', province: 'San José', lat: 9.9333, lon: -84.0792, x: 400, y: 150 },
  { id: 'stop-hospital', name: 'Hospital San Juan de Dios', province: 'San José', lat: 9.9348, lon: -84.0864, x: 600, y: 150 },
  { id: 'stop-sabana', name: 'La Sabana — Estadio Nacional', province: 'San José', lat: 9.9355, lon: -84.1042, x: 200, y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante', province: 'San José', lat: 9.9358, lon: -84.0625, x: 100, y: 225 },
  { id: 'stop-ucr', name: 'Universidad de Costa Rica (UCR)', province: 'San José', lat: 9.9365, lon: -84.0512, x: 400, y: 300 },
  { id: 'stop-zapote', name: 'Barrio Zapote / Avenida 10', province: 'San José', lat: 9.9392, lon: -84.0321, x: 400, y: 225 },
  { id: 'stop-vargas-araya', name: 'Barrio Vargas Araya', province: 'San José', lat: 9.9374, lon: -84.0382, x: 350, y: 225 },
  { id: 'stop-lourdes', name: 'Parada Súper Lourdes / Calasanz', province: 'San José', lat: 9.9362, lon: -84.0441, x: 300, y: 225 },
  { id: 'stop-san-pedro', name: 'Muñoz & Nanne / San Pedro', province: 'San José', lat: 9.9338, lon: -84.0535, x: 250, y: 225 },
  { id: 'stop-mall-sp', name: 'Mall San Pedro / Fuente Hispanidad', province: 'San José', lat: 9.9341, lon: -84.0620, x: 200, y: 225 },
  { id: 'stop-sanjose', name: 'Terminal San José — Cuesta de Moras', province: 'San José', lat: 9.9332, lon: -84.0768, x: 150, y: 225 },
  { id: 'stop-escazu', name: 'Escazú Centro / Multiplaza', province: 'San José', lat: 9.9458, lon: -84.1492, x: 120, y: 200 },
  { id: 'stop-santa-ana', name: 'Santa Ana Centro', province: 'San José', lat: 9.9328, lon: -84.1824, x: 100, y: 210 },
  { id: 'stop-desamparados', name: 'Desamparados Parque Central', province: 'San José', lat: 9.8974, lon: -84.0664, x: 300, y: 350 },

  // --- ALAJUELA (GAM & OCCIDENTE) ---
  { id: 'stop-alajuela-fecosa', name: 'Terminal Fecosa Alajuela', province: 'Alajuela', lat: 10.0152, lon: -84.2145, x: 550, y: 180 },
  { id: 'stop-aeropuerto-sjo', name: 'Aeropuerto Juan Santamaría (SJO)', province: 'Alajuela', lat: 10.0004, lon: -84.2141, x: 600, y: 225 },
  { id: 'stop-city-mall', name: 'City Mall Alajuela', province: 'Alajuela', lat: 10.0094, lon: -84.2102, x: 570, y: 200 },
  { id: 'stop-coyol', name: 'Zona Franca El Coyol', province: 'Alajuela', lat: 9.9965, lon: -84.2698, x: 620, y: 250 },
  { id: 'stop-san-ramon', name: 'Terminal San Ramón', province: 'Alajuela', lat: 10.0872, lon: -84.4705, x: 680, y: 280 },
  { id: 'stop-ciudad-quesada', name: 'Terminal Ciudad Quesada (San Carlos)', province: 'Alajuela', lat: 10.3245, lon: -84.4298, x: 700, y: 320 },
  { id: 'stop-la-fortuna', name: 'La Fortuna / Volcán Arenal', province: 'Alajuela', lat: 10.4716, lon: -84.6452, x: 720, y: 340 },

  // --- HEREDIA (GAM) ---
  { id: 'stop-heredia-central', name: 'Terminal Central Heredia', province: 'Heredia', lat: 9.9984, lon: -84.1165, x: 350, y: 120 },
  { id: 'stop-una', name: 'Universidad Nacional (UNA)', province: 'Heredia', lat: 9.9998, lon: -84.1112, x: 370, y: 115 },
  { id: 'stop-oxigeno', name: 'Mall Oxígeno Human Playground', province: 'Heredia', lat: 9.9882, lon: -84.1332, x: 340, y: 130 },
  { id: 'stop-belen', name: 'San Antonio de Belén', province: 'Heredia', lat: 9.9812, lon: -84.1878, x: 320, y: 140 },

  // --- CARTAGO (GAM & ORIENTE) ---
  { id: 'stop-cartago-central', name: 'Terminal Lumaca Cartago', province: 'Cartago', lat: 9.8645, lon: -83.9212, x: 450, y: 350 },
  { id: 'stop-basilica', name: 'Basílica Nuestra Señora de Los Ángeles', province: 'Cartago', lat: 9.8638, lon: -83.9131, x: 470, y: 360 },
  { id: 'stop-tec', name: 'Tecnológico de Costa Rica (TEC)', province: 'Cartago', lat: 9.8552, lon: -83.9095, x: 480, y: 370 },
  { id: 'stop-tres-rios', name: 'Tres Ríos Parque Central (La Unión)', province: 'Cartago', lat: 9.9075, lon: -83.9878, x: 420, y: 320 },
  { id: 'stop-turrialba', name: 'Terminal Transtusa Turrialba', province: 'Cartago', lat: 9.9048, lon: -83.6835, x: 520, y: 380 },

  // --- PUNTARENAS (PACÍFICO CENTRAL Y SUR) ---
  { id: 'stop-puntarenas-ferry', name: 'Terminal Ferry Puntarenas (Paquera)', province: 'Puntarenas', lat: 9.9774, lon: -84.8488, x: 150, y: 400 },
  { id: 'stop-puntarenas-centro', name: 'Terminal Central Puntarenas', province: 'Puntarenas', lat: 9.9765, lon: -84.8295, x: 160, y: 395 },
  { id: 'stop-caldera', name: 'Puerto Caldera', province: 'Puntarenas', lat: 9.9185, lon: -84.7175, x: 180, y: 380 },
  { id: 'stop-jaco', name: 'Terminal Jacó Centro', province: 'Puntarenas', lat: 9.6152, lon: -84.6295, x: 200, y: 420 },
  { id: 'stop-quepos', name: 'Terminal Quepos / Manuel Antonio', province: 'Puntarenas', lat: 9.4312, lon: -84.1615, x: 230, y: 450 },
  { id: 'stop-perez-zeledon', name: 'Terminal San Isidro de El General', province: 'Puntarenas', lat: 9.3735, lon: -83.7042, x: 350, y: 480 },

  // --- GUANACASTE (PACÍFICO NORTE) ---
  { id: 'stop-liberia-central', name: 'Terminal Municipal de Liberia', province: 'Guanacaste', lat: 10.6315, lon: -85.4382, x: 100, y: 80 },
  { id: 'stop-aeropuerto-lir', name: 'Aeropuerto Guanacaste (LIR)', province: 'Guanacaste', lat: 10.5935, lon: -85.5442, x: 90, y: 75 },
  { id: 'stop-santa-cruz', name: 'Terminal Santa Cruz', province: 'Guanacaste', lat: 10.2625, lon: -85.5862, x: 110, y: 110 },
  { id: 'stop-nicoya', name: 'Terminal Nicoya Colonial', province: 'Guanacaste', lat: 10.1448, lon: -85.4525, x: 120, y: 130 },
  { id: 'stop-tamarindo', name: 'Parada Playa Tamarindo', province: 'Guanacaste', lat: 10.2995, lon: -85.8412, x: 70, y: 100 },

  // --- LIMÓN (CARIBE) ---
  { id: 'stop-limon-centro', name: 'Terminal Caribeños Limón Centro', province: 'Limón', lat: 9.9935, lon: -83.0332, x: 750, y: 220 },
  { id: 'stop-moin', name: 'Terminal Puerto Moín (APM Terminals)', province: 'Limón', lat: 10.0012, lon: -83.0785, x: 740, y: 210 },
  { id: 'stop-guapiles', name: 'Terminal Pococí / Guápiles', province: 'Limón', lat: 10.2152, lon: -83.7845, x: 650, y: 160 },
  { id: 'stop-puerto-viejo', name: 'Parada Puerto Viejo de Talamanca', province: 'Limón', lat: 9.6565, lon: -82.7545, x: 790, y: 280 },
];
 
const STATUS_LABELS = {
  active: 'En servicio',
  delayed: 'Retrasado',
  stopped: 'Detenido',
  maintenance: 'Mantenimiento',
};
const STATUS_ORDER = { active: 0, delayed: 1, stopped: 2, maintenance: 3 };
 
// Ajusta los datos derivados del bus para que un estado elegido a mano
// tenga sentido: un bus "Detenido" no debería seguir mostrando velocidad,
// uno que pasa a "En servicio" recupera una velocidad razonable, etc.
function applyBusStatus(bus, status) {
  bus.status = status;
  if (status === 'stopped' || status === 'maintenance') {
    bus.speed = 0;
    bus.delay = 0;
  } else if (status === 'active') {
    bus.delay = 0;
    if (bus.speed === 0) bus.speed = randInt(24, 62);
  } else if (status === 'delayed') {
    if (bus.speed === 0) bus.speed = randInt(24, 62);
    if (bus.delay === 0) bus.delay = randInt(3, 11);
  }
}
 
// Refresca todas las vistas que puedan mostrar el estado de un bus
// después de un cambio manual.
function refreshAfterStatusChange(bus) {
  refreshCounters();
  if (state.view === 'dashboard') renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'map') renderMapBusList();
  if (state.view === 'routes') renderRoutes();
  drawMapMarkers(true);
  if (busModal.classList.contains('open') && busModal.currentBusId === bus.id) {
    fillBusModal(bus);
  }
}
 
const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
 
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Number(n).toLocaleString('es-CR');
 
// Escapa texto antes de insertarlo con innerHTML.
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
 
// Color de una ruta, resuelto contra el CSS actual.
function routeColor(route) {
  return cssVar(route.varName, route.color);
}
 
function syncRouteColors() {
  ROUTES.forEach(r => { r.color = routeColor(r); });
}
 
function generateBuses(count) {
  const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
  const list = [];
  for (let i = 1; i <= count; i++) {
    const route = ROUTES[(i - 1) % ROUTES.length];
    const driver = DRIVERS[(i - 1) % DRIVERS.length];
    const status = pick(statuses);
    const moving = status === 'active' || status === 'delayed';
    list.push({
      id: 'BUS-' + String(i).padStart(3, '0'),
      num: String(i).padStart(3, '0'),
      plate: 'SJB-' + String(1000 + i),
      route, driver, status,
      speed: moving ? randInt(24, 62) : 0,
      passengers: randInt(0, 46),
      capacity: 52,
      fuel: randInt(14, 96),
      delay: status === 'delayed' ? randInt(3, 11) : 0,
      nextStop: pick(STOPS).name,
      etaMin: randInt(2, 11),
      updatedAgo: randInt(1, 5),
      pos: { x: 400, y: 225 },
      _t: Math.random(),
      _step: 0.004 + Math.random() * 0.005,
      _dir: Math.random() > 0.5 ? 1 : -1,
    });
  }
  return list;
}
 
let buses = generateBuses(12);
 
const state = {
  view: 'dashboard',
  busFilter: 'all',
  alertFilter: 'all',
  chartPeriod: 'day',
  sort: { key: 'id', dir: 1 },
  highlightBus: null,
  trackingBus: null,   // bus que la cámara del mapa sigue mientras se mueve
};
 
/* ==========================================================
   2. PREFERENCIAS
   ========================================================== */
 
const ACCENTS = [
  { id: 'indigo', label: 'Índigo',  swatch: 'linear-gradient(135deg,#5b6ef5,#7c4ddb)' },
  { id: 'teal',   label: 'Verde azulado', swatch: 'linear-gradient(135deg,#22a79b,#2aa3c4)' },
  { id: 'forest', label: 'Verde',   swatch: 'linear-gradient(135deg,#2f9e63,#2aa3c4)' },
  { id: 'amber',  label: 'Ámbar',   swatch: 'linear-gradient(135deg,#d38b2a,#c96a3c)' },
  { id: 'rose',   label: 'Rosa',    swatch: 'linear-gradient(135deg,#d95273,#9b4bc4)' },
];
 
const prefs = {
  accent: 'indigo',
  motion: true,
  live: true,
  density: 'normal',
};
 
function loadPrefs() {
  try {
    const raw = localStorage.getItem('bustrack:prefs');
    if (raw) Object.assign(prefs, JSON.parse(raw));
  } catch (e) {
    // Algunos navegadores bloquean localStorage con file://; no es grave.
    console.warn('No se pudieron leer las preferencias:', e);
  }
  applyPrefs();
}
 
function savePrefs() {
  try {
    localStorage.setItem('bustrack:prefs', JSON.stringify(prefs));
  } catch (e) {
    console.warn('No se pudieron guardar las preferencias:', e);
  }
}
 
function applyPrefs() {
  const root = document.documentElement;
  if (prefs.accent === 'indigo') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', prefs.accent);
  root.setAttribute('data-density', prefs.density);
  syncRouteColors();
}
 
/* ==========================================================
   3. NAVEGACIÓN Y SIDEBAR
   ========================================================== */
 
const VIEW_TITLES = {
  dashboard: 'Panel Principal',

  map: 'Mapa en Vivo',
  fleet: 'Gestión de Flota',
  routes: 'Rutas',
  alerts: 'Centro de Alertas',
  reports: 'Reportes',
  drivers: 'Conductores',
};

let switchView = function(view) {
  return navigate(view);
};

function navigate(view) {
  if (!VIEW_TITLES[view]) return;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $('view-' + view).classList.add('active');
  const navEl = $('nav-' + view);
  if (navEl) navEl.classList.add('active');
 
  state.view = view;
  $('pageTitle').textContent = VIEW_TITLES[view];
  $('breadcrumbCurrent').textContent = VIEW_TITLES[view];
  document.title = VIEW_TITLES[view] + ' — BusTrack Pro';
 
  

  if (view === 'fleet') renderFleet();
  if (view === 'routes') renderRoutes();
  if (view === 'alerts') renderAlerts();
  if (view === 'drivers') renderDrivers();
  if (view === 'map') {
    if (!realLeafletMap) {
      requestAnimationFrame(() => {
        initRealLeafletMap();
        if (localStorage.getItem('bustrack_geolocate') === 'true') {
          requestUserLocation(false);
        }
      });
    } else {
      setTimeout(() => {
        if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false });
      }, 80);
      setTimeout(() => {
        if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false });
      }, 250);
    }
    renderMapBusList();
    drawMapMarkers(true);
  }
  if (view === 'dashboard') {
    requestAnimationFrame(() => { 
      drawMainChart(); 
      drawSparklines(); 
      if (!dashboardLeafletMap) {
        initDashboardLeafletMap();
      } else {
        setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 80);
        setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 250);
      }
    });
  }
  if (view === 'reports') requestAnimationFrame(drawReportCharts);
 
  closeSidebar();
  if (homeOpen) hideHome();
  window.scrollTo(0, 0);
}
 
$$('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.view));
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.dataset.view); }
  });
});
 
const sidebar = $('sidebar');
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
 
function openSidebar() {
  if (sidebar) sidebar.classList.add('mobile-open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.add('open');
  const btn = $('mobileMenuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  if (sidebar) sidebar.classList.remove('mobile-open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.remove('open');
  const btn = $('mobileMenuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
 
  function applySidebarCollapsed(collapsed) {
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    const toggleBtn = $('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
      toggleBtn.setAttribute('title', collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral');
    }
    setTimeout(redrawAll, 220);
  }

  // Restaurar estado de la barra lateral desde localStorage
  try {
    const savedCollapsed = localStorage.getItem('bustrack_sidebar_collapsed');
    if (savedCollapsed === 'true' && !isMobile()) {
      applySidebarCollapsed(true);
    }
  } catch (_) {}

  $('sidebarToggle')?.addEventListener('click', function () {
    if (!sidebar) return;
    const isNowCollapsed = !sidebar.classList.contains('collapsed');
    applySidebarCollapsed(isNowCollapsed);
    try {
      localStorage.setItem('bustrack_sidebar_collapsed', String(isNowCollapsed));
    } catch (_) {}
  });
$('mobileMenuBtn')?.addEventListener('click', openSidebar);
$('sidebarOverlay')?.addEventListener('click', closeSidebar);
 
/* ==========================================================
   4. PANEL PRINCIPAL
   ========================================================== */
 
const statusLabel = s => STATUS_LABELS[s] || s;
 
function renderBusList() {
  const el = $('busList');
  let data = buses;
  if (state.busFilter === 'active') data = buses.filter(b => b.status === 'active');
  if (state.busFilter === 'delayed') data = buses.filter(b => b.status === 'delayed');
 
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay buses en esta categoría</p>';
    return;
  }
  el.innerHTML = data.map(b => `
    <div class="bus-item" data-bus="${b.id}" role="button" tabindex="0">
      <span class="bus-item-icon" style="background:${b.route.color}22;color:${b.route.color}">${b.num}</span>
      <span class="bus-item-info">
        <span class="bus-item-id">${b.id}</span>
        <span class="bus-item-route">Ruta ${b.route.id} · ${esc(b.driver.name.split(' ')[0])}</span>
      </span>
      <span class="bus-item-meta">
        <span class="bus-item-speed">${b.speed} km/h</span>
        <span class="status-badge status-${b.status}">${statusLabel(b.status)}</span>
      </span>
    </div>`).join('');
}
 
$$('.filter-tab[data-filter]').forEach(tab => {
  tab.addEventListener('click', function () {
    $$('.filter-tab[data-filter]').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    state.busFilter = this.dataset.filter;
    renderBusList();
  });
});
 
const ACTIVITY_SEED = [
  { icon: '🚌', tone: 'info', text: '<strong>BUS-003</strong> llegó a <strong>Terminal Central</strong>', time: 'hace 2 min' },
  { icon: '⚠️', tone: 'warn', text: '<strong>BUS-007</strong> acumula <strong>+5 min</strong> de retraso en Ruta B', time: 'hace 4 min' },
  { icon: '✅', tone: 'ok',   text: '<strong>BUS-001</strong> cerró viaje con <strong>48 pasajeros</strong>', time: 'hace 7 min' },
  { icon: '🔧', tone: 'risk', text: '<strong>BUS-011</strong> entró a <strong>mantenimiento</strong> preventivo', time: 'hace 12 min' },
  { icon: '👤', tone: 'info', text: '<strong>Carlos M.</strong> inició turno en <strong>BUS-005</strong>', time: 'hace 18 min' },
  { icon: '📍', tone: 'info', text: '<strong>BUS-009</strong> llegó a <strong>Aeropuerto</strong>', time: 'hace 23 min' },
  { icon: '⛽', tone: 'warn', text: '<strong>BUS-004</strong> repostó en <strong>Terminal Central</strong>', time: 'hace 31 min' },
  { icon: '🚌', tone: 'info', text: '<strong>BUS-012</strong> salió de <strong>Zona Industrial</strong>', time: 'hace 38 min' },
  { icon: '✅', tone: 'ok',   text: '<strong>BUS-006</strong> recuperó el horario en Ruta C', time: 'hace 44 min' },
  { icon: '👤', tone: 'info', text: '<strong>Lucía C.</strong> cerró turno en <strong>BUS-002</strong>', time: 'hace 52 min' },
];
const activities = ACTIVITY_SEED.slice();
 
const TONE_BG = {
  info: () => cssVar('--brand-500', '#5b6ef5'),
  ok:   () => cssVar('--ok', '#2bb885'),
  warn: () => cssVar('--warn', '#e0972c'),
  risk: () => cssVar('--risk', '#e0526b'),
};
 
function renderActivity() {
  const expanded = $('activityFeed').classList.contains('expanded');
  const data = expanded ? activities : activities.slice(0, 6);
  $('activityFeed').innerHTML = data.map(a => `
    <div class="activity-item">
      <span class="activity-icon" style="background:${TONE_BG[a.tone]()}22">${a.icon}</span>
      <span class="activity-content">
        <span class="activity-text">${a.text}</span>
        <span class="activity-time">${a.time}</span>
      </span>
    </div>`).join('');
}
 
$('toggleActivityBtn').addEventListener('click', function () {
  const feed = $('activityFeed');
  const open = feed.classList.toggle('expanded');
  this.textContent = open ? 'Ver menos' : 'Ver todo';
  this.setAttribute('aria-expanded', String(open));
  renderActivity();
});
 
function pushActivity() {
  const verbos = ['llegó a', 'salió de', 'pasó por'];
  const bus = pick(buses);
  activities.forEach(a => { if (a.time === 'ahora mismo') a.time = 'hace 1 min'; });
  activities.unshift({
    icon: '🚌', tone: 'info',
    text: `<strong>${bus.id}</strong> ${pick(verbos)} <strong>${esc(pick(STOPS).name)}</strong>`,
    time: 'ahora mismo',
  });
  if (activities.length > 14) activities.pop();
  if (state.view === 'dashboard') renderActivity();
}
 
/* ==========================================================
   5. BUSES
   ========================================================== */
 
function sortValue(bus, key) {
  switch (key) {
    case 'route': return bus.route.id;
    case 'driver': return bus.driver.name;
    case 'status': return STATUS_ORDER[bus.status];
    case 'speed': return bus.speed;
    case 'passengers': return bus.passengers;
    case 'plate': return bus.plate;
    default: return bus.id;
  }
}
 
function visibleBuses() {
  const q = $('fleetSearch').value.trim().toLowerCase();
  const status = $('statusFilter').value;
  const route = $('routeFilter').value;
 
  const rows = buses.filter(b => {
    const haystack = [b.id, b.plate, b.driver.name, b.route.name, 'ruta ' + b.route.id].join(' ').toLowerCase();
    return (!q || haystack.includes(q))
      && (!status || b.status === status)
      && (!route || b.route.id === route);
  });
 
  const { key, dir } = state.sort;
  return rows.sort((a, b) => {
    const va = sortValue(a, key), vb = sortValue(b, key);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}
 
const ICON_EYE = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4c-4 0-7.3 2.6-9 6 1.7 3.4 5 6 9 6s7.3-2.6 9-6c-1.7-3.4-5-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5c0 3.6 4.2 8.3 4.4 8.5a.8.8 0 001.2 0C10.8 15.3 15 10.6 15 7a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>';
 
function renderFleet() {
  const rows = visibleBuses();
  const tbody = $('fleetTableBody');
 
  $('fleetCount').textContent = rows.length === buses.length
    ? `${buses.length} buses en la flota`
    : `${rows.length} de ${buses.length} buses`;
 
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9"><p class="empty-state">Ningún bus coincide con los filtros</p></td></tr>';
    return;
  }
 
  tbody.innerHTML = rows.map(b => {
    const pct = Math.round((b.passengers / b.capacity) * 100);
    const barColor = pct > 85 ? cssVar('--risk') : pct > 60 ? cssVar('--warn') : cssVar('--ok');
    return `
    <tr>
      <td>${b.id}</td>
      <td class="mono">${b.plate}</td>
      <td><span class="route-pill" style="background:${b.route.color}22;color:${b.route.color}">Ruta ${b.route.id}</span></td>
      <td>${esc(b.driver.name)}</td>
      <td class="mono">${b.speed} km/h</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:7px">
          <span class="mini-bar"><span style="width:${pct}%;background:${barColor}"></span></span>
          ${b.passengers}/${b.capacity}
        </span>
      </td>
      <td>
        <select class="status-select status-${b.status}" data-status-select="${b.id}" aria-label="Cambiar el estado de ${b.id}">
          <option value="active" ${b.status === 'active' ? 'selected' : ''}>En servicio</option>
          <option value="delayed" ${b.status === 'delayed' ? 'selected' : ''}>Retrasado</option>
          <option value="stopped" ${b.status === 'stopped' ? 'selected' : ''}>Detenido</option>
          <option value="maintenance" ${b.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
        </select>
      </td>
      <td style="color:var(--text-soft)">hace ${b.updatedAgo} min</td>
      <td>
        <span class="table-actions">
          <button class="table-btn" data-bus="${b.id}" title="Ver detalle" aria-label="Ver detalle de ${b.id}">${ICON_EYE}</button>
          <button class="table-btn" data-track="${b.id}" title="Ver en el mapa" aria-label="Ver ${b.id} en el mapa">${ICON_PIN}</button>
        </span>
      </td>
    </tr>`;
  }).join('');
}
 
$('fleetSearch').addEventListener('input', renderFleet);
$('statusFilter').addEventListener('change', renderFleet);
$('routeFilter').addEventListener('change', renderFleet);
 
$('fleetTableBody').addEventListener('change', e => {
  const sel = e.target.closest('[data-status-select]');
  if (!sel) return;
  const bus = buses.find(b => b.id === sel.dataset.statusSelect);
  if (!bus) return;
  applyBusStatus(bus, sel.value);
  refreshAfterStatusChange(bus);
  toast('Estado de ' + bus.id + ' actualizado a ' + statusLabel(bus.status), 'ok');
});
 
$('resetFiltersBtn').addEventListener('click', () => {
  $('fleetSearch').value = '';
  $('statusFilter').value = '';
  $('routeFilter').value = '';
  state.sort = { key: 'id', dir: 1 };
  $$('.fleet-table th').forEach(th => th.classList.remove('sorted', 'desc'));
  renderFleet();
  toast('Filtros restablecidos');
});
 
$$('.fleet-table th[data-sort]').forEach(th => {
  const apply = () => {
    const key = th.dataset.sort;
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
    $$('.fleet-table th').forEach(t => t.classList.remove('sorted', 'desc'));
    th.classList.add('sorted');
    if (state.sort.dir === -1) th.classList.add('desc');
    renderFleet();
  };
  th.addEventListener('click', apply);
  th.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(); }
  });
});
 
$('addBusBtn').addEventListener('click', async () => {
  const n = buses.length + 1;
  const route = ROUTES[(n - 1) % ROUTES.length];
  const driver = DRIVERS[(n - 1) % DRIVERS.length];

  if (backendConnected) {
    try {
      const newBus = await api.createBus({ routeId: route.id, driverId: driver.id });
      buses.push(newBus);
      renderFleet();
      refreshCounters();
      toast('Bus ' + newBus.id + ' registrado en backend', 'ok');
      return;
    } catch (err) {
      console.warn('Failed to add bus to backend, falling back to local:', err);
    }
  }

  buses.push({
    id: 'BUS-' + String(n).padStart(3, '0'),
    num: String(n).padStart(3, '0'),
    plate: 'SJB-' + String(1000 + n),
    route,
    driver,
    status: 'stopped',
    speed: 0, passengers: 0, capacity: 52, fuel: 100, delay: 0,
    nextStop: STOPS[0].name, etaMin: 0, updatedAgo: 0,
    pos: { x: 400, y: 225 }, _t: Math.random(), _step: 0.005, _dir: 1,
  });
  renderFleet();
  refreshCounters();
  toast('Bus ' + buses[buses.length - 1].id + ' agregado a la flota', 'ok');
});
 
$('exportCsvBtn').addEventListener('click', () => {
  const rows = visibleBuses();
  const head = ['Bus', 'Placa', 'Ruta', 'Conductor', 'Velocidad (km/h)', 'Pasajeros', 'Capacidad', 'Estado', 'Combustible (%)', 'Retraso (min)'];
  const body = rows.map(b => [
    b.id, b.plate, 'Ruta ' + b.route.id, b.driver.name,
    b.speed, b.passengers, b.capacity, statusLabel(b.status), b.fuel, b.delay,
  ]);
  const csv = [head, ...body]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
 
  if (typeof URL === 'undefined' || !URL.createObjectURL) {
    toast('Este navegador no permite descargar el archivo', 'warn');
    return;
  }
  // BOM para que Excel en español abra bien los acentos
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flota-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(rows.length + ' filas exportadas a CSV', 'ok');
});
 
/* ==========================================================
   6. MAPAS — LEAFLET REAL INTERACTIVE MAP (COBERTURA NACIONAL)
   ========================================================== */

const CR_PROVINCES = {
  all: { center: [9.7489, -83.7534], zoom: 8, name: 'Costa Rica' },
  'San José': { center: [9.9333, -84.0833], zoom: 13, name: 'San José (GAM)' },
  Alajuela: { center: [10.0163, -84.2116], zoom: 12, name: 'Alajuela' },
  Heredia: { center: [9.9984, -84.1165], zoom: 13, name: 'Heredia' },
  Cartago: { center: [9.8645, -83.9212], zoom: 13, name: 'Cartago' },
  Puntarenas: { center: [9.9765, -84.8295], zoom: 12, name: 'Puntarenas' },
  Guanacaste: { center: [10.6315, -85.4382], zoom: 11, name: 'Guanacaste' },
  Limón: { center: [9.9935, -83.0332], zoom: 12, name: 'Limón' },
};

// Rutas GPS reales trazadas sobre carreteras y paradas reales
const ROUTE_GPS_PATHS = {
  A: [
    [9.9325, -84.0815], [9.9348, -84.0864], [9.9355, -84.1042],
    [9.9458, -84.1492], [9.9812, -84.1878], [10.0004, -84.2141], [10.0152, -84.2145]
  ],
  B: [
    [9.9984, -84.1165], [9.9882, -84.1332], [9.9366, -84.0845],
    [9.9333, -84.0792], [9.8974, -84.0664]
  ],
  C: [
    [9.8645, -83.9212], [9.8638, -83.9131], [9.9075, -83.9878],
    [9.9338, -84.0535], [9.9365, -84.0512], [9.9392, -84.0321], [9.9332, -84.0768]
  ],
  D: [
    [9.9333, -84.0792], [9.9412, -84.0389], [9.9048, -83.6835], [10.2152, -83.7845], [9.9935, -83.0332]
  ]
};

let realLeafletMap = null;
let leafletMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
};

let dashboardLeafletMap = null;
let dashboardMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
};

// Generador de capas base de mapas 100% gratuitas, sin marcas de agua y sin bloqueos 403
function createArcGisLayers() {
  const esriDarkBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution: '&copy; Esri &copy; OpenStreetMap'
  });
  const esriDarkRef = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 19
  });
  const darkGroup = L.layerGroup([esriDarkBase, esriDarkRef]);

  // Capa oficial de calles completas de ArcGIS (sustituye a OSM sin errores 403)
  const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; Esri World Street Map'
  });

  // Capa satelital real de alta resolución
  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 19,
    attribution: '&copy; Esri Satellite'
  });

  return [
    { id: 'dark', icon: '🌙', name: 'Oscuro Pro (ArcGIS)', layer: darkGroup },
    { id: 'streets', icon: '🗺️', name: 'Calles y Vías (ArcGIS)', layer: streetLayer },
    { id: 'sat', icon: '🛰️', name: 'Satelital Real (ArcGIS)', layer: satLayer },
  ];
}

function initRealLeafletMap() {
  const container = document.getElementById('realFullMap');
  if (!container || realLeafletMap) return;

  if (typeof L === 'undefined') {
    console.warn('Leaflet aún no está cargado en window. Reintentando en 150ms...');
    setTimeout(initRealLeafletMap, 150);
    return;
  }

  // Centro inicial: San José / GAM (Costa Rica)
  realLeafletMap = L.map('realFullMap', {
    center: [9.9333, -84.0833],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  const styles = createArcGisLayers();
  realLeafletMap._mapStyles = styles;
  realLeafletMap._currentStyleIdx = 0;
  realLeafletMap._activeLayer = styles[0].layer;
  styles[0].layer.addTo(realLeafletMap);

  paintRealStopsAndRoutes();
  setupMapControls();

  // Selector de provincias de Costa Rica
  const provSelect = document.getElementById('provinceSelect');
  if (provSelect) {
    provSelect.addEventListener('change', (e) => {
      const p = CR_PROVINCES[e.target.value] || CR_PROVINCES.all;
      realLeafletMap.flyTo(p.center, p.zoom, { duration: 1.5 });
      toast('🇨🇷 Enfocando región: ' + p.name, 'info');
    });
  }

  realLeafletMap.on('dragstart', () => {
    if (state.trackingBus) {
      stopTracking('Dejaste de seguir el bus al mover el mapa');
    }
  });

  // Observador de cambio de tamaño (al contraer/expandir sidebar o cambiar ventana)
  if (window.ResizeObserver) {
    try {
      const ro = new ResizeObserver(() => {
        if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false });
      });
      ro.observe(container);
    } catch (_) {}
  }

  setTimeout(() => { if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false }); }, 80);
  setTimeout(() => { if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false }); }, 250);
  setTimeout(() => { if (realLeafletMap) realLeafletMap.invalidateSize({ animate: false }); }, 500);

  drawMapMarkers(true);
}

function initDashboardLeafletMap() {
  const container = document.getElementById('dashboardRealMap');
  if (!container || dashboardLeafletMap) return;

  if (typeof L === 'undefined') {
    setTimeout(initDashboardLeafletMap, 150);
    return;
  }

  dashboardLeafletMap = L.map('dashboardRealMap', {
    center: [9.9333, -84.0833],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  const styles = createArcGisLayers();
  dashboardLeafletMap._mapStyles = styles;
  dashboardLeafletMap._currentStyleIdx = 0;
  dashboardLeafletMap._activeLayer = styles[0].layer;
  styles[0].layer.addTo(dashboardLeafletMap);

  paintDashboardStopsAndRoutes();
  setupDashboardMapControls();

  if (window.ResizeObserver) {
    try {
      const ro = new ResizeObserver(() => {
        if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false });
      });
      ro.observe(container);
    } catch (_) {}
  }

  setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 100);
  setTimeout(() => { if (dashboardLeafletMap) dashboardLeafletMap.invalidateSize({ animate: false }); }, 300);

  drawMapMarkers(true);
}

function paintLayerRoutesAndStops(mapInstance, markersStore, isMini) {
  if (!mapInstance) return;

  // 1. Trazar líneas de ruta GPS
  ROUTES.forEach(r => {
    const coords = ROUTE_GPS_PATHS[r.id];
    if (coords && coords.length) {
      const poly = L.polyline(coords, {
        color: r.color,
        weight: isMini ? 3 : 4,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(mapInstance);
      poly.bindTooltip('Ruta ' + r.id + ': ' + r.name, { sticky: true });
      markersStore.routes[r.id] = poly;
    }
  });

  // 2. Colocar marcadores de paradas nacionales
  STOPS.forEach(s => {
    const icon = L.divIcon({
      className: 'real-stop-div-icon',
      html: '<div class="real-stop-icon-inner" style="' + (isMini ? 'width:12px;height:12px;' : '') + '" title="' + esc(s.name) + '"></div>',
      iconSize: isMini ? [16, 16] : [20, 20],
      iconAnchor: isMini ? [8, 8] : [10, 10]
    });

    const marker = L.marker([s.lat, s.lon], { icon }).addTo(mapInstance);
    marker.bindPopup(
      '<div style="font-family:Inter, sans-serif;">' +
        '<strong style="color:var(--text-strong); font-size:12.5px;">🚏 ' + esc(s.name) + '</strong>' +
        '<p style="margin:4px 0 0; color:var(--text-soft); font-size:11px;">' + esc(s.subtext || s.province || 'Parada oficial') + '</p>' +
        (isMini ? '' : '<span class="badge" style="margin-top:6px; display:inline-block; font-size:10px;">' + (s.province || 'Costa Rica') + '</span>') +
      '</div>'
    );
    markersStore.stops[s.id || s.name] = marker;
  });

  // 3. Leyendas
  const stopColor = '#f59e0b';
  const legend = ROUTES.map(r =>
    '<span class="legend-item"><span class="legend-dot" style="background:' + r.color + '"></span>Ruta ' + r.id + '</span>').join('')
    + '<span class="legend-item"><span class="legend-dot" style="background:' + stopColor + '"></span>Paradas</span>';
  const legEl = document.getElementById(isMini ? 'miniLegend' : 'fullLegend');
  if (legEl) legEl.innerHTML = legend;
}

function paintRealStopsAndRoutes() {
  paintLayerRoutesAndStops(realLeafletMap, leafletMarkers, false);
}

function paintDashboardStopsAndRoutes() {
  paintLayerRoutesAndStops(dashboardLeafletMap, dashboardMarkers, true);
}

function setupDashboardMapControls() {
  const miniZoomBtns = document.querySelectorAll('.map-btn[data-map="mini"][data-zoom]');
  miniZoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.zoom;
      if (!dashboardLeafletMap) return;
      if (action === 'in') dashboardLeafletMap.zoomIn();
      if (action === 'out') dashboardLeafletMap.zoomOut();
      if (action === 'reset') {
        dashboardLeafletMap.flyTo(CR_PROVINCES.all.center, CR_PROVINCES.all.zoom, { duration: 1.2 });
      }
    });
  });

  const dashStyleBtn = document.getElementById('dashboardStyleToggleBtn');
  if (dashStyleBtn && !dashStyleBtn._bound) {
    dashStyleBtn._bound = true;
    dashStyleBtn.addEventListener('click', () => {
      if (!dashboardLeafletMap || !dashboardLeafletMap._mapStyles) return;
      if (dashboardLeafletMap._activeLayer) {
        dashboardLeafletMap.removeLayer(dashboardLeafletMap._activeLayer);
      }
      dashboardLeafletMap._currentStyleIdx = (dashboardLeafletMap._currentStyleIdx + 1) % dashboardLeafletMap._mapStyles.length;
      const nextStyle = dashboardLeafletMap._mapStyles[dashboardLeafletMap._currentStyleIdx];
      dashboardLeafletMap._activeLayer = nextStyle.layer;
      nextStyle.layer.addTo(dashboardLeafletMap);
      dashStyleBtn.textContent = nextStyle.icon;
      dashStyleBtn.setAttribute('title', 'Capa actual: ' + nextStyle.name + ' (Clic para alternar)');
      toast('🗺️ ' + nextStyle.name, 'info');
    });
  }

  const miniLocBtn = document.getElementById('locateUserBtnMini');
  if (miniLocBtn && !miniLocBtn._bound) {
    miniLocBtn._bound = true;
    miniLocBtn.addEventListener('click', () => {
      if (userLocationState.lat && userLocationState.lng && dashboardLeafletMap) {
        dashboardLeafletMap.flyTo([userLocationState.lat, userLocationState.lng], 15, { duration: 1.2 });
        toast('📍 Centrando en tu ubicación', 'info');
      } else {
        requestUserLocation(true);
      }
    });
  }
}

// Interpola posición GPS para un bus según su progreso _t [0..1]
function getBusGpsPosition(bus) {
  const coords = ROUTE_GPS_PATHS[bus.route.id] || ROUTE_GPS_PATHS.A;
  if (!coords || !coords.length) return [9.9333, -84.0833];
  
  const totalSegments = coords.length - 1;
  const t = Math.max(0, Math.min(1, bus._t !== undefined ? bus._t : 0.5));
  const exactSegment = t * totalSegments;
  const index = Math.min(Math.floor(exactSegment), totalSegments - 1);
  const segFraction = exactSegment - index;

  const p1 = coords[index];
  const p2 = coords[index + 1] || p1;

  const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
  const lon = p1[1] + (p2[1] - p1[1]) * segFraction;
  return [lat, lon];
}

function drawMapMarkers(force) {
  if (!realLeafletMap && !dashboardLeafletMap) return;

  buses.forEach(b => {
    const [lat, lon] = getBusGpsPosition(b);
    b.gps = { lat, lon };

    const color = b.route.color;
    const isDelayed = b.status === 'delayed';
    const isTracked = state.trackingBus === b.id;

    // 1. Marcadores en Mapa Completo (view-map)
    if (realLeafletMap) {
      if (!leafletMarkers.buses[b.id]) {
        const busIcon = L.divIcon({
          className: 'real-bus-div-icon',
          html:
            '<div class="real-bus-icon-inner" style="background:' + color + ';' + (isTracked ? 'border-color:#38bdf8;' : '') + '">' +
              (isTracked || isDelayed ? '<div class="real-bus-pulse" style="background:' + color + ';"></div>' : '') +
              '<span>' + (b.num || b.id.replace('BUS-', '')) + '</span>' +
            '</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([lat, lon], { icon: busIcon }).addTo(realLeafletMap);
        marker.on('click', () => focusBus(b.id));
        marker.bindTooltip(
          '<strong>' + b.id + '</strong> · Ruta ' + b.route.id + '<br/>' +
          b.speed + ' km/h · ' + b.passengers + ' pas.',
          { direction: 'top', offset: [0, -14] }
        );

        leafletMarkers.buses[b.id] = marker;
      } else {
        const marker = leafletMarkers.buses[b.id];
        marker.setLatLng([lat, lon]);

        if (isTracked) {
          realLeafletMap.panTo([lat, lon], { animate: true, duration: 0.3 });
        }
      }
    }

    // 2. Marcadores en Panel Principal (view-dashboard)
    if (dashboardLeafletMap) {
      if (!dashboardMarkers.buses[b.id]) {
        const miniBusIcon = L.divIcon({
          className: 'real-bus-div-icon',
          html:
            '<div class="real-bus-icon-inner" style="background:' + color + '; width:26px; height:26px; font-size:10px;' + (isTracked ? 'border-color:#38bdf8;' : '') + '">' +
              (isTracked || isDelayed ? '<div class="real-bus-pulse" style="background:' + color + '; width:34px; height:34px; left:-4px; top:-4px;"></div>' : '') +
              '<span>' + (b.num || b.id.replace('BUS-', '')) + '</span>' +
            '</div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const miniMarker = L.marker([lat, lon], { icon: miniBusIcon }).addTo(dashboardLeafletMap);
        miniMarker.on('click', () => {
          navigate('map');
          setTimeout(() => focusBus(b.id), 200);
        });
        miniMarker.bindTooltip(
          '<strong>' + b.id + '</strong> · Ruta ' + b.route.id + '<br/>' +
          b.speed + ' km/h',
          { direction: 'top', offset: [0, -10] }
        );

        dashboardMarkers.buses[b.id] = miniMarker;
      } else {
        dashboardMarkers.buses[b.id].setLatLng([lat, lon]);
      }
    }
  });

  const countBadge = document.getElementById('mapBusCount');
  if (countBadge) countBadge.textContent = buses.filter(b => b.status === 'active').length + ' activos';
}

function renderMapBusList() {
  const container = document.getElementById('mapBusList');
  if (!container) return;
  container.innerHTML = buses.map(b =>
    '<div class="map-bus-item ' + (state.highlightBus === b.id ? 'highlight' : '') + '" data-bus="' + b.id + '" role="button" tabindex="0">' +
      '<span class="map-bus-dot" style="background:' + b.route.color + '"></span>' +
      '<span class="map-bus-info">' +
        '<span class="map-bus-id">' + b.id + '</span>' +
        '<span class="map-bus-route">Ruta ' + b.route.id + ' · ' + b.speed + ' km/h</span>' +
      '</span>' +
      '<span class="status-badge status-' + b.status + '">' + statusLabel(b.status) + '</span>' +
    '</div>'
  ).join('');
}

function centerMapOnBus(busId, resetZoom) {
  const bus = buses.find(b => b.id === busId);
  if (!bus || !realLeafletMap) return false;
  const [lat, lon] = getBusGpsPosition(bus);
  if (resetZoom) {
    realLeafletMap.setView([lat, lon], 15, { animate: true });
  } else {
    realLeafletMap.panTo([lat, lon], { animate: true });
  }
  return true;
}

function updateTrackingBanner() {
  const banner = document.getElementById('trackingBanner');
  if (!banner) return;
  if (state.trackingBus) {
    banner.hidden = false;
    document.getElementById('trackingBannerText').textContent = 'Siguiendo ' + state.trackingBus;
  } else {
    banner.hidden = true;
  }
}

function stopTracking(msg) {
  if (!state.trackingBus) return;
  state.trackingBus = null;
  updateTrackingBanner();
  if (msg) toast(msg);
}

function focusBus(busId) {
  const bus = buses.find(b => b.id === busId);
  if (!bus) return;
  state.highlightBus = busId;
  state.trackingBus = busId;
  navigate('map');
  centerMapOnBus(busId, true);
  renderMapBusList();
  drawMapMarkers(true);
  updateTrackingBanner();
  toast('Siguiendo ' + busId, 'info');
}

let animId = null;
let lastTick = 0;

function tick(ts) {
  animId = requestAnimationFrame(tick);
  if (ts - lastTick < 65) return;
  lastTick = ts;

  if (prefs.motion && !backendConnected) {
    buses.forEach(b => {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        b._t = (b._t || 0) + (b._dir || 1) * (b._step || 0.005) * (b.speed / 40);
        if (b._t >= 1) { b._t = 1; b._dir = -1; }
        else if (b._t <= 0) { b._t = 0; b._dir = 1; }
      }
    });
  }
  drawMapMarkers(false);
}

function startAnim() { if (!animId) { lastTick = 0; animId = requestAnimationFrame(tick); } }
function stopAnim() { if (animId) { cancelAnimationFrame(animId); animId = null; } }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAnim(); else startAnim();
});

const userLocationState = {
  active: false,
  lat: null,
  lng: null,
  nearestStop: null,
  distanceToStop: null,
  watchId: null,
};

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function findNearestStop(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  STOPS.forEach(stop => {
    if (stop.lat && stop.lon) {
      const dist = calculateDistanceMeters(lat, lng, stop.lat, stop.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    }
  });
  return { stop: nearest || STOPS[0], distance: minDist };
}

function renderUserLocationMarkers() {
  if (!realLeafletMap) return;
  if (!userLocationState.active || !userLocationState.lat) {
    if (leafletMarkers.user) {
      realLeafletMap.removeLayer(leafletMarkers.user);
      leafletMarkers.user = null;
    }
    return;
  }
  const { lat, lng } = userLocationState;
  const stopName = userLocationState.nearestStop ? userLocationState.nearestStop.name : 'Ubicación';
  if (!leafletMarkers.user) {
    const userIcon = L.divIcon({
      className: 'real-user-div-icon',
      html: '<div class="real-user-gps-marker"><div class="real-user-gps-pulse"></div></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    leafletMarkers.user = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(realLeafletMap);
    leafletMarkers.user.bindPopup(
      '<strong style="color:#38bdf8; font-size:13px;">📍 Tu ubicación GPS</strong><br/>' +
      '<span style="font-size:12px; color:var(--text-soft);">Cerca de: ' + esc(stopName) + '</span>'
    );
  } else {
    leafletMarkers.user.setLatLng([lat, lng]);
  }
}

function centerMapOnUser(resetZoom = true) {
  if (!userLocationState.active || !userLocationState.lat || !realLeafletMap) return false;
  realLeafletMap.flyTo([userLocationState.lat, userLocationState.lng], resetZoom ? 15 : realLeafletMap.getZoom(), { duration: 1.2 });
  return true;
}

function updateUserLocationUI() {
  renderUserLocationMarkers();
  const bar = document.getElementById('userLocationBar');
  const textEl = document.getElementById('userLocationText');
  const fullBtn = document.getElementById('locateUserBtnFull');
  if (userLocationState.active && userLocationState.nearestStop) {
    if (fullBtn) fullBtn.classList.add('active');
    const distStr = userLocationState.distanceToStop < 1000
      ? userLocationState.distanceToStop + ' m'
      : (userLocationState.distanceToStop / 1000).toFixed(1) + ' km';
    if (textEl) {
      textEl.innerHTML = '<strong>Ubicación detectada:</strong> a ' + distStr + ' de <strong>' + esc(userLocationState.nearestStop.name) + '</strong> (' + (userLocationState.nearestStop.province || 'Costa Rica') + ')';
    }
    if (bar) bar.hidden = false;
  } else {
    if (fullBtn) fullBtn.classList.remove('active');
    if (bar) bar.hidden = true;
  }
}

function stopUserLocationWatch() {
  if (userLocationState.watchId !== null) {
    navigator.geolocation.clearWatch(userLocationState.watchId);
    userLocationState.watchId = null;
  }
}

function handlePositionUpdate(position, isInitial = false) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const nearest = findNearestStop(lat, lng);
  userLocationState.active = true;
  userLocationState.lat = lat;
  userLocationState.lng = lng;
  userLocationState.nearestStop = nearest.stop;
  userLocationState.distanceToStop = nearest.distance;
  updateUserLocationUI();
  centerMapOnUser(isInitial);
  const distStr = nearest.distance < 1000 ? nearest.distance + ' m' : (nearest.distance / 1000).toFixed(1) + ' km';
  if (isInitial) {
    toast('📍 GPS en vivo: a ' + distStr + ' de ' + nearest.stop.name, 'ok');
  }
  localStorage.setItem('bustrack_geolocate', 'true');
  const geoSwitch = document.getElementById('geoSwitch');
  if (geoSwitch) geoSwitch.setAttribute('aria-checked', 'true');
}

function requestUserLocation(userInitiated = true) {
  if (!('geolocation' in navigator)) {
    if (userInitiated) toast('Tu navegador no soporta geolocalización', 'warn');
    return;
  }
  toast('Solicitando permiso de ubicación al navegador...', 'info');
  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 };
  navigator.geolocation.getCurrentPosition(
    (position) => {
      handlePositionUpdate(position, true);
      stopUserLocationWatch();
      userLocationState.watchId = navigator.geolocation.watchPosition(
        (pos) => handlePositionUpdate(pos, false),
        (err) => console.warn('Watch position update error:', err),
        options
      );
    },
    (error) => {
      console.warn('Geolocation error:', error);
      stopUserLocationWatch();
      userLocationState.active = false;
      updateUserLocationUI();
      const geoSwitch = document.getElementById('geoSwitch');
      if (geoSwitch) geoSwitch.setAttribute('aria-checked', 'false');
      if (error.code === error.PERMISSION_DENIED) {
        toast('⚠️ Permiso de ubicación denegado. Permite el acceso en la barra de direcciones de tu navegador.', 'warn');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        toast('⚠️ Posición GPS no disponible en este dispositivo.', 'warn');
      } else if (error.code === error.TIMEOUT) {
        toast('⏱️ Tiempo de espera agotado al obtener el GPS.', 'warn');
      } else if (userInitiated) {
        toast('No se pudo acceder a tu ubicación actual.', 'warn');
      }
    },
    options
  );
}

// Conexión de controles de mapa de Leaflet
function setupMapControls() {
  const zoomBtns = document.querySelectorAll('.map-btn[data-zoom]');
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.zoom;
      if (!realLeafletMap) return;
      if (action === 'in') realLeafletMap.zoomIn();
      if (action === 'out') realLeafletMap.zoomOut();
      if (action === 'reset') {
        stopTracking('Vista nacional restablecida');
        realLeafletMap.flyTo(CR_PROVINCES.all.center, CR_PROVINCES.all.zoom, { duration: 1.2 });
        const provSelect = document.getElementById('provinceSelect');
        if (provSelect) provSelect.value = 'all';
      }
    });
  });

  const styleBtn = document.getElementById('mapStyleToggleBtn');
  if (styleBtn && !styleBtn._bound) {
    styleBtn._bound = true;
    styleBtn.addEventListener('click', () => {
      if (!realLeafletMap || !realLeafletMap._mapStyles) return;
      if (realLeafletMap._activeLayer) {
        realLeafletMap.removeLayer(realLeafletMap._activeLayer);
      }
      realLeafletMap._currentStyleIdx = (realLeafletMap._currentStyleIdx + 1) % realLeafletMap._mapStyles.length;
      const nextStyle = realLeafletMap._mapStyles[realLeafletMap._currentStyleIdx];
      realLeafletMap._activeLayer = nextStyle.layer;
      nextStyle.layer.addTo(realLeafletMap);
      styleBtn.textContent = nextStyle.icon;
      styleBtn.setAttribute('title', 'Capa actual: ' + nextStyle.name + ' (Clic para cambiar)');
      toast('🗺️ ' + nextStyle.name, 'info');
    });
  }
}

/* ==========================================================
   7. RUTAS, ALERTAS, CONDUCTORES, REPORTES
   ========================================================== */
 
function routeStats(r) {
  const own = buses.filter(b => b.route.id === r.id);
  const activos = own.filter(b => b.status === 'active').length;
  return {
    total: own.length,
    activos,
    cobertura: own.length ? Math.round((activos / own.length) * 100) : 0,
    pasajeros: own.reduce((s, b) => s + b.passengers, 0),
    retraso: own.length ? (own.reduce((s, b) => s + b.delay, 0) / own.length) : 0,
  };
}
 
function renderRoutes() {
  $('routesGrid').innerHTML = ROUTES.map(r => {
    const s = routeStats(r);
    return `
    <article class="route-card" data-route="${r.id}" style="--rc:${r.color}" role="button" tabindex="0">
      <div class="route-header">
        <div>
          <p class="route-id">Ruta ${r.id}</p>
          <p class="route-name">${r.name}</p>
        </div>
        <span class="status-badge ${s.activos ? 'status-active' : 'status-stopped'}">${s.activos ? 'Activa' : 'Sin buses'}</span>
      </div>
      <div class="route-progress">
        <div class="route-progress-head"><span>Cobertura de flota</span><span style="color:${r.color}">${s.cobertura}%</span></div>
        <div class="route-progress-bar"><div class="route-progress-fill" style="width:${s.cobertura}%"></div></div>
      </div>
      <div class="route-stats">
        <div><p class="route-stat-value">${s.total}</p><p class="route-stat-label">Buses</p></div>
        <div><p class="route-stat-value">${r.stops}</p><p class="route-stat-label">Paradas</p></div>
        <div><p class="route-stat-value">${s.pasajeros}</p><p class="route-stat-label">A bordo</p></div>
        <div><p class="route-stat-value">${r.length} km</p><p class="route-stat-label">Longitud</p></div>
      </div>
    </article>`;
  }).join('');
}
 
// Al tocar una ruta se abre la flota ya filtrada por esa ruta
function openRoute(id) {
  navigate('fleet');
  $('routeFilter').value = id;
  $('fleetSearch').value = '';
  $('statusFilter').value = '';
  renderFleet();
  toast('Mostrando los buses de la Ruta ' + id);
}
 
const ALERT_SEED = [
  { id: 1, type: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', desc: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus: 'BUS-011', time: 'hace 3 min', read: false },
  { id: 2, type: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', desc: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus: 'BUS-007', time: 'hace 8 min', read: false },
  { id: 3, type: 'warning',  icon: '⛽', title: 'Combustible bajo', desc: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus: 'BUS-004', time: 'hace 15 min', read: false },
  { id: 4, type: 'info',     icon: '📊', title: 'Reporte diario generado', desc: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus: 'Sistema', time: 'hace 32 min', read: true },
  { id: 5, type: 'info',     icon: '🔄', title: 'Mantenimiento programado', desc: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus: 'BUS-012', time: 'hace 1 h', read: true },
];
let alerts = ALERT_SEED.slice();
 
function renderAlerts() {
  const data = state.alertFilter === 'all' ? alerts : alerts.filter(a => a.type === state.alertFilter);
  const el = $('alertsList');
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay alertas en esta categoría</p>';
  } else {
    // ítem #35: escapar title/desc/bus antes de inyectar en innerHTML
    el.innerHTML = data.map(a => `
      <article class="alert-item ${esc(a.type)} ${a.read ? 'read' : ''}" data-alert="${esc(String(a.id))}">
        <span class="alert-icon-wrap ${esc(a.type)}">${esc(a.icon)}</span>
        <div class="alert-content">
          <p class="alert-title">${esc(a.title)}</p>
          <p class="alert-desc">${esc(a.desc)}</p>
          <p class="alert-meta">
            <span class="alert-time">${esc(a.time)}</span>
            ${String(a.bus).startsWith('BUS') ? `<span class="alert-bus-tag" data-bus="${esc(a.bus)}">${esc(a.bus)}</span>` : `<span class="alert-bus-tag">${esc(a.bus)}</span>`}
          </p>
        </div>
      </article>`).join('');
  }
  refreshCounters();
}
 
$$('.filter-tab[data-alert-filter]').forEach(tab => {
  tab.addEventListener('click', function () {
    $$('.filter-tab[data-alert-filter]').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    state.alertFilter = this.dataset.alertFilter;
    renderAlerts();
  });
});

$('clearAlertsBtn').addEventListener('click', async () => {
  const pend = alerts.filter(a => !a.read).length;
  alerts.forEach(a => { a.read = true; });
  renderAlerts();
  if (backendConnected) {
    try {
      await api.markAllAlertsRead();
    } catch (e) {
      console.warn('API mark read error:', e);
    }
  }
  toast(pend ? pend + ' alertas marcadas como leídas' : 'No había alertas pendientes', 'ok');
});

$('newAlertBtn').addEventListener('click', async () => {
  const bus = pick(buses);
  const plantillas = [
    { type: 'warning', icon: '⛽', title: 'Combustible bajo', desc: `${bus.id} al ${randInt(8, 18)}% de combustible.` },
    { type: 'critical', icon: '🚨', title: 'Frenado brusco detectado', desc: `${bus.id} registró una desaceleración fuerte cerca de ${pick(STOPS).name}.` },
    { type: 'info', icon: '📍', title: 'Desvío de ruta', desc: `${bus.id} se apartó del trazado de la Ruta ${bus.route.id} por obras en la vía.` },
    { type: 'warning', icon: '👥', title: 'Unidad al límite', desc: `${bus.id} viaja con ${bus.capacity} de ${bus.capacity} asientos ocupados.` },
  ];
  const t = pick(plantillas);

  if (backendConnected) {
    try {
      const created = await api.createAlert({
        type: t.type,
        icon: t.icon,
        title: t.title,
        desc: t.desc,
        bus: bus.id,
      });
      alerts.unshift(created);
      renderAlerts();
      addNotification(t.icon, `<strong>${t.title}:</strong> ${bus.id}`);
      toast('Nueva alerta registrada en backend', 'warn');
      return;
    } catch (e) {
      console.warn('Error creating alert in API:', e);
    }
  }

  alerts.unshift({ id: Date.now(), ...t, bus: bus.id, time: 'ahora mismo', read: false });
  if (alerts.length > 20) alerts.pop();
  renderAlerts();
  addNotification(t.icon, `<strong>${t.title}:</strong> ${bus.id}`);
  toast('Nueva alerta registrada', 'warn');
});
 
function renderDrivers() {
  $('driversGrid').innerHTML = DRIVERS.map((d, i) => {
    const bus = buses.find(b => b.driver.id === d.id && b.status !== 'stopped');
    const color = ROUTES[i % ROUTES.length].color;
    return `
    <article class="driver-card" data-driver="${esc(d.name)}" role="button" tabindex="0">
      <div class="driver-top">
        <span class="driver-avatar" style="background:linear-gradient(135deg,${color},${color}99)">${d.initials}</span>
        <div>
          <p class="driver-name">${esc(d.name)}</p>
          <p class="driver-license">${d.license}</p>
          <p style="margin-top:5px">
            ${bus ? `<span class="status-badge status-active">En servicio · ${bus.id}</span>`
                  : '<span class="status-badge status-stopped">Sin asignar</span>'}
          </p>
        </div>
      </div>
      <div class="driver-stats">
        <div><p class="driver-stat-val">${fmt(d.trips)}</p><p class="driver-stat-lbl">Viajes</p></div>
        <div><p class="driver-stat-val">${String(d.hours).replace('.', ',')} h</p><p class="driver-stat-lbl">Turno hoy</p></div>
        <div><p class="driver-stat-val"><span class="stars">★</span> ${String(d.rating).replace('.', ',')}</p><p class="driver-stat-lbl">Calificación</p></div>
      </div>
    </article>`;
  }).join('');
}
 
/* ---------- Reportes ---------- */
 
$('generateReportBtn').addEventListener('click', () => {
  const total = buses.length;
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  const pasajeros = buses.reduce((s, b) => s + b.passengers, 0);
  const ocupacion = Math.round((pasajeros / buses.reduce((s, b) => s + b.capacity, 0)) * 100);
  const retraso = buses.reduce((s, b) => s + b.delay, 0) / total;
  const taller = buses.filter(b => b.status === 'maintenance').length;
  const combustibleBajo = buses.filter(b => b.fuel < 20).length;
  const ahora = new Date();
 
  const box = $('reportSummary');
  box.hidden = false;
  box.innerHTML = `
    <h3>Reporte de operación</h3>
    <p class="stamp">Generado el ${ahora.toLocaleDateString('es-CR')} a las ${ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</p>
    <div class="summary-grid">
      <div class="summary-cell"><b>${circulando}/${total}</b><span>Buses circulando</span></div>
      <div class="summary-cell"><b>${pasajeros}</b><span>Pasajeros a bordo</span></div>
      <div class="summary-cell"><b>${ocupacion}%</b><span>Ocupación media</span></div>
      <div class="summary-cell"><b>${retraso.toFixed(1).replace('.', ',')} min</b><span>Retraso promedio</span></div>
      <div class="summary-cell"><b>${taller}</b><span>En mantenimiento</span></div>
      <div class="summary-cell"><b>${combustibleBajo}</b><span>Combustible bajo 20%</span></div>
    </div>`;
  if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('Reporte generado con los datos actuales', 'ok');
});
 
$('printReportBtn').addEventListener('click', () => {
  if ($('reportSummary').hidden) $('generateReportBtn').click();
  toast('Abriendo el diálogo de impresión');
  setTimeout(() => window.print(), 350);
});
 
/* ==========================================================
   MODALES
   ========================================================== */
 
const busModal = $('busModal');
const settingsModal = $('settingsModal');
let lastFocus = null;
 
function openModal(el) {
  lastFocus = document.activeElement;
  el.classList.add('open');
  const btn = el.querySelector('.modal-close');
  if (btn) btn.focus();
}
function closeModal(el) {
  el.classList.remove('open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
 
function fillBusModal(b) {
  $('modalBusTitle').textContent = b.id;
  $('modalBusSubtitle').textContent = `Ruta ${b.route.id} · ${b.route.name} · ${statusLabel(b.status)}`;
  const icon = $('modalBusIcon');
  icon.style.background = b.route.color + '22';
  icon.style.color = b.route.color;
  icon.textContent = b.num;
 
  $('modalSpeed').textContent = b.speed + ' km/h';
  $('modalPassengers').textContent = b.passengers + '/' + b.capacity;
 
  const delay = $('modalDelay');
  delay.textContent = b.delay > 0 ? '+' + b.delay + ' min' : 'En tiempo';
  delay.style.color = b.delay > 0 ? cssVar('--warn') : cssVar('--ok');
 
  const fuel = $('modalFuel');
  fuel.textContent = b.fuel + '%';
  fuel.style.color = b.fuel < 20 ? cssVar('--risk') : '';
 
  $('modalDriver').textContent = b.driver.name;
  $('modalPlate').textContent = b.plate;
  $('modalNextStop').textContent = b.nextStop;
  $('modalETA').textContent = b.etaMin ? b.etaMin + ' min' : '—';
 
  const statusSelect = $('modalStatusSelect');
  statusSelect.value = b.status;
  statusSelect.className = 'status-select-lg status-' + b.status;
}
 
function openBusModal(busId) {
  const b = buses.find(x => x.id === busId);
  if (!b) return;
  // Se guarda en una propiedad de JS, no como atributo del DOM: si fuera
  // data-bus en el propio modal, closest('[data-bus]') encontraría al
  // contenedor entero y cualquier clic adentro (cerrar, rastrear, contactar)
  // reabriría el modal en vez de dejarlo cerrar.
  busModal.currentBusId = b.id;
  fillBusModal(b);
  openModal(busModal);
}
 
$('modalClose').addEventListener('click', () => closeModal(busModal));
$('settingsClose').addEventListener('click', () => closeModal(settingsModal));
[busModal, settingsModal].forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
});
 
$('trackBusBtn').addEventListener('click', () => {
  const id = busModal.currentBusId;
  closeModal(busModal);
  focusBus(id);
});
 
$('contactDriverBtn').addEventListener('click', () => {
  const b = buses.find(x => x.id === busModal.currentBusId);
  if (b) toast('Llamando a ' + b.driver.name + ' (' + b.id + ')…');
});
 
$('modalStatusSelect').addEventListener('change', async function () {
  const b = buses.find(x => x.id === busModal.currentBusId);
  if (!b) return;
  const newStatus = this.value;
  applyBusStatus(b, newStatus);
  fillBusModal(b);
  refreshAfterStatusChange(b);

  if (backendConnected) {
    try {
      await api.updateBusStatus(b.id, newStatus);
    } catch (e) {
      console.warn('Failed to update status in backend:', e);
    }
  }

  toast('Estado de ' + b.id + ' actualizado a ' + statusLabel(b.status), 'ok');
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (busModal.classList.contains('open')) closeModal(busModal);
  if (settingsModal.classList.contains('open')) closeModal(settingsModal);
  $('notifDropdown').classList.remove('open');
  $('notifBtn').setAttribute('aria-expanded', 'false');
  closeSidebar();
});
 
// Con el menú principal abierto, Escape no hace nada: ya es la pantalla de inicio.
 
/* ---------- Preferencias ---------- */
 
function buildAccentPicker() {
  $('accentPicker').innerHTML = ACCENTS.map(a => `
    <button class="accent-dot ${prefs.accent === a.id ? 'selected' : ''}"
            data-accent="${a.id}" style="background:${a.swatch}"
            title="${a.label}" aria-label="Acento ${a.label}"></button>`).join('');
}
 
$('accentPicker').addEventListener('click', e => {
  const dot = e.target.closest('[data-accent]');
  if (!dot) return;
  prefs.accent = dot.dataset.accent;
  applyPrefs();
  savePrefs();
  buildAccentPicker();
  paintStaticMapLayers();
  redrawAll();
  drawMapMarkers(true);
  renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'routes') renderRoutes();
  if (state.view === 'drivers') renderDrivers();
  toast('Acento actualizado');
});
 
function bindSwitch(id, onChange) {
  const el = $(id);
  el.addEventListener('click', () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', String(next));
    onChange(next);
    savePrefs();
  });
}
 
bindSwitch('motionSwitch', v => {
  prefs.motion = v;
  toast(v ? 'Movimiento activado' : 'Movimiento en pausa');
});
bindSwitch('liveSwitch', v => {
  prefs.live = v;
  syncLiveIndicator();
});
bindSwitch('densitySwitch', v => {
  prefs.density = v ? 'compact' : 'normal';
  applyPrefs();
  setTimeout(redrawAll, 220);
});
 
$('resetDataBtn').addEventListener('click', () => {
  buses = generateBuses(12);
  state.highlightBus = null;
  stopTracking();
  refreshCounters();
  renderBusList();
  renderFleet();
  renderMapBusList();
  drawMapMarkers(true);
  if (state.view === 'routes') renderRoutes();
  toast('Flota regenerada con datos nuevos', 'ok');
});
 
function openSettings() {
  $('motionSwitch').setAttribute('aria-checked', String(prefs.motion));
  $('liveSwitch').setAttribute('aria-checked', String(prefs.live));
  $('densitySwitch').setAttribute('aria-checked', String(prefs.density === 'compact'));
  buildAccentPicker();
  openModal(settingsModal);
}
 
$('settingsBtn').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
$('userProfile').addEventListener('click', openSettings);
$('userProfile').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); }
});
 
/* ==========================================================
   8. NOTIFICACIONES Y AVISOS
   ========================================================== */
 
const notifs = [
  { icon: '🚨', msg: '<strong>Crítica:</strong> BUS-011 con temperatura de motor elevada', time: 'hace 3 min', unread: true },
  { icon: '⚠️', msg: '<strong>Retraso:</strong> BUS-007 va +8 min en Ruta B', time: 'hace 8 min', unread: true },
  { icon: '⛽', msg: '<strong>Combustible bajo:</strong> BUS-004 al 15%', time: 'hace 15 min', unread: true },
  { icon: '✅', msg: 'BUS-001 completó la Ruta A con 48 pasajeros', time: 'hace 22 min', unread: false },
  { icon: '📊', msg: 'Reporte diario generado: 2.847 pasajeros', time: 'hace 32 min', unread: false },
];
 
function renderNotifs() {
  const list = $('notifList');
  if (!notifs.length) {
    list.innerHTML = '<p class="empty-state">Sin notificaciones</p>';
  } else {
    list.innerHTML = notifs.map((n, i) => `
      <div class="notif-item ${n.unread ? 'unread' : ''}" data-notif="${i}">
        <span class="notif-icon">${n.icon}</span>
        <span style="flex:1">
          <span class="notif-msg">${n.msg}</span>
          <span class="notif-time">${n.time}</span>
        </span>
      </div>`).join('');
  }
  $('notifDot').classList.toggle('hidden', !notifs.some(n => n.unread));
}
 
function addNotification(icon, msg) {
  notifs.unshift({ icon, msg, time: 'ahora mismo', unread: true });
  if (notifs.length > 12) notifs.pop();
  renderNotifs();
}
 
const notifBtn = $('notifBtn');
const notifDropdown = $('notifDropdown');
 
notifBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = notifDropdown.classList.toggle('open');
  notifBtn.setAttribute('aria-expanded', String(open));
});
 
notifDropdown.addEventListener('click', e => {
  const item = e.target.closest('[data-notif]');
  if (!item) return;
  notifs[+item.dataset.notif].unread = false;
  renderNotifs();
});
 
$('clearNotifsBtn').addEventListener('click', e => {
  e.stopPropagation();
  notifs.length = 0;
  renderNotifs();
  toast('Notificaciones limpiadas', 'ok');
});
 
document.addEventListener('click', e => {
  if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
    notifDropdown.classList.remove('open');
    notifBtn.setAttribute('aria-expanded', 'false');
  }
  const bar = document.querySelector('.search-bar');
  if (bar.classList.contains('mobile-open')
      && !bar.contains(e.target) && !$('mobileSearchBtn').contains(e.target)) {
    bar.classList.remove('mobile-open');
  }
});
 
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  $('toastStack').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}
 
/* ---------- Búsqueda global y menú de búsqueda en celular ---------- */
 
$('globalSearch').addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const q = this.value.trim();
  if (!q) return;
  navigate('fleet');
  $('fleetSearch').value = q;
  $('statusFilter').value = '';
  $('routeFilter').value = '';
  renderFleet();
  const n = visibleBuses().length;
  toast(n ? n + ' resultados para "' + q + '"' : 'Sin resultados para "' + q + '"', n ? 'ok' : 'warn');
});
 
$('mobileSearchBtn').addEventListener('click', e => {
  e.stopPropagation();
  const bar = document.querySelector('.search-bar');
  bar.classList.toggle('mobile-open');
  if (bar.classList.contains('mobile-open')) $('globalSearch').focus();
});
 
/* ---------- Delegación general de clics ---------- */
 
document.addEventListener('click', e => {
  // Los botones dentro de un modal (cerrar, rastrear, contactar) ya
  // tienen su propio listener. Si un modal llegara a tener data-bus,
  // data-route, etc. en el contenedor, esto evita que closest() suba
  // hasta él y vuelva a disparar una acción de apertura.
  if (e.target.closest('.modal-overlay')) return;
 
  const track = e.target.closest('[data-track]');
  if (track) { focusBus(track.dataset.track); return; }
 
  const route = e.target.closest('[data-route]');
  if (route) { openRoute(route.dataset.route); return; }
 
  const driver = e.target.closest('[data-driver]');
  if (driver) {
    navigate('fleet');
    $('fleetSearch').value = driver.dataset.driver;
    $('statusFilter').value = '';
    $('routeFilter').value = '';
    renderFleet();
    toast('Buses asignados a ' + driver.dataset.driver);
    return;
  }
 
  const bus = e.target.closest('[data-bus]');
  if (bus) openBusModal(bus.dataset.bus);
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (!t.closest) return;
  const el = t.closest('[data-bus], [data-route], [data-driver]');
  if (el && el.getAttribute('tabindex') === '0') {
    e.preventDefault();
    el.click();
  }
});
 
/* ==========================================================
   GRÁFICOS (canvas)
   ========================================================== */
 
// Ajusta el canvas a su contenedor y a la densidad de la pantalla.
function fitCanvas(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const w = Math.max(160, parent.clientWidth - getInnerPadding(parent));
  const h = cssHeight;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
 
function getInnerPadding(el) {
  const cs = getComputedStyle(el);
  return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
}
 
// roundRect no existe en Safari antiguo ni en varios navegadores móviles.
function bar(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h));
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}
 
function drawSparkline(id, data, color) {
  const canvas = $(id);
  if (!canvas || !canvas.offsetParent) return;
  const dpr = window.devicePixelRatio || 1;
  const w = 80, h = 40;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
 
  const max = Math.max(...data), min = Math.min(...data), range = (max - min) || 1;
  const pt = (v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 5) - 2.5 });
  const trace = () => data.forEach((v, i) => { const p = pt(v, i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
 
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  ctx.beginPath(); trace();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
 
  ctx.beginPath(); trace();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}
 
function drawSparklines() {
  drawSparkline('sparkline1', [32, 35, 34, 36, 37, 35, 38], cssVar('--brand-500'));
  drawSparkline('sparkline2', [10, 11, 11, 12, 11, 12, 12], cssVar('--route-c'));
  drawSparkline('sparkline3', [2100, 2300, 1980, 2600, 2400, 2750, 2847], cssVar('--ok'));
  drawSparkline('sparkline4', [3.1, 2.9, 3.2, 2.7, 2.5, 2.4, 2.3], cssVar('--warn'));
}
 
const CHART_DATA = {
  day: {
    labels: ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
    values: [120, 245, 380, 420, 310, 290, 350, 430, 490, 520, 480, 390, 280],
    caption: 'Pasajeros por hora, jornada de hoy.',
  },
  week: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    values: [2400, 2610, 2530, 2780, 3100, 1980, 1450],
    caption: 'Pasajeros por día, últimos 7 días.',
  },
  month: {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    values: [16800, 17400, 16950, 18200],
    caption: 'Pasajeros por semana, últimas 4 semanas.',
  },
};
 
function drawMainChart() {
  const canvas = $('mainChart');
  if (!canvas || !canvas.offsetParent) return;
  const { ctx, w, h } = fitCanvas(canvas, 180);
  const { labels, values, caption } = CHART_DATA[state.chartPeriod];
  $('chartCaption').textContent = caption + ' Total: ' + fmt(values.reduce((a, b) => a + b, 0)) + '.';
 
  const max = Math.max(...values);
  const padL = 46, padR = 10, padT = 10, padB = 26;
  const cw = w - padL - padR, ch = h - padT - padB;
  const slot = cw / values.length;
  const bw = Math.max(5, slot * 0.58);
 
  ctx.strokeStyle = 'rgba(148,163,200,0.13)';
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, sans-serif';
  [0, 0.25, 0.5, 0.75, 1].forEach(p => {
    const y = Math.round(padT + ch - p * ch) + 0.5;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y); ctx.stroke();
    ctx.fillStyle = cssVar('--text-soft');
    ctx.textAlign = 'right';
    ctx.fillText(fmt(Math.round(max * p)), padL - 7, y + 3.5);
  });
 
  const c1 = cssVar('--brand-500'), c2 = cssVar('--brand-alt');
  values.forEach((v, i) => {
    const x = padL + i * slot + (slot - bw) / 2;
    const bh = Math.max(2, (v / max) * ch);
    const y = padT + ch - bh;
    const g = ctx.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    bar(ctx, x, y, bw, bh, 3);
 
    ctx.fillStyle = cssVar('--text-soft');
    ctx.textAlign = 'center';
    if (slot > 30 || i % 2 === 0) ctx.fillText(labels[i], x + bw / 2, padT + ch + 15);
  });
}
 
$$('.period-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    $$('.period-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.chartPeriod = this.dataset.period;
    drawMainChart();
  });
});
 
function drawReportCharts() {
  // Eficiencia por ruta
  const c1 = $('reportChart1');
  if (c1 && c1.offsetParent) {
    const { ctx, w, h } = fitCanvas(c1, 200);
    const vals = ROUTES.map(r => {
      const s = routeStats(r);
      return Math.max(40, Math.round(100 - s.retraso * 6));
    });
    const slot = w / ROUTES.length, bw = slot * 0.46;
    ctx.font = 'bold 12px Inter, sans-serif';
    vals.forEach((v, i) => {
      const x = i * slot + (slot - bw) / 2;
      const bh = (v / 100) * (h - 48);
      const y = h - bh - 24;
      const color = ROUTES[i].color;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, color); g.addColorStop(1, color + '55');
      ctx.fillStyle = g; bar(ctx, x, y, bw, bh, 4);
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText(v + '%', x + bw / 2, y - 7);
      ctx.fillStyle = cssVar('--text-soft'); ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Ruta ' + ROUTES[i].id, x + bw / 2, h - 7);
      ctx.font = 'bold 12px Inter, sans-serif';
    });
  }
 
  // Dona de pasajeros por ruta
  const c2 = $('reportChart2');
  if (c2 && c2.offsetParent) {
    const { ctx, w, h } = fitCanvas(c2, 200);
    const vals = ROUTES.map(r => routeStats(r).pasajeros);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 16, ri = r * 0.58;
    let start = -Math.PI / 2;
    vals.forEach((v, i) => {
      const ang = (v / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + ang); ctx.closePath();
      ctx.fillStyle = ROUTES[i].color; ctx.fill();
      start += ang;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2);
    ctx.fillStyle = cssVar('--bg-card'); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = cssVar('--text-strong'); ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(fmt(total), cx, cy + 3);
    ctx.fillStyle = cssVar('--text-soft'); ctx.font = '10px Inter, sans-serif';
    ctx.fillText('a bordo ahora', cx, cy + 18);
  }
 
  // Línea de retrasos
  const c3 = $('reportChart3');
  if (c3 && c3.offsetParent) {
    const { ctx, w, h } = fitCanvas(c3, 160);
    const data = [3.5, 3.1, 2.9, 3.3, 2.8, 3.0, 2.6, 2.7, 2.4, 2.5, 2.3, 2.4, 2.2, 2.3,
      2.1, 2.4, 2.2, 2.0, 2.3, 2.1, 2.4, 2.3, 2.1, 2.3, 2.2, 2.0, 2.3, 2.1];
    const pad = 34, cw = w - pad * 2, ch = h - pad * 2;
    const max = Math.max(...data), min = 1.5, range = max - min;
    ctx.font = '10px Inter, sans-serif';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const y = Math.round(pad + ch - p * ch) + 0.5;
      ctx.strokeStyle = 'rgba(148,163,200,0.13)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + cw, y); ctx.stroke();
      ctx.fillStyle = cssVar('--text-soft'); ctx.textAlign = 'right';
      ctx.fillText((min + range * p).toFixed(1).replace('.', ',') + ' m', pad - 6, y + 3.5);
    });
 
    const pt = (v, i) => ({ x: pad + (i / (data.length - 1)) * cw, y: pad + ch - ((v - min) / range) * ch });
    const trace = () => data.forEach((v, i) => { const p = pt(v, i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    const line = cssVar('--route-c');
 
    const g = ctx.createLinearGradient(0, pad, 0, pad + ch);
    g.addColorStop(0, line + '55'); g.addColorStop(1, line + '00');
    ctx.beginPath(); trace();
    ctx.lineTo(pad + cw, pad + ch); ctx.lineTo(pad, pad + ch); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
 
    ctx.beginPath(); trace();
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  }
}
 
function redrawAll() {
  drawSparklines();
  drawMainChart();
  if (state.view === 'reports') drawReportCharts();
  if (realLeafletMap) {
    try { realLeafletMap.invalidateSize({ animate: false }); } catch (_) {}
  }
}
 
/* ==========================================================
   MENÚ PRINCIPAL (pantalla de entrada)
   ========================================================== */
 
const homeScreen = $('homeScreen');
let homeOpen = true;
let homeTimer = null;
 
// Cada azulejo muestra un dato vivo para que el menú no sea solo decoración.
function updateHomeChips() {
  if (!homeOpen) return;
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  const pendientes = alerts.filter(a => !a.read).length;
  const pasajeros = buses.reduce((s, b) => s + b.passengers, 0);
 
  $('chipDashboard').textContent = circulando + '/' + buses.length;
  $('chipFleet').textContent = buses.length + ' buses';
  $('chipRoutes').textContent = ROUTES.length + ' rutas';
  $('chipAlerts').textContent = pendientes ? pendientes + ' nuevas' : 'al día';
  $('chipReports').textContent = fmt(pasajeros);
  $('chipDrivers').textContent = DRIVERS.length;
 
  $('homeStatus').textContent = circulando
    ? circulando + ' de ' + buses.length + ' unidades en circulación'
    : 'Ninguna unidad en circulación';
}
 
function showHome() {
  clearTimeout(homeTimer);
  homeOpen = true;
  homeScreen.classList.remove('hidden', 'closing');
  document.body.style.overflow = 'hidden';
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $('nav-home').classList.add('active');
  updateHomeChips();
  // Reinicia la animación escalonada de los azulejos
  $$('.home-tile').forEach(t => {
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
  });
  const first = homeScreen.querySelector('.home-tile');
  if (first) first.focus({ preventScroll: true });
}
 
function hideHome() {
  if (!homeOpen) return;
  homeOpen = false;
  homeScreen.classList.add('closing');
  document.body.style.overflow = '';
  homeTimer = setTimeout(() => {
    homeScreen.classList.add('hidden');
    homeScreen.classList.remove('closing');
  }, 340);
}
 
$$('.home-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const view = tile.dataset.go;
    hideHome();
    navigate(view);
    // Los canvas se dibujan mal si el contenedor todavía está oculto
    requestAnimationFrame(() => setTimeout(redrawAll, 60));
  });
});
 
$('nav-home').addEventListener('click', showHome);
$('nav-home').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});
$('logoHome').addEventListener('click', showHome);
$('logoHome').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});
 
/* ==========================================================
   9. CICLO DE VIDA
   ========================================================== */
 
function refreshCounters() {
  const circulando = buses.filter(b => b.status === 'active' || b.status === 'delayed').length;
  $('activeCount').textContent = circulando;
  $('routeCount').textContent = ROUTES.length;
  $('fleetCountBadge').textContent = buses.length;
  const pendientes = alerts.filter(a => !a.read).length;
  const badge = $('alertsCountBadge');
  badge.textContent = pendientes;
  badge.style.display = pendientes ? '' : 'none';
 
  const retraso = buses.reduce((s, b) => s + b.delay, 0) / (buses.length || 1);
  $('avgDelay').innerHTML = retraso.toFixed(1).replace('.', ',') + '<small>min</small>';
 
  updateHomeChips();
}
 
function syncLiveIndicator() {
  const el = $('liveToggle');
  el.classList.toggle('paused', !prefs.live);
  el.setAttribute('aria-pressed', String(prefs.live));
  $('liveLabel').textContent = prefs.live ? 'Actualizando' : 'En pausa';
}
 
$('liveToggle').addEventListener('click', () => {
  prefs.live = !prefs.live;
  syncLiveIndicator();
  savePrefs();
  toast(prefs.live ? 'Actualización automática activada' : 'Actualización automática en pausa');
});
 
$('expandMapBtn').addEventListener('click', () => navigate('map'));
$('trackingStopBtn').addEventListener('click', () => stopTracking('Dejaste de seguir el bus'));
 
function updateLiveData() {
  if (!prefs.live) return;
  if (backendConnected) return;
  buses.forEach(b => {
    if (b.status !== 'active' && b.status !== 'delayed') return;
    b.passengers = Math.max(0, Math.min(b.capacity, b.passengers + randInt(-3, 3)));
    b.speed = Math.max(16, Math.min(66, b.speed + randInt(-5, 5)));
    b.updatedAgo = 1;
    if (Math.random() < 0.12) b.nextStop = pick(STOPS).name;
    if (Math.random() < 0.08) b.fuel = Math.max(5, b.fuel - 1);
  });
  refreshCounters();
  if (state.view === 'dashboard') renderBusList();
  if (state.view === 'fleet') renderFleet();
  if (state.view === 'map') renderMapBusList();
  if (state.view === 'routes') renderRoutes();
}
 
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    redrawAll();
    if (!isMobile()) closeSidebar();
  }, 160);
});

function init() {
  // ------------------------------------------------------------------
  // HAPTIC FEEDBACK & SHARE HELPERS
  // ------------------------------------------------------------------
  function hapticFeedback(pattern = 10) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  // Bind haptics to all buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => hapticFeedback(8));
  });

  // ------------------------------------------------------------------
  // DYNAMIC PAGE META TITLES & DESCRIPTIONS
  // ------------------------------------------------------------------
  const pageMetaMap = {
    dashboard: { title: 'Panel Principal — BusTrack Pro', desc: 'Resumen en tiempo real del estado de la flota, mapa interactivo y métricas.' },    map: { title: 'Mapa en Vivo — BusTrack Pro', desc: 'Seguimiento satelital y mapa esquemático de todas las unidades en circulación.' },
    fleet: { title: 'Gestión de Flota — BusTrack Pro', desc: 'Tabla completa de unidades, conductores asignados, estados y exportación CSV.' },
    routes: { title: 'Rutas Operativas — BusTrack Pro', desc: 'Detalle de trazados, paradas e indicadores por recorrido.' },
    alerts: { title: 'Centro de Alertas — BusTrack Pro', desc: 'Alertas críticas, advertencias y avisos del sistema en tiempo real.' },
    reports: { title: 'Reportes y Analíticas — BusTrack Pro', desc: 'Gráficos de eficiencia, volumen de pasajeros y tiempos de retraso.' },
    drivers: { title: 'Directorio de Conductores — BusTrack Pro', desc: 'Turnos, calificaciones y asignación de buses por conductor.' }
  };

  const originalNavigate = navigate;
  navigate = function(viewName) {
    originalNavigate(viewName);
    if (pageMetaMap[viewName]) {
      document.title = pageMetaMap[viewName].title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = pageMetaMap[viewName].desc;
    }
  };
  switchView = function(viewName) {
    return navigate(viewName);
  };

  // ------------------------------------------------------------------
  // AUTHENTICATION & LANDING GATE LOGIC (Email, Google, Apple via Supabase)
  // ------------------------------------------------------------------

  // ── Supabase client (singleton) ──────────────────────────────────────
  const SUPABASE_URL      = 'https://tbkgtblucdzkazpwlwda.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2d0Ymx1Y2R6a2F6cHdsd2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjEzMDIsImV4cCI6MjEwNjE5NzMwMn0.-l_2o1G4eb3bhDgknHLH7SSx1IobaC-9jbVTTwBmkfM';
  const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // ── Session state ────────────────────────────────────────────────────
  let currentUser    = null;
  let isGuestSession = false;

  // Restore persisted session from localStorage on cold start
  try {
    const saved = localStorage.getItem('bustrack_user');
    if (saved) currentUser = JSON.parse(saved);
    if (sessionStorage.getItem('bustrack_guest') === 'true') isGuestSession = true;
  } catch (_) {}

  // ── UI helpers ───────────────────────────────────────────────────────
  /** Show/hide auth vs. profile sections consistently */
  function updateAuthUserUI() {
    const sidebarAuthBox = $('sidebarAuthBox');
    const sidebarUserBox = $('sidebarUserBox');
    const avatarSlot     = $('userAvatarSlot');
    const nameSlot       = $('userNameSlot');
    const roleSlot       = $('userRoleSlot');
    const activeBox      = $('userProfileActiveBox');
    const loginFormEl    = $('loginForm');
    const regFormEl      = $('registerForm');
    const oauthBox       = document.querySelector('.oauth-buttons-container');
    const divider        = document.querySelector('.auth-divider');
    const authTabsEl     = document.querySelector('.auth-tabs');

    if (currentUser) {
      // ── Logged-in state ──
      if (sidebarAuthBox) { sidebarAuthBox.hidden = true;  sidebarAuthBox.style.display = 'none'; }
      if (sidebarUserBox) { sidebarUserBox.hidden = false; sidebarUserBox.style.display = 'flex'; }

      const initials = (currentUser.name || 'U')
        .split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase();
      if (avatarSlot) avatarSlot.textContent = initials;
      if (nameSlot)   nameSlot.textContent   = currentUser.name || 'Usuario';
      if (roleSlot)   roleSlot.textContent   = currentUser.role === 'admin' ? 'Administrador' : 'Operador';

      if (activeBox) {
        activeBox.hidden = false;
        const activeAvatar = $('userActiveAvatar');
        const activeName   = $('userActiveName');
        const activeEmail  = $('userActiveEmail');
        const activeBadge  = $('userActiveBadge');
        if (activeAvatar) activeAvatar.src = currentUser.avatarUrl
          || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name || 'U')}`;
        if (activeName)  activeName.textContent  = currentUser.name || '';
        if (activeEmail) activeEmail.textContent = currentUser.email || '';
        const providerLabel = (currentUser.provider || 'email').toUpperCase();
        if (activeBadge) activeBadge.textContent = `Cuenta ${providerLabel} · ${currentUser.role || 'admin'}`;
      }

      if (loginFormEl)  loginFormEl.hidden = true;
      if (regFormEl)    regFormEl.hidden   = true;
      if (oauthBox)     oauthBox.style.display = 'none';
      if (divider)      divider.style.display  = 'none';
      if (authTabsEl)   authTabsEl.style.display = 'none';
    } else {
      // ── Logged-out state ──
      if (sidebarAuthBox) { sidebarAuthBox.hidden = false; sidebarAuthBox.style.display = 'flex'; }
      if (sidebarUserBox) { sidebarUserBox.hidden = true;  sidebarUserBox.style.display = 'none'; }
      if (activeBox)    activeBox.hidden = true;
      if (oauthBox)     oauthBox.style.display = 'flex';
      if (divider)      divider.style.display  = '';
      if (authTabsEl)   authTabsEl.style.display = 'grid';

      // Show whichever tab form is currently active
      const isRegTab = $('tabRegister')?.classList.contains('active');
      if (loginFormEl) loginFormEl.hidden = !!isRegTab;
      if (regFormEl)   regFormEl.hidden   = !isRegTab;
    }
  }
  updateAuthUserUI();

  // ── Form inline validation ───────────────────────────────────────────
  function setFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.toggle('input-error', !!message);
    let hint = inputEl.parentElement.querySelector('.field-error-hint');
    if (message) {
      if (!hint) {
        hint = document.createElement('span');
        hint.className = 'field-error-hint';
        inputEl.parentElement.appendChild(hint);
      }
      hint.textContent = message;
    } else if (hint) {
      hint.remove();
    }
  }

  function clearFieldErrors(...ids) {
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.classList.remove('input-error');
      const hint = el.parentElement?.querySelector('.field-error-hint');
      if (hint) hint.remove();
    });
  }

  // ── Password strength meter ──────────────────────────────────────────
  function scorePassword(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-5
  }

  function renderPasswordStrength(inputId, barId) {
    const input = $(inputId);
    const bar   = $(barId);
    if (!input || !bar) return;
    input.addEventListener('input', () => {
      const score = scorePassword(input.value);
      const labels = ['', 'Muy débil', 'Débil', 'Moderada', 'Fuerte', 'Muy fuerte'];
      const colors = ['', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60'];
      bar.style.width  = `${(score / 5) * 100}%`;
      bar.style.background = colors[score] || '#ccc';
      bar.title = labels[score] || '';
    });
  }

  // Inject password strength bar into the register form
  const regPasswordInput = $('regPassword');
  if (regPasswordInput) {
    const wrapper = regPasswordInput.parentElement;
    const barWrapper = document.createElement('div');
    barWrapper.className = 'pw-strength-track';
    barWrapper.innerHTML = '<div id="pwStrengthBar" class="pw-strength-bar"></div>';
    wrapper.appendChild(barWrapper);
    renderPasswordStrength('regPassword', 'pwStrengthBar');
  }

  // ── Supabase session helpers ─────────────────────────────────────────
  /** Build a local currentUser object from a Supabase Auth user record */
  function buildUserFromSupabase(supaUser, extraName) {
    const name = extraName
      || supaUser.user_metadata?.full_name
      || supaUser.user_metadata?.name
      || (supaUser.email ? supaUser.email.split('@')[0] : 'Usuario');
    const provider = supaUser.app_metadata?.provider || supaUser.app_metadata?.providers?.[0] || 'email';
    return {
      id:        supaUser.id,
      email:     supaUser.email,
      name,
      role:      'admin',
      provider,
      avatarUrl: supaUser.user_metadata?.avatar_url
        || supaUser.user_metadata?.picture
        || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    };
  }

  /** Persist user & token, update UI, close modal */
  function finalizeLogin(user, token) {
    currentUser    = user;
    isGuestSession = false;
    localStorage.setItem('bustrack_user', JSON.stringify(currentUser));
    if (token) localStorage.setItem('bustrack_auth_token', token);
    updateAuthUserUI();
    hideHome();
    navigate('dashboard');
    if (authModal) authModal.classList.remove('active');
  }

  /**
   * Called after a successful Supabase OAuth redirect / popup.
   * Tries to sync with our backend; falls back to pure client-side session.
   */
  async function handleSupabaseSession(supaUser) {
    if (!supaUser) return;
    const user = buildUserFromSupabase(supaUser);

    // Try to sync with backend for a signed JWT
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/oauth-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseId: supaUser.id,
          email:      supaUser.email,
          name:       user.name,
          provider:   user.provider,
          avatarUrl:  user.avatarUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          toast(`¡Bienvenido, ${data.user.name}! 🎉`, 'ok');
          finalizeLogin(data.user, data.token);
          return;
        }
      }
    } catch (_) {}

    // Fallback: use Supabase session directly
    const session = (await supabaseClient?.auth.getSession())?.data?.session;
    toast(`¡Bienvenido, ${user.name}! 🎉`, 'ok');
    finalizeLogin(user, session?.access_token || null);
  }

  // Listen for OAuth redirect callback (runs on page load after redirect)
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !currentUser) {
        await handleSupabaseSession(session.user);
      }
    });

    // Restore an existing active Supabase session (e.g. after browser refresh)
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !currentUser) {
        await handleSupabaseSession(session.user);
      }
    });
  }

  // ── Modal open/close controls ────────────────────────────────────────
  const authModal        = $('authModal');
  const authClose        = $('authClose');
  const oauthPromptModal = $('oauthPromptModal');
  const oauthPromptClose = $('oauthPromptClose');
  const sidebarLoginBtn  = $('sidebarLoginBtn');
  const sidebarRegisterBtn = $('sidebarRegisterBtn');
  const authBtn          = $('authBtn');

  function openAuthModal(initialTab = 'login') {
    if (!authModal) return;
    // Reset any lingering error states
    clearFieldErrors('loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPassword');
    authModal.classList.add('active');
    updateAuthUserUI();
    if (initialTab === 'register') {
      $('tabRegister')?.click();
      setTimeout(() => $('regName')?.focus(), 120);
    } else {
      $('tabLogin')?.click();
      setTimeout(() => $('loginEmail')?.focus(), 120);
    }
  }

  if (sidebarLoginBtn) {
    sidebarLoginBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.location.href = '/login';
    });
  }
  if (sidebarRegisterBtn) {
    sidebarRegisterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.location.href = '/register';
    });
  }
  if (authBtn) {
    authBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentUser) {
        window.location.href = '/login';
      } else {
        openAuthModal('login');
      }
    });
  }
  if (authClose)          authClose.addEventListener('click', () => authModal.classList.remove('active'));
  if (oauthPromptClose && oauthPromptModal) {
    oauthPromptClose.addEventListener('click', () => oauthPromptModal.classList.remove('active'));
  }
  // Close auth modal on overlay click
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) authModal.classList.remove('active');
    });
  }

  // ── Tab switching (Login / Register) ─────────────────────────────────
  const tabLogin    = $('tabLogin');
  const tabRegister = $('tabRegister');
  const loginFormEl  = $('loginForm');
  const regFormEl    = $('registerForm');

  function activateTab(tab) {
    const isReg = (tab === 'register');
    if (tabLogin)    { tabLogin.classList.toggle('active', !isReg);  tabLogin.setAttribute('aria-selected',    String(!isReg)); }
    if (tabRegister) { tabRegister.classList.toggle('active', isReg); tabRegister.setAttribute('aria-selected', String(isReg)); }
    if (loginFormEl) loginFormEl.hidden = isReg;
    if (regFormEl)   regFormEl.hidden   = !isReg;
    clearFieldErrors('loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPassword');
  }

  if (tabLogin)    tabLogin.addEventListener('click',    () => activateTab('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => activateTab('register'));

  // ── Loader helpers for submit buttons ───────────────────────────────
  function setBtnLoading(btnId, loading, originalText, loadingText) {
    const btn = $(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? loadingText : originalText;
  }

  // ── LOGIN FORM ───────────────────────────────────────────────────────
  if (loginFormEl) {
    loginFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = ($('loginEmail')?.value   || '').trim();
      const password = ($('loginPassword')?.value || '');
      clearFieldErrors('loginEmail', 'loginPassword');

      // Client-side validation
      if (!email)    { setFieldError($('loginEmail'),    'Ingresá tu correo electrónico.'); return; }
      if (!password) { setFieldError($('loginPassword'), 'Ingresá tu contraseña.'); return; }

      setBtnLoading('loginSubmitBtn', true, 'Iniciar Sesión', 'Verificando...');

      try {
        // 1) Supabase Auth (primary path)
        if (supabaseClient) {
          const { data: supaAuth, error: supaErr } = await supabaseClient.auth.signInWithPassword({ email, password });

          if (supaErr) {
            // Map Supabase error codes to friendly Spanish messages
            const msg = supaErr.message || '';
            if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
              setFieldError($('loginPassword'), 'Correo o contraseña incorrectos.');
            } else if (msg.includes('Email not confirmed')) {
              toast('Debés confirmar tu correo antes de iniciar sesión. Revisá tu bandeja de entrada.', 'warn');
            } else {
              toast(`Error de Supabase: ${msg}`, 'warn');
            }
            setBtnLoading('loginSubmitBtn', false, 'Iniciar Sesión', '');
            return;
          }

          if (supaAuth?.user) {
            let displayName = supaAuth.user.user_metadata?.full_name
              || supaAuth.user.user_metadata?.name
              || email.split('@')[0];

            // Enrich with profile row if available
            try {
              const { data: profile } = await supabaseClient
                .from('users')
                .select('full_name, role, avatar_url')
                .eq('id', supaAuth.user.id)
                .maybeSingle();
              if (profile?.full_name) displayName = profile.full_name;
            } catch (_) {}

            const user = buildUserFromSupabase(supaAuth.user, displayName);
            toast(`¡Bienvenido de nuevo, ${user.name}! 👋`, 'ok');
            finalizeLogin(user, supaAuth.session?.access_token || null);
            setBtnLoading('loginSubmitBtn', false, 'Iniciar Sesión', '');
            return;
          }
        }

        // 2) Backend API fallback (when Supabase SDK not available)
        const res = await api.login(email, password);
        if (res?.status === 'success') {
          toast(`¡Bienvenido de nuevo, ${res.user.name}!`, 'ok');
          finalizeLogin(res.user, res.token);
        } else {
          setFieldError($('loginPassword'), res?.detail || 'Credenciales incorrectas.');
        }
      } catch (err) {
        toast('Error de conexión. Verificá tu internet e intentá de nuevo.', 'warn');
        console.error('[Auth Login]', err);
      } finally {
        setBtnLoading('loginSubmitBtn', false, 'Iniciar Sesión', '');
      }
    });
  }

  // ── REGISTER FORM ────────────────────────────────────────────────────
  if (regFormEl) {
    regFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name     = ($('regName')?.value     || '').trim();
      const email    = ($('regEmail')?.value    || '').trim();
      const password = ($('regPassword')?.value || '');
      const consent  = $('regConsent')?.checked;
      clearFieldErrors('regName', 'regEmail', 'regPassword');

      // Client-side validation
      let valid = true;
      if (!name)  { setFieldError($('regName'),  'Ingresá tu nombre completo.'); valid = false; }
      if (!email) { setFieldError($('regEmail'), 'Ingresá un correo electrónico válido.'); valid = false; }
      if (password.length < 6) { setFieldError($('regPassword'), 'La contraseña debe tener al menos 6 caracteres.'); valid = false; }
      if (!consent) { toast('Debés aceptar los Términos y la Política de Privacidad.', 'warn'); valid = false; }
      if (!valid) return;

      setBtnLoading('registerSubmitBtn', true, 'Crear Cuenta', 'Creando cuenta...');

      try {
        // 1) Supabase Auth signup (primary path)
        if (supabaseClient) {
          const { data: supaReg, error: supaErr } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, name } }
          });

          if (supaErr) {
            const msg = supaErr.message || '';
            if (msg.includes('already registered') || msg.includes('User already registered') || msg.includes('already been registered')) {
              setFieldError($('regEmail'), 'Ya existe una cuenta con este correo.');
            } else if (msg.includes('Password should be')) {
              setFieldError($('regPassword'), 'La contraseña no cumple los requisitos de seguridad.');
            } else {
              toast(`Error de Supabase: ${msg}`, 'warn');
            }
            setBtnLoading('registerSubmitBtn', false, 'Crear Cuenta', '');
            return;
          }

          if (supaReg?.user) {
            // Upsert public profile row (best-effort, non-blocking)
            supabaseClient.from('users').upsert({
              id:            supaReg.user.id,
              email,
              full_name:     name,
              role:          'admin',
              auth_provider: 'email',
              avatar_url:    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
            }, { onConflict: 'id' }).catch(() => {});

            // Supabase may require email confirmation — check if session was immediately created
            if (supaReg.session) {
              const user = buildUserFromSupabase(supaReg.user, name);
              toast(`¡Cuenta creada! Bienvenido, ${user.name} 🚀`, 'ok');
              finalizeLogin(user, supaReg.session.access_token);
              setBtnLoading('registerSubmitBtn', false, 'Crear Cuenta', '');
              return;
            } else {
              // Email confirmation flow
              toast('¡Cuenta creada! Revisá tu correo para confirmar tu cuenta antes de iniciar sesión. 📧', 'ok');
              activateTab('login');
              $('loginEmail') && ($('loginEmail').value = email);
              setBtnLoading('registerSubmitBtn', false, 'Crear Cuenta', '');
              return;
            }
          }
        }

        // 2) Backend API fallback
        const res = await api.register({ name, email, password, consentTerms: true });
        if (res?.status === 'success') {
          toast(`¡Cuenta creada! Bienvenido, ${res.user.name} 🚀`, 'ok');
          finalizeLogin(res.user, res.token);
        } else {
          toast(res?.detail || 'Error al crear la cuenta. Intentá de nuevo.', 'warn');
        }
      } catch (err) {
        toast('Error de conexión. Verificá tu internet e intentá de nuevo.', 'warn');
        console.error('[Auth Register]', err);
      } finally {
        setBtnLoading('registerSubmitBtn', false, 'Crear Cuenta', '');
      }
    });
  }

  // ── OAUTH (Google / Apple) ───────────────────────────────────────────
  async function triggerOAuth(provider) {
    if (!supabaseClient) {
      toast('El SDK de Supabase no está disponible. Recargá la página.', 'warn');
      return;
    }

    const providerName = provider === 'google' ? 'Google' : 'Apple';
    // References to BOTH modal buttons (we may be in authModal or oauthPromptModal)
    const modalBtn = provider === 'google' ? $('googleAuthBtn') : $('appleAuthBtn');
    const origHTML  = modalBtn?.innerHTML;

    const spinnerHTML = `<svg style="animation:spin 0.8s linear infinite;width:18px;height:18px;vertical-align:middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>&nbsp;Conectando...`;
    if (modalBtn) { modalBtn.disabled = true; modalBtn.innerHTML = spinnerHTML; }

    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'google'
            ? { access_type: 'offline', prompt: 'select_account' }
            : {}
        }
      });

      if (error) {
        toast(`No se pudo conectar con ${providerName}: ${error.message}`, 'warn');
        if (modalBtn) { modalBtn.disabled = false; modalBtn.innerHTML = origHTML; }
      }
      // On success the browser navigates away to the provider — no further action needed.
    } catch (err) {
      toast(`Error al conectar con ${providerName}. Intentá de nuevo.`, 'warn');
      if (modalBtn) { modalBtn.disabled = false; modalBtn.innerHTML = origHTML; }
      console.error(`[OAuth ${provider}]`, err);
    }
  }

  const googleAuthBtn = $('googleAuthBtn');
  const appleAuthBtn  = $('appleAuthBtn');
  if (googleAuthBtn) googleAuthBtn.addEventListener('click', () => triggerOAuth('google'));
  if (appleAuthBtn)  appleAuthBtn.addEventListener('click',  () => triggerOAuth('apple'));

  // ── LOGOUT ───────────────────────────────────────────────────────────
  async function performLogout() {
    const name = currentUser?.name || 'Usuario';

    // Sign out from Supabase (clears the session cookie/token)
    if (supabaseClient) {
      try { await supabaseClient.auth.signOut(); } catch (_) {}
    }

    // Clear local state
    currentUser    = null;
    isGuestSession = false;
    localStorage.removeItem('bustrack_user');
    localStorage.removeItem('bustrack_auth_token');
    sessionStorage.removeItem('bustrack_guest');

    toast(`Hasta pronto, ${name}. Sesión cerrada correctamente. 👋`, 'info');
    updateAuthUserUI();
    if (authModal) authModal.classList.remove('active');
  }

  const logoutBtn      = $('logoutBtn');
  const modalLogoutBtn = $('modalLogoutBtn');
  if (logoutBtn)      logoutBtn.addEventListener('click',      performLogout);
  if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', performLogout);




  // ------------------------------------------------------------------
  // COMMAND PALETTE (CTRL + K) LOGIC
  // ------------------------------------------------------------------
  const cmdModal = $('commandPaletteModal');
  const cmdInput = $('cmdInput');
  const cmdResults = $('cmdResults');

  function openCommandPalette() {
    if (cmdModal) {
      cmdModal.classList.add('active');
      if (cmdInput) {
        cmdInput.value = '';
        cmdInput.focus();
      }
    }
  }

  function closeCommandPalette() {
    if (cmdModal) cmdModal.classList.remove('active');
  }

  // Shortcut listeners: Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdModal?.classList.contains('active')) closeCommandPalette();
      else openCommandPalette();
    }
    if (e.key === 'Escape') {
      closeCommandPalette();
      if (authModal) authModal.classList.remove('active');
    }
  });

  // Global search bar focus triggers command palette
  const globalSearch = $('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('click', () => openCommandPalette());
  }

  // Command palette item clicks
  if (cmdResults) {
    cmdResults.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-item');
      if (!item) return;
      const action = item.dataset.action;
      closeCommandPalette();
      if (action === 'go-dashboard') switchView('dashboard');
      else if (action === 'go-map') switchView('map');
      else if (action === 'go-fleet') switchView('fleet');
      else if (action === 'toggle-theme') {
        const motionBtn = $('motionSwitch');
        if (motionBtn) motionBtn.click();
        toast('Preferencia de tema actualizada', 'info');
      }
    });
  }

  // ------------------------------------------------------------------
  // NOTIFICATION DROPDOWN PANEL
  // ------------------------------------------------------------------
  // notifBtn, notifDropdownPanel, notifMarkAllReadBtn ya declarados en scope global


  function renderNotifDropdown() {
    const list = $('notifList');
    if (!list) return;
    const items = alerts.slice(0, 6);
    if (!items.length) {
      list.innerHTML = '<p class="empty-state" style="padding:1rem;font-size:12px">No hay notificaciones pendientes</p>';
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="notif-item">
        <span class="notif-item-icon">${a.type === 'critical' ? '🚨' : a.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <div>
          <div class="notif-item-text"><strong>${esc(a.title)}</strong>: ${esc(a.desc)}</div>
          <span class="notif-item-time">${a.time}</span>
        </div>
      </div>
    `).join('');
  }

  if (notifBtn && notifDropdownPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = notifDropdownPanel.hidden;
      notifDropdownPanel.hidden = !isHidden;
      if (isHidden) renderNotifDropdown();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdownPanel')) {
        if (notifDropdownPanel) notifDropdownPanel.hidden = true;
      }
    });
  }
  if (notifMarkAllReadBtn) {
    notifMarkAllReadBtn.addEventListener('click', () => {
      alerts.forEach(a => a.read = true);
      refreshCounters();
      if (notifDropdownPanel) notifDropdownPanel.hidden = true;
      toast('Notificaciones limpiadas', 'ok');
    });
  }

  // ------------------------------------------------------------------
  // FLEET "AGREGAR BUS" MODAL HANDLERS
  // ------------------------------------------------------------------
  const addBusBtn = $('addBusBtn');
  const addBusModal = $('addBusModal');
  const addBusClose = $('addBusClose');
  const addBusForm = $('addBusForm');

  if (addBusBtn && addBusModal) {
    addBusBtn.addEventListener('click', () => addBusModal.classList.add('active'));
  }
  if (addBusClose && addBusModal) {
    addBusClose.addEventListener('click', () => addBusModal.classList.remove('active'));
  }
  if (addBusForm) {
    addBusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('newBusId').value.trim().toUpperCase();
      const routeId = $('newBusRoute').value;
      const driverId = $('newBusDriver').value;
      const plate = $('newBusPlate').value.trim().toUpperCase();

      const route = ROUTES.find(r => r.id === routeId) || ROUTES[0];
      const driver = DRIVERS.find(d => d.id === driverId) || DRIVERS[0];

      const newBus = {
        id,
        num: id.replace('BUS-', ''),
        route,
        driver,
        plate,
        status: 'active',
        speed: 42,
        passengers: 24,
        capacity: 45,
        delay: 0,
        fuel: 95,
        pos: { x: 200, y: 150 },
        _t: Math.random(),
        _dir: 1,
        _step: 0.002,
        updatedAgo: 0,
        nextStop: STOPS[0].name
      };

      buses.unshift(newBus);
      refreshCounters();
      if (state.view === 'fleet') renderFleet();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'map') renderMapBusList();
      drawMapMarkers(true);

      addBusModal.classList.remove('active');
      addBusForm.reset();
      toast(`Bus ${id} registrado en la flota con éxito`, 'ok');
    });
  }

  // Fleet Reset Filters
  const resetFiltersBtn = $('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      const search = $('fleetSearch');
      const filter = $('routeFilter');
      if (search) search.value = '';
      if (filter) filter.value = '';
      renderFleet();
      toast('Filtros de la flota reiniciados', 'info');
    });
  }

  // ------------------------------------------------------------------
  // DRIVER CONTACT MODAL HANDLERS
  // ------------------------------------------------------------------
  const contactDriverBtn = $('contactDriverBtn');
  const contactModal = $('contactDriverModal');
  const contactClose = $('contactClose');

  if (contactDriverBtn && contactModal) {
    contactDriverBtn.addEventListener('click', () => {
      const bus = buses.find(b => b.id === state.highlightBus) || buses[0];
      $('contactDriverName').textContent = bus.driver.name;
      $('contactDriverBus').textContent = `Asignado a ${bus.id} (Ruta ${bus.route.id})`;
      $('contactDriverInitials').textContent = bus.driver.initials;
      const statusBadge = $('contactDriverStatus');
      if (statusBadge) {
        statusBadge.className = `status-badge status-${bus.status}`;
        statusBadge.textContent = statusLabel(bus.status);
      }
      if ($('busModal')) $('busModal').classList.remove('active');
      contactModal.classList.add('active');
    });
  }
  if (contactClose && contactModal) {
    contactClose.addEventListener('click', () => contactModal.classList.remove('active'));
  }

  const callDriverBtn = $('callDriverBtn');
  const msgDriverBtn = $('msgDriverBtn');
  const dispatchAlertBtn = $('dispatchAlertBtn');

  if (callDriverBtn) {
    callDriverBtn.addEventListener('click', () => {
      toast('📞 Conectando llamada con la cabina del conductor...', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }
  if (msgDriverBtn) {
    msgDriverBtn.addEventListener('click', () => {
      toast('💬 Canal de mensajería enviado al terminal de abordo', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }
  if (dispatchAlertBtn) {
    dispatchAlertBtn.addEventListener('click', () => {
      toast('📡 Alerta de despacho enviada a la pantalla de la unidad', 'ok');
      if (contactModal) contactModal.classList.remove('active');
    });
  }

  // ------------------------------------------------------------------
  // REPORTS VIEW HANDLERS (Print / Generate)
  // ------------------------------------------------------------------
  const printReportBtn = $('printReportBtn');
  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      window.print();
    });
  }
  const generateReportBtn = $('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', () => {
      toast('Generando reporte operativo consolidado...', 'info');
      setTimeout(() => {
        drawReportCharts();
        toast('Reporte de operaciones generado con éxito', 'ok');
      }, 500);
    });
  }

  // ------------------------------------------------------------------
  // ALERTS VIEW HANDLERS (Clear All / Simulate New Alert)
  // ------------------------------------------------------------------
  const clearAlertsBtn = $('clearAlertsBtn');
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', () => {
      alerts.forEach(a => a.read = true);
      refreshCounters();
      if (state.view === 'alerts') renderAlerts();
      toast('Todas las alertas fueron marcadas como leídas', 'ok');
    });
  }
  const newAlertBtn = $('newAlertBtn');
  if (newAlertBtn) {
    newAlertBtn.addEventListener('click', () => {
      const bus = pick(buses);
      const alertTypes = [
        { type: 'warning', icon: '⚠️', title: 'Exceso de velocidad leve', desc: `${bus.id} registró ${bus.speed + 15} km/h en zona urbana.` },
        { type: 'critical', icon: '🚨', title: 'Frenado brusco repentino', desc: `${bus.id} desaceleró bruscamente cerca de ${bus.nextStop}.` },
        { type: 'info', icon: 'ℹ️', title: 'Apertura prolongada de puertas', desc: `${bus.id} mantuvo puertas abiertas durante más de 3 min.` },
      ];
      const newAlert = pick(alertTypes);
      alerts.unshift({
        id: 'ALT-' + Math.floor(Math.random() * 9000 + 1000),
        type: newAlert.type,
        icon: newAlert.icon,
        title: newAlert.title,
        desc: newAlert.desc,
        time: 'ahora mismo',
        read: false
      });
      refreshCounters();
      if (state.view === 'alerts') renderAlerts();
      toast(`Nueva alerta simulada: ${newAlert.title}`, 'warn');
    });
  }

  // ------------------------------------------------------------------
  // SETTINGS MODAL DATA RESET
  // ------------------------------------------------------------------
  const resetDataBtn = $('resetDataBtn');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      buses.forEach(b => {
        b.speed = randInt(25, 55);
        b.passengers = randInt(10, 40);
        b.fuel = randInt(60, 98);
      });
      refreshCounters();
      if (state.view === 'dashboard') renderBusList();
      if (state.view === 'fleet') renderFleet();
      drawMapMarkers(true);
      toast('Datos y métricas de la flota regenerados', 'ok');
    });
  }

  // ------------------------------------------------------------------
  // COOKIE CONSENT BANNER LOGIC
  // ------------------------------------------------------------------
  const cookieBanner = $('cookieConsentBanner');
  const cookieConsentSaved = localStorage.getItem('bustrack_cookie_consent');

  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.setAttribute('hidden', 'true');
    cookieBanner.hidden = true;
    cookieBanner.style.setProperty('display', 'none', 'important');
  }

  if (!cookieConsentSaved && cookieBanner) {
    cookieBanner.removeAttribute('hidden');
    cookieBanner.hidden = false;
    cookieBanner.style.display = 'flex';
  } else if (cookieBanner) {
    hideCookieBanner();
  }

  const cookieAcceptBtn = $('cookieAcceptBtn');
  const cookieRejectBtn = $('cookieRejectBtn');
  if (cookieAcceptBtn) {
    cookieAcceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('bustrack_cookie_consent', 'accepted');
      hideCookieBanner();
      toast('Preferencias de almacenamiento guardadas', 'ok');
    });
  }
  if (cookieRejectBtn) {
    cookieRejectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('bustrack_cookie_consent', 'essential_only');
      hideCookieBanner();
      toast('Solo se usará almacenamiento técnico esencial', 'info');
    });
  }

  // ------------------------------------------------------------------
  // GEOLOCATION MAP ADAPTATION EVENT LISTENERS
  // ------------------------------------------------------------------
  const miniLocBtn = $('locateUserBtnMini');
  const fullLocBtn = $('locateUserBtnFull');
  const recenterBtn = $('recenterUserBtn');
  const geoSwitchBtn = $('geoSwitch');

  if (miniLocBtn) miniLocBtn.addEventListener('click', () => requestUserLocation(true));
  if (fullLocBtn) fullLocBtn.addEventListener('click', () => requestUserLocation(true));
  if (recenterBtn) recenterBtn.addEventListener('click', () => centerMapOnUser(true));

  const savedGeoPref = localStorage.getItem('bustrack_geolocate') === 'true';
  if (geoSwitchBtn) {
    geoSwitchBtn.setAttribute('aria-checked', String(savedGeoPref));
    geoSwitchBtn.addEventListener('click', () => {
      const active = geoSwitchBtn.getAttribute('aria-checked') === 'true';
      const next = !active;
      geoSwitchBtn.setAttribute('aria-checked', String(next));
      localStorage.setItem('bustrack_geolocate', String(next));
      if (next) requestUserLocation(true);
      else {
        userLocationState.active = false;
        updateUserLocationUI();
        toast('Geolocalización desactivada', 'info');
      }
    });
  }

  if (savedGeoPref) {
    setTimeout(() => requestUserLocation(false), 500);
  }
  // ------------------------------------------------------------------
  // MOBILE FLOATING CTA
  // ------------------------------------------------------------------
  const mobileCta = $('mobileFloatingCta');
  if (mobileCta) {
    mobileCta.addEventListener('click', () => {
      // passenger view removed
      hapticFeedback([10, 30, 10]);
    });
  }

  // ------------------------------------------------------------------
  // SCROLL REVEAL OBSERVER
  // ------------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card, .card').forEach(el => {
      el.classList.add('scroll-reveal');
      observer.observe(el);
    });
  }

  // ------------------------------------------------------------------
  setInterval(updateLiveData, 3000);
  setInterval(pushActivity, 9000);
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

 
