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
 
const ROUTES = [
  { id: 'A', name: 'Centro — Aeropuerto',     varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'B', name: 'Norte — Sur',             varName: '--route-b', color: '#7c4ddb', stops: 12, length: 35 },
  { id: 'C', name: 'Este — Centro',           varName: '--route-c', color: '#2aa3c4', stops: 6,  length: 18 },
  { id: 'D', name: 'Sur — Zona Industrial',   varName: '--route-d', color: '#2bb885', stops: 10, length: 28 },
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
];
 
const STATUS_LABELS = {
  active: 'En servicio',
  delayed: 'Retrasado',
  stopped: 'Detenido',
  maintenance: 'Mantenimiento',
};
const STATUS_ORDER = { active: 0, delayed: 1, stopped: 2, maintenance: 3 };
 
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
  if (view === 'map') { renderMapBusList(); drawMapMarkers(true); }
  if (view === 'dashboard') requestAnimationFrame(() => { drawMainChart(); drawSparklines(); });
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
  sidebar.classList.add('mobile-open');
  $('sidebarOverlay').classList.add('open');
  $('mobileMenuBtn').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('mobile-open');
  $('sidebarOverlay').classList.remove('open');
  $('mobileMenuBtn').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
 
$('sidebarToggle').addEventListener('click', function () {
  const collapsed = sidebar.classList.toggle('collapsed');
  this.setAttribute('aria-expanded', String(!collapsed));
  // El ancho del contenido cambió: los canvas necesitan redibujarse.
  setTimeout(redrawAll, 220);
});
$('mobileMenuBtn').addEventListener('click', openSidebar);
$('sidebarOverlay').addEventListener('click', closeSidebar);
 
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
   5. FLOTA
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
      <td><span class="status-badge status-${b.status}">${statusLabel(b.status)}</span></td>
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
 
$('addBusBtn').addEventListener('click', () => {
  const n = buses.length + 1;
  const route = ROUTES[(n - 1) % ROUTES.length];
  buses.push({
    id: 'BUS-' + String(n).padStart(3, '0'),
    num: String(n).padStart(3, '0'),
    plate: 'SJB-' + String(1000 + n),
    route,
    driver: DRIVERS[(n - 1) % DRIVERS.length],
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
   6. MAPAS
   ========================================================== */
 
// Trayectorias en el sistema de coordenadas del mapa chico (800x450).
const ROUTE_PATHS = {
  A: t => ({ x: 50 + t * 700, y: 150 + Math.sin(t * Math.PI) * 30 }),
  B: t => ({ x: 50 + t * 700, y: 300 + Math.sin(t * Math.PI + 1) * 25 }),
  C: t => ({ x: 200 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
  D: t => ({ x: 600 + Math.sin(t * Math.PI) * 18, y: 40 + t * 380 }),
};
const ROUTE_D_ATTR = {
  A: 'M50,150 Q200,110 400,150 Q600,190 750,150',
  B: 'M50,300 Q200,270 400,300 Q600,330 750,300',
  C: 'M200,30 Q220,150 200,225 Q180,300 200,420',
  D: 'M600,30 Q620,150 600,225 Q580,300 600,420',
};
 
const MINI_BOX = { w: 800, h: 450 };
const FULL_BOX = { w: 1200, h: 650 };
const SX = FULL_BOX.w / MINI_BOX.w;   // escala mini → completo
const SY = FULL_BOX.h / MINI_BOX.h;
 
function paintStaticMapLayers() {
  // Trazados de ruta
  $('miniRoutePaths').innerHTML = ROUTES
    .map(r => `<path d="${ROUTE_D_ATTR[r.id]}" stroke="${r.color}"/>`).join('');
  $('fullRoutePaths').innerHTML = ROUTES.map(r => {
    const scaled = ROUTE_D_ATTR[r.id].replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
      (_, x, y) => `${(+x * SX).toFixed(1)},${(+y * SY).toFixed(1)}`);
    return `<path d="${scaled}" stroke="${r.color}"/>`;
  }).join('');
 
  // Paradas
  const stopColor = cssVar('--stop', '#e0972c');
  $('miniStops').innerHTML = STOPS.map(s =>
    `<circle cx="${s.x}" cy="${s.y}" r="5" fill="${stopColor}"><title>${esc(s.name)}</title></circle>`).join('');
  $('fullStops').innerHTML = STOPS.map(s => `
    <g><circle cx="${(s.x * SX).toFixed(1)}" cy="${(s.y * SY).toFixed(1)}" r="7" fill="${stopColor}"><title>${esc(s.name)}</title></circle>
    <text x="${(s.x * SX).toFixed(1)}" y="${(s.y * SY - 14).toFixed(1)}" text-anchor="middle" font-size="11" fill="#8a99b5">${esc(s.name)}</text></g>`).join('');
 
  // Leyendas
  const legend = ROUTES.map(r =>
    `<span class="legend-item"><span class="legend-dot" style="background:${r.color}"></span>Ruta ${r.id}</span>`).join('')
    + `<span class="legend-item"><span class="legend-dot" style="background:${stopColor}"></span>Paradas</span>`;
  $('miniLegend').innerHTML = legend;
  $('fullLegend').innerHTML = legend;
}
 
function markerSVG(bus, scale) {
  const x = bus.pos.x * (scale ? SX : 1);
  const y = bus.pos.y * (scale ? SY : 1);
  const s = scale ? 20 : 14;
  const c = bus.route.color;
  const highlighted = state.highlightBus === bus.id;
 
  if (bus.status === 'stopped' || bus.status === 'maintenance') {
    const dim = bus.status === 'maintenance' ? cssVar('--risk') : '#5a6a85';
    return `<g class="bus-marker" data-bus="${bus.id}" transform="translate(${x},${y})">
      <title>${bus.id} · ${statusLabel(bus.status)}</title>
      <circle r="${s / 2}" fill="#16203a" stroke="${dim}" stroke-width="1.5"/>
      <text text-anchor="middle" dominant-baseline="central" font-size="${s * 0.45}" fill="${dim}" font-weight="700">!</text>
    </g>`;
  }
 
  const halo = (bus.status === 'delayed' || highlighted)
    ? `<circle r="${s}" fill="${highlighted ? cssVar('--brand-300') : c}" opacity="0.22">
         <animate attributeName="r" values="${s};${s * 1.5};${s}" dur="1.6s" repeatCount="indefinite"/>
         <animate attributeName="opacity" values="0.25;0;0.25" dur="1.6s" repeatCount="indefinite"/>
       </circle>` : '';
 
  return `<g class="bus-marker" data-bus="${bus.id}" transform="translate(${x},${y})">
    <title>${bus.id} · Ruta ${bus.route.id} · ${bus.speed} km/h</title>
    ${halo}
    <rect x="${-s / 2}" y="${-s / 2 + 2}" width="${s}" height="${s - 2}" rx="3" fill="${c}"/>
    <rect x="${-s / 2 + 2}" y="${-s / 2 - 1}" width="${s - 4}" height="${s * 0.36}" rx="1.5" fill="${c}" opacity="0.75"/>
    <rect x="${-s / 2 + 2}" y="${-s / 2 + 4}" width="${s - 4}" height="${s * 0.2}" rx="1" fill="rgba(255,255,255,0.35)"/>
    <circle cx="${-s / 2 + 3}" cy="${s / 2 + 1}" r="${s * 0.16}" fill="#0a1120"/>
    <circle cx="${s / 2 - 3}" cy="${s / 2 + 1}" r="${s * 0.16}" fill="#0a1120"/>
    <text x="0" y="${-s * 0.85}" text-anchor="middle" font-size="${scale ? 10 : 7.5}" font-weight="800"
          font-family="JetBrains Mono, monospace" fill="${c}">${bus.num}</text>
  </g>`;
}
 
function drawMapMarkers(force) {
  if (state.view === 'dashboard' || force) {
    const g = $('busMarkers');
    if (g) g.innerHTML = buses.map(b => markerSVG(b, false)).join('');
  }
  if (state.view === 'map' || force) {
    const g = $('fullMapBusMarkers');
    if (g) g.innerHTML = buses.map(b => markerSVG(b, true)).join('');
  }
}
 
let animId = null;
let lastTick = 0;
 
function tick(ts) {
  animId = requestAnimationFrame(tick);
  if (ts - lastTick < 55) return;   // ~18 fps: suficiente y amable con la batería
  lastTick = ts;
 
  if (prefs.motion) {
    buses.forEach(b => {
      if (b.status === 'stopped' || b.status === 'maintenance') return;
      b._t += b._step * b._dir;
      if (b._t >= 1) { b._t = 1; b._dir = -1; }
      if (b._t <= 0) { b._t = 0; b._dir = 1; }
      const fn = ROUTE_PATHS[b.route.id];
      if (fn) b.pos = fn(b._t);
    });
  }
  drawMapMarkers(false);
}
 
function startAnim() { if (!animId) { lastTick = 0; animId = requestAnimationFrame(tick); } }
function stopAnim() { if (animId) { cancelAnimationFrame(animId); animId = null; } }
 
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAnim(); else startAnim();
});
 
/* ---------- Zoom y arrastre ---------- */
 
const viewports = {
  mini: { el: null, base: { x: 0, y: 0, w: MINI_BOX.w, h: MINI_BOX.h }, box: null },
  full: { el: null, base: { x: 0, y: 0, w: FULL_BOX.w, h: FULL_BOX.h }, box: null },
};
 
function applyViewBox(key) {
  const v = viewports[key];
  const b = v.box;
  v.el.setAttribute('viewBox', `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`);
}
 
function zoomMap(key, factor, cx, cy) {
  const v = viewports[key];
  const b = v.box, base = v.base;
  const minW = base.w * 0.25;    // hasta 4x de acercamiento
  const maxW = base.w;           // no se aleja más allá del encuadre original
  let newW = Math.min(maxW, Math.max(minW, b.w * factor));
  const ratio = newW / b.w;
  const newH = b.h * ratio;
 
  // Mantiene fijo el punto (cx, cy) bajo el cursor o el centro
  const px = cx === undefined ? b.x + b.w / 2 : cx;
  const py = cy === undefined ? b.y + b.h / 2 : cy;
  b.x = px - (px - b.x) * ratio;
  b.y = py - (py - b.y) * ratio;
  b.w = newW; b.h = newH;
  clampBox(key);
  applyViewBox(key);
}
 
function clampBox(key) {
  const v = viewports[key], b = v.box, base = v.base;
  const margin = base.w * 0.1;
  b.x = Math.min(Math.max(b.x, base.x - margin), base.x + base.w - b.w + margin);
  b.y = Math.min(Math.max(b.y, base.y - margin), base.y + base.h - b.h + margin);
}
 
function resetMap(key) {
  viewports[key].box = Object.assign({}, viewports[key].base);
  applyViewBox(key);
}
 
function setupMap(key, svgId) {
  const svg = $(svgId);
  if (!svg) return;
  const v = viewports[key];
  v.el = svg;
  v.box = Object.assign({}, v.base);
  applyViewBox(key);
 
  // Convierte coordenadas de pantalla a coordenadas del viewBox
  const toLocal = (clientX, clientY) => {
    const r = svg.getBoundingClientRect();
    const b = v.box;
    return {
      x: b.x + ((clientX - r.left) / r.width) * b.w,
      y: b.y + ((clientY - r.top) / r.height) * b.h,
    };
  };
 
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    zoomMap(key, e.deltaY > 0 ? 1.15 : 0.87, p.x, p.y);
  }, { passive: false });
 
  let dragging = false, last = null, moved = 0;
 
  svg.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; moved = 0;
    last = toLocal(e.clientX, e.clientY);
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
  });
 
  svg.addEventListener('pointermove', e => {
    if (!dragging) return;
    const p = toLocal(e.clientX, e.clientY);
    const dx = p.x - last.x, dy = p.y - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    v.box.x -= dx; v.box.y -= dy;
    clampBox(key);
    applyViewBox(key);
    // last se recalcula con el viewBox nuevo, por eso no se guarda p directo
    last = toLocal(e.clientX, e.clientY);
  });
 
  const endDrag = e => {
    if (!dragging) return;
    dragging = false;
    svg.classList.remove('dragging');
    try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* el puntero ya se había soltado */ }
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
 
  // Si el usuario arrastró, el clic que sigue no debe abrir el detalle del bus.
  // La delegación global se encarga del clic limpio sobre un marcador.
  svg.addEventListener('click', e => {
    if (moved >= 6) { e.stopPropagation(); e.preventDefault(); moved = 0; }
  }, true);
 
  svg.addEventListener('dblclick', e => {
    const p = toLocal(e.clientX, e.clientY);
    zoomMap(key, 0.7, p.x, p.y);
  });
}
 
$$('.map-btn[data-zoom]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.map;
    const action = btn.dataset.zoom;
    if (action === 'in') zoomMap(key, 0.75);
    if (action === 'out') zoomMap(key, 1.33);
    if (action === 'reset') resetMap(key);
  });
});
 
function renderMapBusList() {
  $('mapBusList').innerHTML = buses.map(b => `
    <div class="map-bus-item ${state.highlightBus === b.id ? 'highlight' : ''}" data-bus="${b.id}" role="button" tabindex="0">
      <span class="map-bus-dot" style="background:${b.route.color}"></span>
      <span class="map-bus-info">
        <span class="map-bus-id">${b.id}</span>
        <span class="map-bus-route">Ruta ${b.route.id} · ${b.speed} km/h</span>
      </span>
      <span class="status-badge status-${b.status}">${statusLabel(b.status)}</span>
    </div>`).join('');
}
 
// Centra el mapa completo sobre un bus
function focusBus(busId) {
  const bus = buses.find(b => b.id === busId);
  if (!bus) return;
  state.highlightBus = busId;
  navigate('map');
  const v = viewports.full;
  v.box.w = v.base.w * 0.45;
  v.box.h = v.base.h * 0.45;
  v.box.x = bus.pos.x * SX - v.box.w / 2;
  v.box.y = bus.pos.y * SY - v.box.h / 2;
  clampBox('full');
  applyViewBox('full');
  renderMapBusList();
  drawMapMarkers(true);
  toast('Siguiendo ' + busId);
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
  if (!data.length) {
    el.innerHTML = '<p class="empty-state">No hay alertas en esta categoría</p>';
  } else {
    el.innerHTML = data.map(a => `
      <article class="alert-item ${a.type} ${a.read ? 'read' : ''}" data-alert="${a.id}">
        <span class="alert-icon-wrap ${a.type}">${a.icon}</span>
        <div class="alert-content">
          <p class="alert-title">${a.title}</p>
          <p class="alert-desc">${a.desc}</p>
          <p class="alert-meta">
            <span class="alert-time">${a.time}</span>
            ${a.bus.startsWith('BUS') ? `<span class="alert-bus-tag" data-bus="${a.bus}">${a.bus}</span>` : `<span class="alert-bus-tag">${a.bus}</span>`}
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
 
$('clearAlertsBtn').addEventListener('click', () => {
  const pend = alerts.filter(a => !a.read).length;
  alerts.forEach(a => { a.read = true; });
  renderAlerts();
  toast(pend ? pend + ' alertas marcadas como leídas' : 'No había alertas pendientes', 'ok');
});
 
$('newAlertBtn').addEventListener('click', () => {
  const bus = pick(buses);
  const plantillas = [
    { type: 'warning', icon: '⛽', title: 'Combustible bajo', desc: `${bus.id} al ${randInt(8, 18)}% de combustible.` },
    { type: 'critical', icon: '🚨', title: 'Frenado brusco detectado', desc: `${bus.id} registró una desaceleración fuerte cerca de ${pick(STOPS).name}.` },
    { type: 'info', icon: '📍', title: 'Desvío de ruta', desc: `${bus.id} se apartó del trazado de la Ruta ${bus.route.id} por obras en la vía.` },
    { type: 'warning', icon: '👥', title: 'Unidad al límite', desc: `${bus.id} viaja con ${bus.capacity} de ${bus.capacity} asientos ocupados.` },
  ];
  const t = pick(plantillas);
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
 
function openBusModal(busId) {
  const b = buses.find(x => x.id === busId);
  if (!b) return;
  // Se guarda en una propiedad de JS, no como atributo del DOM: si fuera
  // data-bus en el propio modal, closest('[data-bus]') encontraría al
  // contenedor entero y cualquier clic adentro (cerrar, rastrear, contactar)
  // reabriría el modal en vez de dejarlo cerrar.
  busModal.currentBusId = b.id;
 
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
 
function updateLiveData() {
  if (!prefs.live) return;
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
  loadPrefs();
  syncRouteColors();
 
  // Opciones del filtro de rutas
  $('routeFilter').innerHTML = '<option value="">Todas las rutas</option>'
    + ROUTES.map(r => `<option value="${r.id}">Ruta ${r.id} — ${r.name}</option>`).join('');
 
  paintStaticMapLayers();
  setupMap('mini', 'cityMap');
  setupMap('full', 'fullMap');
 
  refreshCounters();
  renderBusList();
  renderActivity();
  renderNotifs();
  buildAccentPicker();
  syncLiveIndicator();
  drawSparklines();
  drawMainChart();
  drawMapMarkers(true);
  startAnim();
 
  updateHomeChips();
  document.body.style.overflow = 'hidden';   // el menú cubre la pantalla al entrar
 
  setInterval(updateLiveData, 3000);
  setInterval(pushActivity, 9000);
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
 