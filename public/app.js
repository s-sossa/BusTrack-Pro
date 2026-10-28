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

const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Helper seguro de registro de eventos (evita errores si el elemento no existe en DOM)
function on(target, event, handler) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener(event, handler);
  }
}

// Función háptica a nivel global (accesible desde todas las vistas y componentes)
function hapticFeedback(pattern = 10) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

/* ==========================================================
   SUPABASE CLIENT (SINGLETON DIRECT CONNECTION)
   ========================================================== */
const SUPABASE_URL = 'https://jhuvaqrdhkzxqmvcrlws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YdweRSdqvXLG_Ai1GQVYQw_sOtK_hZ0';
const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Helper: escapa caracteres HTML para evitar XSS al usar innerHTML
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


 
const ROUTES = [
  // Rutas interprovinciales reales de Costa Rica — concesiones CTP/ARESEP
  { id: 'SJO-201', name: 'San José – Alajuela vía Aeropuerto Juan Santamaría',        operator: 'TUASA (Transportes Unidos Alajuelenses S.A.)',          concession: 'SJO-201', varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22,
    stopIds: ['stop-central-sjo', 'stop-coca-cola', 'stop-sabana', 'stop-escazu-centro', 'stop-santa-ana-centro', 'stop-city-mall', 'stop-aeropuerto-sjo', 'stop-alajuela-fecosa'] },
  { id: 'SJO-300', name: 'San José – Heredia vía Tibás y Santo Domingo',              operator: 'Transportes Unidos La 400 S.A.',                        concession: 'SJO-300', varName: '--route-b', color: '#7c4ddb', stops: 6,  length: 18,
    stopIds: ['stop-central-sjo', 'stop-7-10', 'stop-parque-central-sjo', 'stop-heredia-central', 'stop-santo-domingo', 'stop-san-pablo'] },
  { id: 'SJO-400', name: 'San José – Cartago vía Autopista Florencio del Castillo',   operator: 'Auto Transportes Lumaca S.A.',                          concession: 'SJO-400', varName: '--route-c', color: '#2aa3c4', stops: 7,  length: 25,
    stopIds: ['stop-central-sjo', 'stop-hospital-sanjuan', 'stop-san-pedro-centro', 'stop-ucr', 'stop-curridabat', 'stop-tres-rios', 'stop-metrocentro-cartago'] },
  { id: 'SJO-401', name: 'San José – Turrialba vía Cartago y Paraíso',                operator: 'TRANSTUSA (Transportes Turrialba S.A.)',                 concession: 'SJO-401', varName: '--route-d', color: '#2bb885', stops: 6,  length: 90,
    stopIds: ['stop-central-sjo', 'stop-metrocentro-cartago', 'stop-tres-rios', 'stop-paraiso', 'stop-cervantes', 'stop-turrialba'] },
  { id: 'SJO-402', name: 'Cartago – San José Servicio Express Ciudad Jardín',         operator: 'Auto Transportes Lumaca S.A.',                          concession: 'SJO-402', varName: '--route-e', color: '#f5a623', stops: 5,  length: 24,
    stopIds: ['stop-metrocentro-cartago', 'stop-tres-rios', 'stop-curridabat', 'stop-san-pedro-centro', 'stop-central-sjo'] },
  { id: 'SJO-600', name: 'San José – Desamparados – Aserrí',                          operator: 'Autotransportes Desamparados S.A.',                     concession: 'SJO-600', varName: '--route-f', color: '#e24c6c', stops: 5,  length: 20,
    stopIds: ['stop-central-sjo', 'stop-parque-central-sjo', 'stop-zapote', 'stop-desamparados', 'stop-aserri'] },
  { id: 'SJO-601', name: 'San José – San Isidro de El General (Pérez Zeledón)',       operator: 'MUSOC (Empresa de Transportes M.U.S.O.C. S.A.)',         concession: 'SJO-601', varName: '--route-g', color: '#ff7043', stops: 5,  length: 120,
    stopIds: ['stop-central-sjo', 'stop-hospital-sanjuan', 'stop-desamparados', 'stop-empalme', 'stop-perez-zeledon'] },
  { id: 'PAC-327', name: 'San José – Puntarenas vía Esparza e Interamericana',        operator: 'Empresarios Unidos de Puntarenas S.A.',                 concession: 'PAC-327', varName: '--route-h', color: '#26c6da', stops: 5,  length: 110,
    stopIds: ['stop-coca-cola', 'stop-san-ramon', 'stop-esparza', 'stop-puntarenas-ferry', 'stop-puntarenas-centro'] },
  { id: 'GUA-900', name: 'San José – Liberia vía Cañas y Bagaces',                    operator: 'Pulmitan de Liberia S.A.',                              concession: 'GUA-900', varName: '--route-i', color: '#66bb6a', stops: 6,  length: 230,
    stopIds: ['stop-coca-cola', 'stop-alajuela-fecosa', 'stop-coyol', 'stop-canas', 'stop-liberia-central', 'stop-la-cruz'] },
  { id: 'CAR-32',  name: 'San José – Puerto Limón vía Guápiles (Ruta 32)',            operator: 'Autotransportes Caribeños S.A.',                        concession: 'CAR-32',  varName: '--route-j', color: '#ab47bc', stops: 6,  length: 160,
    stopIds: ['stop-7-10', 'stop-metrocentro-cartago', 'stop-turrialba', 'stop-siquirres', 'stop-guapiles', 'stop-limon-centro'] },
];

 
const DRIVERS = [
  { id: 'D001', name: 'Operador 1',  initials: 'OP1', license: 'OP-001-SIM', trips: 1248, rating: 4.9, hours: 8.5 },
  { id: 'D002', name: 'Operador 2',  initials: 'OP2', license: 'OP-002-SIM', trips: 987,  rating: 4.8, hours: 7.2 },
  { id: 'D003', name: 'Operador 3',  initials: 'OP3', license: 'OP-003-SIM', trips: 1567, rating: 4.7, hours: 6.8 },
  { id: 'D004', name: 'Operador 4',  initials: 'OP4', license: 'OP-004-SIM', trips: 732,  rating: 5.0, hours: 9.0 },
  { id: 'D005', name: 'Operador 5',  initials: 'OP5', license: 'OP-005-SIM', trips: 2103, rating: 4.6, hours: 5.5 },
  { id: 'D006', name: 'Operador 6',  initials: 'OP6', license: 'OP-006-SIM', trips: 891,  rating: 4.9, hours: 8.0 },
];
 
const STOPS = [
  // ==========================================
  // 1. PROVINCIA DE SAN JOSÉ (GAM Y PERIFERIA)
  // ==========================================
  { id: 'stop-central-sjo', name: 'Terminal Central San José', subtext: 'Av. Central y Calle 4', province: 'San José', lat: 9.9325, lon: -84.0815, isPrimary: 1, x: 200, y: 150 },
  { id: 'stop-coca-cola', name: 'Terminal Coca Cola', subtext: 'Paso de la Vaca / Central Interurbana', province: 'San José', lat: 9.9366, lon: -84.0845, isPrimary: 1, x: 220, y: 155 },
  { id: 'stop-7-10', name: 'Terminal 7-10 Interurbana', subtext: 'Conexión Pacífico y Guanacaste', province: 'San José', lat: 9.9398, lon: -84.0827, isPrimary: 1, x: 240, y: 160 },
  { id: 'stop-tuasa-sjo', name: 'Terminal TUASA San José', subtext: 'Av. 2, Calle 12', province: 'San José', lat: 9.9345, lon: -84.0852, isPrimary: 1, x: 210, y: 152 },
  { id: 'stop-lumaca-sjo', name: 'Terminal Lumaca San José', subtext: 'Costado Sur Plaza González Víquez', province: 'San José', lat: 9.9272, lon: -84.0745, isPrimary: 1, x: 230, y: 165 },
  { id: 'stop-tracopa-sjo', name: 'Terminal Tracopa San José', subtext: 'Plaza González Víquez (Zona Sur)', province: 'San José', lat: 9.9238, lon: -84.0762, isPrimary: 1, x: 235, y: 170 },
  { id: 'stop-musoc-sjo', name: 'Terminal Musoc San José', subtext: 'Calle 16, Av. 22', province: 'San José', lat: 9.9242, lon: -84.0812, isPrimary: 1, x: 225, y: 168 },
  { id: 'stop-parque-central-sjo', name: 'Parque Central San José', subtext: 'Catedral Metropolitana', province: 'San José', lat: 9.9333, lon: -84.0792, isPrimary: 0, x: 400, y: 150 },
  { id: 'stop-merced', name: 'Parque La Merced', subtext: 'Av. 2 / Calle 10', province: 'San José', lat: 9.9349, lon: -84.0841, isPrimary: 0, x: 215, y: 153 },
  { id: 'stop-hospital-sanjuan', name: 'Hospital San Juan de Dios', subtext: 'Paseo Colón', province: 'San José', lat: 9.9348, lon: -84.0864, isPrimary: 0, x: 600, y: 150 },
  { id: 'stop-hospital-mexico', name: 'Hospital México', subtext: 'La Uruca / Radial Pozuelo', province: 'San José', lat: 9.9535, lon: -84.1102, isPrimary: 0, x: 190, y: 140 },
  { id: 'stop-hospital-calderon', name: 'Hospital Calderón Guardia', subtext: 'Barrio Aranjuez / Av. 7', province: 'San José', lat: 9.9362, lon: -84.0695, isPrimary: 0, x: 260, y: 148 },
  { id: 'stop-paseo-colon', name: 'Paseo Colón — Calle 28', province: 'San José', lat: 9.9351, lon: -84.0945, isPrimary: 0, x: 195, y: 155 },
  { id: 'stop-sabana', name: 'La Sabana — Estadio Nacional', subtext: 'Mata Redonda', province: 'San José', lat: 9.9355, lon: -84.1042, isPrimary: 0, x: 200, y: 225 },
  { id: 'stop-escalante', name: 'Barrio Escalante', subtext: 'Calle 33 Gastronómica', province: 'San José', lat: 9.9358, lon: -84.0625, isPrimary: 0, x: 100, y: 225 },
  { id: 'stop-los-yoses', name: 'Los Yoses / Av. Central', province: 'San José', lat: 9.9329, lon: -84.0592, isPrimary: 0, x: 270, y: 160 },
  { id: 'stop-mall-sp', name: 'Mall San Pedro / Fuente Hispanidad', province: 'San José', lat: 9.9341, lon: -84.0620, isPrimary: 0, x: 200, y: 225 },
  { id: 'stop-ucr', name: 'Universidad de Costa Rica (UCR)', subtext: 'San Pedro Montes de Oca', province: 'San José', lat: 9.9365, lon: -84.0512, isPrimary: 0, x: 400, y: 300 },
  { id: 'stop-san-pedro-centro', name: 'San Pedro Centro / Muñoz & Nanne', province: 'San José', lat: 9.9338, lon: -84.0535, isPrimary: 0, x: 250, y: 225 },
  { id: 'stop-zapote', name: 'Rotonda Garantías Sociales — Zapote', province: 'San José', lat: 9.9285, lon: -84.0542, isPrimary: 0, x: 280, y: 175 },
  { id: 'stop-curridabat', name: 'Plaza del Sol / Curridabat', province: 'San José', lat: 9.9252, lon: -84.0415, isPrimary: 0, x: 290, y: 180 },
  { id: 'stop-escazu-centro', name: 'Escazú Centro — Parque Central', province: 'San José', lat: 9.9185, lon: -84.1402, isPrimary: 0, x: 130, y: 210 },
  { id: 'stop-escazu-multiplaza', name: 'Multiplaza Escazú / Autopista 27', province: 'San José', lat: 9.9458, lon: -84.1492, isPrimary: 0, x: 120, y: 200 },
  { id: 'stop-santa-ana-centro', name: 'Santa Ana Centro', province: 'San José', lat: 9.9328, lon: -84.1824, isPrimary: 0, x: 100, y: 210 },
  { id: 'stop-lindora', name: 'Lindora / Forum 1 & 2', province: 'San José', lat: 9.9562, lon: -84.1852, isPrimary: 0, x: 95, y: 205 },
  { id: 'stop-ciudad-colon', name: 'Ciudad Colón (Mora)', province: 'San José', lat: 9.9142, lon: -84.2415, isPrimary: 0, x: 80, y: 220 },
  { id: 'stop-desamparados', name: 'Desamparados Parque Central', province: 'San José', lat: 9.8974, lon: -84.0664, isPrimary: 0, x: 300, y: 350 },
  { id: 'stop-aserri', name: 'Aserrí Centro — Iglesia', province: 'San José', lat: 9.8662, lon: -84.0745, isPrimary: 0, x: 305, y: 360 },
  { id: 'stop-alajuelita', name: 'Alajuelita Centro', province: 'San José', lat: 9.9025, lon: -84.1012, isPrimary: 0, x: 185, y: 190 },
  { id: 'stop-moravia', name: 'Moravia Centro / Lincoln Plaza', province: 'San José', lat: 9.9632, lon: -84.0482, isPrimary: 0, x: 310, y: 130 },
  { id: 'stop-tibas', name: 'Tibás Parque Central / Estadio Saprissa', province: 'San José', lat: 9.9582, lon: -84.0812, isPrimary: 0, x: 245, y: 135 },
  { id: 'stop-guadalupe', name: 'Guadalupe (Goicoechea)', province: 'San José', lat: 9.9472, lon: -84.0558, isPrimary: 0, x: 265, y: 140 },
  { id: 'stop-coronado', name: 'Vázquez de Coronado (San Isidro)', province: 'San José', lat: 9.9765, lon: -84.0092, isPrimary: 0, x: 330, y: 125 },
  { id: 'stop-puriscal', name: 'Santiago de Puriscal', province: 'San José', lat: 9.8495, lon: -84.3125, isPrimary: 0, x: 60, y: 240 },
  { id: 'stop-perez-zeledon', name: 'Terminal San Isidro de El General (Pérez Zeledón)', subtext: 'Valle de El General / Tracopa y Musoc', province: 'San José', lat: 9.3735, lon: -83.7042, isPrimary: 1, x: 350, y: 480 },

  // ==========================================
  // 2. PROVINCIA DE ALAJUELA
  // ==========================================
  { id: 'stop-alajuela-fecosa', name: 'Terminal Fecosa Alajuela', subtext: 'Terminal Central de Alajuela', province: 'Alajuela', lat: 10.0152, lon: -84.2145, isPrimary: 1, x: 550, y: 180 },
  { id: 'stop-tuasa-alajuela', name: 'Terminal TUASA Alajuela', province: 'Alajuela', lat: 10.0182, lon: -84.2138, isPrimary: 1, x: 552, y: 178 },
  { id: 'stop-aeropuerto-sjo', name: 'Aeropuerto Juan Santamaría (SJO)', subtext: 'Terminal Internacional de Pasajeros', province: 'Alajuela', lat: 10.0004, lon: -84.2141, isPrimary: 1, x: 600, y: 225 },
  { id: 'stop-city-mall', name: 'City Mall Alajuela', subtext: 'Radial Francisco J. Orlich', province: 'Alajuela', lat: 10.0094, lon: -84.2102, isPrimary: 0, x: 570, y: 200 },
  { id: 'stop-coyol', name: 'Zona Franca El Coyol', subtext: 'Parque Médico y Logístico', province: 'Alajuela', lat: 9.9965, lon: -84.2698, isPrimary: 0, x: 620, y: 250 },
  { id: 'stop-la-garita', name: 'La Garita / Viveros', province: 'Alajuela', lat: 10.0085, lon: -84.3215, isPrimary: 0, x: 580, y: 230 },
  { id: 'stop-grecia', name: 'Terminal Grecia Centro', subtext: 'Mercado Municipal de Grecia', province: 'Alajuela', lat: 10.0735, lon: -84.3115, isPrimary: 1, x: 640, y: 260 },
  { id: 'stop-sarchi', name: 'Sarchí Centro (Artesanías)', province: 'Alajuela', lat: 10.0915, lon: -84.3475, isPrimary: 0, x: 650, y: 265 },
  { id: 'stop-naranjo', name: 'Terminal Naranjo Parque Central', province: 'Alajuela', lat: 10.0982, lon: -84.3785, isPrimary: 0, x: 660, y: 270 },
  { id: 'stop-palmares', name: 'Terminal Palmares Centro', province: 'Alajuela', lat: 10.0582, lon: -84.4325, isPrimary: 0, x: 670, y: 275 },
  { id: 'stop-san-ramon', name: 'Terminal San Ramón', subtext: 'Empresarios Unidos / Mercado', province: 'Alajuela', lat: 10.0872, lon: -84.4705, isPrimary: 1, x: 680, y: 280 },
  { id: 'stop-atenas', name: 'Atenas Parque Central', province: 'Alajuela', lat: 9.9785, lon: -84.3825, isPrimary: 0, x: 590, y: 240 },
  { id: 'stop-orotina', name: 'Terminal Orotina', province: 'Alajuela', lat: 9.9112, lon: -84.5235, isPrimary: 0, x: 510, y: 290 },
  { id: 'stop-poas', name: 'San Pedro de Poás', province: 'Alajuela', lat: 10.0745, lon: -84.2415, isPrimary: 0, x: 560, y: 190 },
  { id: 'stop-ciudad-quesada', name: 'Terminal Ciudad Quesada (San Carlos)', subtext: 'Mercado Municipal San Carlos', province: 'Alajuela', lat: 10.3245, lon: -84.4298, isPrimary: 1, x: 700, y: 320 },
  { id: 'stop-la-fortuna', name: 'La Fortuna / Volcán Arenal', subtext: 'Parque Central de La Fortuna', province: 'Alajuela', lat: 10.4716, lon: -84.6452, isPrimary: 1, x: 720, y: 340 },
  { id: 'stop-aguas-zarcas', name: 'Aguas Zarcas de San Carlos', province: 'Alajuela', lat: 10.3812, lon: -84.3395, isPrimary: 0, x: 710, y: 310 },
  { id: 'stop-pital', name: 'Pital de San Carlos', province: 'Alajuela', lat: 10.4512, lon: -84.2755, isPrimary: 0, x: 715, y: 300 },
  { id: 'stop-los-chiles', name: 'Terminal Los Chiles (Frontera Norte)', province: 'Alajuela', lat: 11.0335, lon: -84.7165, isPrimary: 1, x: 730, y: 360 },
  { id: 'stop-upala', name: 'Terminal Upala Centro', province: 'Alajuela', lat: 10.8985, lon: -85.0185, isPrimary: 0, x: 740, y: 370 },
  { id: 'stop-guatuso', name: 'San Rafael de Guatuso', province: 'Alajuela', lat: 10.6715, lon: -84.8215, isPrimary: 0, x: 725, y: 350 },

  // ==========================================
  // 3. PROVINCIA DE HEREDIA
  // ==========================================
  { id: 'stop-heredia-central', name: 'Terminal Central Heredia', subtext: 'Calle Central — Parada Buses 400', province: 'Heredia', lat: 9.9984, lon: -84.1165, isPrimary: 1, x: 350, y: 120 },
  { id: 'stop-una', name: 'Universidad Nacional (UNA)', subtext: 'Campus Omar Dengo', province: 'Heredia', lat: 9.9998, lon: -84.1112, isPrimary: 1, x: 370, y: 115 },
  { id: 'stop-parque-heredia', name: 'Parque Central Nicolás Ulloa (Heredia)', province: 'Heredia', lat: 9.9975, lon: -84.1182, isPrimary: 0, x: 348, y: 122 },
  { id: 'stop-oxigeno', name: 'Mall Oxígeno Human Playground', subtext: 'San Francisco de Heredia', province: 'Heredia', lat: 9.9882, lon: -84.1332, isPrimary: 0, x: 340, y: 130 },
  { id: 'stop-belen', name: 'San Antonio de Belén', subtext: 'Centro y Pedregal', province: 'Heredia', lat: 9.9812, lon: -84.1878, isPrimary: 0, x: 320, y: 140 },
  { id: 'stop-san-joaquin', name: 'San Joaquín de Flores', province: 'Heredia', lat: 10.0052, lon: -84.1565, isPrimary: 0, x: 335, y: 128 },
  { id: 'stop-santo-domingo', name: 'Santo Domingo de Heredia', subtext: 'Parque Central', province: 'Heredia', lat: 9.9805, lon: -84.0915, isPrimary: 0, x: 360, y: 125 },
  { id: 'stop-san-pablo', name: 'San Pablo de Heredia', province: 'Heredia', lat: 9.9932, lon: -84.0985, isPrimary: 0, x: 355, y: 122 },
  { id: 'stop-barva', name: 'Barva de Heredia — Parque Central', province: 'Heredia', lat: 10.0212, lon: -84.1235, isPrimary: 0, x: 345, y: 110 },
  { id: 'stop-san-rafael-heredia', name: 'San Rafael de Heredia', province: 'Heredia', lat: 10.0135, lon: -84.1012, isPrimary: 0, x: 365, y: 112 },
  { id: 'stop-san-isidro-heredia', name: 'San Isidro de Heredia', province: 'Heredia', lat: 10.0175, lon: -84.0555, isPrimary: 0, x: 375, y: 115 },
  { id: 'stop-sarapiqui', name: 'Terminal Puerto Viejo de Sarapiquí', province: 'Heredia', lat: 10.4572, lon: -84.0085, isPrimary: 1, x: 420, y: 90 },

  // ==========================================
  // 4. PROVINCIA DE CARTAGO
  // ==========================================
  { id: 'stop-cartago-central', name: 'Terminal Lumaca Cartago', subtext: 'Costado Norte Ruinas de Cartago', province: 'Cartago', lat: 9.8645, lon: -83.9212, isPrimary: 1, x: 450, y: 350 },
  { id: 'stop-basilica', name: 'Basílica Nuestra Señora de Los Ángeles', subtext: 'Plaza Santuario Nacional', province: 'Cartago', lat: 9.8638, lon: -83.9131, isPrimary: 1, x: 470, y: 360 },
  { id: 'stop-tec', name: 'Tecnológico de Costa Rica (TEC)', subtext: 'Campus Central Cartago', province: 'Cartago', lat: 9.8552, lon: -83.9095, isPrimary: 1, x: 480, y: 370 },
  { id: 'stop-hospital-cartago', name: 'Hospital Max Peralta de Cartago', province: 'Cartago', lat: 9.8615, lon: -83.9242, isPrimary: 0, x: 445, y: 352 },
  { id: 'stop-metrocentro-cartago', name: 'Paseo Metrópoli / Taras', province: 'Cartago', lat: 9.8695, lon: -83.9425, isPrimary: 0, x: 435, y: 340 },
  { id: 'stop-tres-rios', name: 'Tres Ríos Parque Central (La Unión)', subtext: 'Conexión Florencio del Castillo', province: 'Cartago', lat: 9.9075, lon: -83.9878, isPrimary: 0, x: 420, y: 320 },
  { id: 'stop-paraiso', name: 'Paraíso de Cartago — Parque Central', province: 'Cartago', lat: 9.8385, lon: -83.8655, isPrimary: 0, x: 495, y: 375 },
  { id: 'stop-cervantes', name: 'Cervantes de Alvarado', province: 'Cartago', lat: 9.8825, lon: -83.8215, isPrimary: 0, x: 505, y: 380 },
  { id: 'stop-pacayas', name: 'Pacayas (Alvarado)', province: 'Cartago', lat: 9.9142, lon: -83.8055, isPrimary: 0, x: 512, y: 375 },
  { id: 'stop-oreamuno', name: 'San Rafael de Oreamuno', province: 'Cartago', lat: 9.8712, lon: -83.9045, isPrimary: 0, x: 465, y: 345 },
  { id: 'stop-turrialba', name: 'Terminal Transtusa Turrialba', subtext: 'Parque Central de Turrialba', province: 'Cartago', lat: 9.9048, lon: -83.6835, isPrimary: 1, x: 520, y: 380 },
  { id: 'stop-cachi', name: 'Cachí / Represa Hidroeléctrica', province: 'Cartago', lat: 9.8285, lon: -83.8085, isPrimary: 0, x: 500, y: 385 },

  // ==========================================
  // 5. PROVINCIA DE PUNTARENAS
  // ==========================================
  { id: 'stop-puntarenas-centro', name: 'Terminal Central Puntarenas', subtext: 'Paseo de los Turistas / Empresarios Unidos', province: 'Puntarenas', lat: 9.9765, lon: -84.8295, isPrimary: 1, x: 160, y: 395 },
  { id: 'stop-puntarenas-ferry', name: 'Terminal Ferry Puntarenas (Paquera)', subtext: 'Embarcadero Tambor y Paquera', province: 'Puntarenas', lat: 9.9774, lon: -84.8488, isPrimary: 1, x: 150, y: 400 },
  { id: 'stop-el-roble', name: 'El Roble de Puntarenas (Hospital Monseñor Sanabria)', province: 'Puntarenas', lat: 9.9795, lon: -84.7565, isPrimary: 0, x: 170, y: 390 },
  { id: 'stop-barranca', name: 'Barranca / Cruce Interamericana', province: 'Puntarenas', lat: 9.9882, lon: -84.7312, isPrimary: 0, x: 175, y: 385 },
  { id: 'stop-caldera', name: 'Puerto Caldera', subtext: 'Ruta 27 / Entrada Portuaria', province: 'Puntarenas', lat: 9.9185, lon: -84.7175, isPrimary: 0, x: 180, y: 380 },
  { id: 'stop-esparza', name: 'Esparza Centro — Parque Pérez', province: 'Puntarenas', lat: 9.9942, lon: -84.6675, isPrimary: 0, x: 185, y: 375 },
  { id: 'stop-jaco', name: 'Terminal Jacó Centro', subtext: 'Avenida Pastor Díaz — Playa Jacó', province: 'Puntarenas', lat: 9.6152, lon: -84.6295, isPrimary: 1, x: 200, y: 420 },
  { id: 'stop-herradura', name: 'Playa Herradura / Los Sueños', province: 'Puntarenas', lat: 9.6482, lon: -84.6415, isPrimary: 0, x: 198, y: 415 },
  { id: 'stop-parrita', name: 'Parrita Centro', province: 'Puntarenas', lat: 9.5215, lon: -84.3285, isPrimary: 0, x: 215, y: 435 },
  { id: 'stop-quepos', name: 'Terminal Quepos Centro', subtext: 'Terminal Municipal de Quepos', province: 'Puntarenas', lat: 9.4312, lon: -84.1615, isPrimary: 1, x: 230, y: 450 },
  { id: 'stop-manuel-antonio', name: 'Parque Nacional Manuel Antonio', subtext: 'Playa Espadilla y Reserva', province: 'Puntarenas', lat: 9.3895, lon: -84.1482, isPrimary: 1, x: 235, y: 455 },
  { id: 'stop-dominical', name: 'Playa Dominical', province: 'Puntarenas', lat: 9.2535, lon: -83.8645, isPrimary: 0, x: 250, y: 465 },
  { id: 'stop-uvita', name: 'Uvita / Bahía Ballena', subtext: 'Cola de Ballena', province: 'Puntarenas', lat: 9.1725, lon: -83.7385, isPrimary: 0, x: 260, y: 470 },
  { id: 'stop-palmar-norte', name: 'Palmar Norte — Puente Río Grande de Térraba', province: 'Puntarenas', lat: 8.9592, lon: -83.4542, isPrimary: 1, x: 280, y: 490 },
  { id: 'stop-ciudad-neily', name: 'Terminal Ciudad Neily (Corredores)', province: 'Puntarenas', lat: 8.6475, lon: -82.9435, isPrimary: 1, x: 300, y: 510 },
  { id: 'stop-golfito', name: 'Terminal Golfito / Depósito Libre', province: 'Puntarenas', lat: 8.6362, lon: -83.1675, isPrimary: 1, x: 290, y: 515 },
  { id: 'stop-puerto-jimenez', name: 'Puerto Jiménez (Península de Osa)', province: 'Puntarenas', lat: 8.5385, lon: -83.3082, isPrimary: 0, x: 285, y: 525 },
  { id: 'stop-paso-canoas', name: 'Paso Canoas (Frontera con Panamá)', subtext: 'Aduana Internacional', province: 'Puntarenas', lat: 8.5312, lon: -82.8425, isPrimary: 1, x: 310, y: 530 },
  { id: 'stop-monteverde', name: 'Santa Elena de Monteverde', subtext: 'Bosque Nuboso', province: 'Puntarenas', lat: 10.3182, lon: -84.8255, isPrimary: 1, x: 145, y: 350 },

  // ==========================================
  // 6. PROVINCIA DE GUANACASTE
  // ==========================================
  { id: 'stop-liberia-central', name: 'Terminal Municipal de Liberia', subtext: 'Centro de Liberia', province: 'Guanacaste', lat: 10.6315, lon: -85.4382, isPrimary: 1, x: 100, y: 80 },
  { id: 'stop-pulmitan-liberia', name: 'Terminal Pulmitan Liberia', subtext: 'Conexión San José y Playas', province: 'Guanacaste', lat: 10.6342, lon: -85.4412, isPrimary: 1, x: 98, y: 78 },
  { id: 'stop-aeropuerto-lir', name: 'Aeropuerto Guanacaste (LIR)', subtext: 'Daniel Oduber Quirós', province: 'Guanacaste', lat: 10.5935, lon: -85.5442, isPrimary: 1, x: 90, y: 75 },
  { id: 'stop-canas', name: 'Terminal Cañas Centro', province: 'Guanacaste', lat: 10.4312, lon: -85.0945, isPrimary: 1, x: 125, y: 95 },
  { id: 'stop-bagaces', name: 'Bagaces Parque Central', province: 'Guanacaste', lat: 10.5285, lon: -85.2582, isPrimary: 0, x: 115, y: 88 },
  { id: 'stop-santa-cruz', name: 'Terminal Santa Cruz', subtext: 'Ciudad Folclórica — Plaza Los Mangos', province: 'Guanacaste', lat: 10.2625, lon: -85.5862, isPrimary: 1, x: 110, y: 110 },
  { id: 'stop-nicoya', name: 'Terminal Nicoya Colonial', subtext: 'Parque Recaredo Briceño', province: 'Guanacaste', lat: 10.1448, lon: -85.4525, isPrimary: 1, x: 120, y: 130 },
  { id: 'stop-filadelfia', name: 'Filadelfia de Carrillo', province: 'Guanacaste', lat: 10.4435, lon: -85.5492, isPrimary: 0, x: 95, y: 85 },
  { id: 'stop-playas-del-coco', name: 'Playas del Coco', province: 'Guanacaste', lat: 10.5525, lon: -85.6985, isPrimary: 0, x: 80, y: 70 },
  { id: 'stop-tamarindo', name: 'Parada Playa Tamarindo', subtext: 'Rotonda de Tamarindo', province: 'Guanacaste', lat: 10.2995, lon: -85.8412, isPrimary: 1, x: 70, y: 100 },
  { id: 'stop-flamingo', name: 'Playa Flamingo / Marina Flamingo', province: 'Guanacaste', lat: 10.4385, lon: -85.7895, isPrimary: 0, x: 75, y: 90 },
  { id: 'stop-samara', name: 'Playa Sámara Centro', province: 'Guanacaste', lat: 9.8812, lon: -85.5285, isPrimary: 0, x: 110, y: 145 },
  { id: 'stop-nosara', name: 'Nosara / Playa Guiones', province: 'Guanacaste', lat: 9.9785, lon: -85.6675, isPrimary: 0, x: 90, y: 135 },
  { id: 'stop-la-cruz', name: 'La Cruz — Peñas Blancas (Frontera Nicaragua)', province: 'Guanacaste', lat: 11.2185, lon: -85.6115, isPrimary: 1, x: 85, y: 50 },
  { id: 'stop-tilaran', name: 'Tilarán Centro', province: 'Guanacaste', lat: 10.4725, lon: -84.9685, isPrimary: 0, x: 135, y: 100 },

  // ==========================================
  // 7. PROVINCIA DE LIMÓN (CARIBE)
  // ==========================================
  { id: 'stop-limon-centro', name: 'Terminal Caribeños Limón Centro', subtext: 'Parque Vargas / Puerto Limón', province: 'Limón', lat: 9.9935, lon: -83.0332, isPrimary: 1, x: 750, y: 220 },
  { id: 'stop-moin', name: 'Terminal Puerto Moín (APM Terminals)', subtext: 'Entrada Complejo Portuario', province: 'Limón', lat: 10.0012, lon: -83.0785, isPrimary: 0, x: 740, y: 210 },
  { id: 'stop-cieneguita', name: 'Cieneguita / Aeropuerto de Limón', province: 'Limón', lat: 9.9612, lon: -83.0245, isPrimary: 0, x: 755, y: 225 },
  { id: 'stop-liverpool', name: 'Liverpool de Limón', province: 'Limón', lat: 10.0095, lon: -83.1315, isPrimary: 0, x: 730, y: 205 },
  { id: 'stop-siquirres', name: 'Terminal Central Siquirres', subtext: 'Conexión Ruta 32 Caribe', province: 'Limón', lat: 10.0982, lon: -83.5075, isPrimary: 1, x: 680, y: 180 },
  { id: 'stop-guapiles', name: 'Terminal Pococí / Guápiles', subtext: 'Ruta 32 / Centro de Guápiles', province: 'Limón', lat: 10.2152, lon: -83.7845, isPrimary: 1, x: 650, y: 160 },
  { id: 'stop-guacimo', name: 'Guácimo Centro', province: 'Limón', lat: 10.2115, lon: -83.6845, isPrimary: 0, x: 665, y: 170 },
  { id: 'stop-batan', name: 'Batán de Matina', province: 'Limón', lat: 10.0842, lon: -83.3345, isPrimary: 0, x: 700, y: 195 },
  { id: 'stop-cahuita', name: 'Parque Nacional Cahuita (Playa Blanca)', province: 'Limón', lat: 9.7395, lon: -82.8445, isPrimary: 1, x: 770, y: 250 },
  { id: 'stop-puerto-viejo', name: 'Parada Puerto Viejo de Talamanca', subtext: 'Caribe Sur / Playa Salsa Brava', province: 'Limón', lat: 9.6565, lon: -82.7545, isPrimary: 1, x: 790, y: 280 },
  { id: 'stop-bribri', name: 'Bribri Centro (Talamanca)', province: 'Limón', lat: 9.6235, lon: -82.8415, isPrimary: 0, x: 785, y: 290 },
  { id: 'stop-sixaola', name: 'Sixaola (Frontera con Panamá)', subtext: 'Puente Internacional Binacional', province: 'Limón', lat: 9.5025, lon: -82.6145, isPrimary: 1, x: 800, y: 310 },

  // ==========================================
  // 8. PARADAS DE RUTA INTERAMERICANA (cruce)
  // ==========================================
  { id: 'stop-empalme', name: 'El Empalme / La División', subtext: 'Cruce Ruta Interamericana — Bifurcación Valle y Pacífico Sur', province: 'San José', lat: 9.7648, lon: -83.9412, isPrimary: 0, x: 320, y: 400 },
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
 
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Number(n).toLocaleString('es-CR');
 
 
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
  schedules: 'Horarios de Buses (Costa Rica)',
  fleet: 'Horarios de Buses (Costa Rica)',
  routes: 'Rutas',
  alerts: 'Centro de Alertas',
  reports: 'Reportes',
  drivers: 'Conductores',
};

function navigate(view) {
  if (view === 'fleet') view = 'schedules';
  if (!VIEW_TITLES[view]) return;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  const targetView = $('view-' + view);
  if (targetView) targetView.classList.add('active');
  const navEl = $('nav-' + view);
  if (navEl) navEl.classList.add('active');

  // Sincronizar barra de navegación móvil inferior
  $$('.mobile-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view || (btn.dataset.view === 'schedules' && view === 'fleet'));
  });

  state.view = view;
  $('pageTitle').textContent = VIEW_TITLES[view];
  $('breadcrumbCurrent').textContent = VIEW_TITLES[view];
  document.title = VIEW_TITLES[view] + ' — BusTrack Pro';

  if (view === 'schedules' || view === 'fleet') renderSchedules();
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
    <div class="bus-item" data-bus="${esc(b.id)}" role="button" tabindex="0">
      <span class="bus-item-icon" style="background:${esc(b.route.color)}22;color:${esc(b.route.color)}">${esc(b.num)}</span>
      <span class="bus-item-info">
        <span class="bus-item-id">${esc(b.id)}</span>
        <span class="bus-item-route">Ruta ${esc(b.route.id)} · ${esc(b.driver.name.split(' ')[0])}</span>
      </span>
      <span class="bus-item-meta">
        <span class="bus-item-speed">${esc(b.speed)} km/h</span>
        <span class="status-badge status-${esc(b.status)}">${esc(statusLabel(b.status))}</span>
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
 
/* ==========================================================
   5. HORARIOS OFICIALES DE BUSES DE COSTA RICA (CTP / ARESEP)
   ========================================================== */

const CR_BUS_SCHEDULES = [
  {
    routeId: 'SJO-201',
    concession: 'SJO-201',
    name: 'San José – Alajuela (vía Aeropuerto Juan Santamaría)',
    operator: 'TUASA (Transportes Unidos Alajuelenses S.A.)',
    operatorPhone: '+506 2442-6900',
    province: 'Alajuela',
    provincesServed: ['San José', 'Alajuela'],
    color: '#5b6ef5',
    tariffRegular: '₡720',
    tariffDirect: '₡890 (Directo Pista)',
    originTerminal: 'Terminal TUASA San José (Av. 2, Calles 12 y 14, Parque La Merced)',
    destinationTerminal: 'Terminal TUASA Alajuela (Calle Ancha, Av. 1)',
    distanceKm: 22,
    travelTimeEst: '35 - 45 min',
    stopsCount: 8,
    weekday: {
      firstBus: '04:30',
      lastBus: '23:00',
      peakFreq: 'Cada 5 a 8 min',
      offPeakFreq: 'Cada 12 min',
      outboundDepartures: ['04:30','04:45','05:00','05:08','05:15','05:22','05:30','05:38','05:45','05:52','06:00','06:08','06:15','06:22','06:30','06:45','07:00','07:15','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:20','18:40','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      inboundDepartures: ['04:15','04:30','04:45','05:00','05:08','05:15','05:22','05:30','05:40','05:50','06:00','06:10','06:20','06:30','06:45','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:45']
    },
    saturday: {
      firstBus: '04:45',
      lastBus: '22:30',
      peakFreq: 'Cada 10 min',
      offPeakFreq: 'Cada 15 min',
      outboundDepartures: ['04:45','05:00','05:15','05:30','05:45','06:00','06:15','06:30','06:45','07:00','07:20','07:40','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30'],
      inboundDepartures: ['04:30','04:45','05:00','05:15','05:30','05:45','06:00','06:15','06:30','06:45','07:00','07:20','07:40','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']
    },
    sunday: {
      firstBus: '05:00',
      lastBus: '22:30',
      peakFreq: 'Cada 15 min',
      offPeakFreq: 'Cada 15 min',
      outboundDepartures: ['05:00','05:20','05:40','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30'],
      inboundDepartures: ['04:45','05:10','05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']
    }
  },
  {
    routeId: 'SJO-300',
    concession: 'SJO-300',
    name: 'San José – Heredia (vía Tibás y Santo Domingo)',
    operator: 'Transportes Unidos La 400 S.A.',
    operatorPhone: '+506 2261-0000',
    province: 'Heredia',
    provincesServed: ['San José', 'Heredia'],
    color: '#7c4ddb',
    tariffRegular: '₡610',
    tariffDirect: '₡610 (Servicio Único)',
    originTerminal: 'Terminal San José (Calle 1, Av. 7 y 9, Parque España)',
    destinationTerminal: 'Terminal La 400 Heredia (Calle 4, Av. 1)',
    distanceKm: 18,
    travelTimeEst: '30 - 40 min',
    stopsCount: 6,
    weekday: {
      firstBus: '05:00',
      lastBus: '23:00',
      peakFreq: 'Cada 6 a 10 min',
      offPeakFreq: 'Cada 12 a 15 min',
      outboundDepartures: ['05:00','05:15','05:30','05:45','06:00','06:10','06:20','06:30','06:40','06:50','07:00','07:15','07:30','07:45','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:15','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      inboundDepartures: ['04:45','05:00','05:15','05:30','05:45','06:00','06:10','06:20','06:30','06:45','07:00','07:15','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30']
    },
    saturday: {
      firstBus: '05:15',
      lastBus: '22:30',
      peakFreq: 'Cada 12 min',
      offPeakFreq: 'Cada 15 min',
      outboundDepartures: ['05:15','05:30','05:50','06:10','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30'],
      inboundDepartures: ['05:00','05:20','05:40','06:00','06:20','06:45','07:15','07:45','08:15','08:45','09:15','09:45','10:15','10:45','11:15','11:45','12:15','12:45','13:15','13:45','14:15','14:45','15:15','15:45','16:15','16:45','17:15','17:45','18:15','18:45','19:15','19:45','20:15','20:45','21:15','21:45','22:15']
    },
    sunday: {
      firstBus: '05:30',
      lastBus: '22:00',
      peakFreq: 'Cada 15 a 20 min',
      offPeakFreq: 'Cada 20 min',
      outboundDepartures: ['05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'],
      inboundDepartures: ['05:15','05:45','06:15','06:45','07:15','07:45','08:15','08:45','09:15','09:45','10:15','10:45','11:15','11:45','12:15','12:45','13:15','13:45','14:15','14:45','15:15','15:45','16:15','16:45','17:15','17:45','18:15','18:45','19:15','19:45','20:15','20:45','21:15','21:45']
    }
  },
  {
    routeId: 'SJO-400',
    concession: 'SJO-400',
    name: 'San José – Cartago (vía Autopista Florencio del Castillo)',
    operator: 'Auto Transportes Lumaca S.A.',
    operatorPhone: '+506 2537-0101',
    province: 'Cartago',
    provincesServed: ['San José', 'Cartago'],
    color: '#2aa3c4',
    tariffRegular: '₡710 (Pista Ordinario)',
    tariffDirect: '₡745 (Directo Pista)',
    originTerminal: 'Terminal Lumaca San José (Calle 11, Av. 18, Sur Plaza González Víquez)',
    destinationTerminal: 'Terminal Lumaca Cartago (Costado Norte Ruinas de Cartago, Av. 2)',
    distanceKm: 25,
    travelTimeEst: '40 - 50 min',
    stopsCount: 7,
    weekday: {
      firstBus: '04:45',
      lastBus: '23:30',
      peakFreq: 'Cada 5 min',
      offPeakFreq: 'Cada 10 a 12 min',
      outboundDepartures: ['04:45','05:00','05:10','05:20','05:30','05:40','05:50','06:00','06:08','06:15','06:22','06:30','06:40','06:50','07:00','07:15','07:30','07:45','08:00','08:20','08:40','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:10','16:20','16:30','16:40','16:50','17:00','17:10','17:20','17:30','17:40','17:50','18:00','18:15','18:30','18:45','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30'],
      inboundDepartures: ['04:30','04:45','05:00','05:10','05:20','05:30','05:40','05:50','06:00','06:08','06:15','06:25','06:35','06:45','07:00','07:15','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00']
    },
    saturday: {
      firstBus: '05:00',
      lastBus: '23:00',
      peakFreq: 'Cada 10 min',
      offPeakFreq: 'Cada 12 min',
      outboundDepartures: ['05:00','05:15','05:30','05:45','06:00','06:15','06:30','06:45','07:00','07:15','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      inboundDepartures: ['04:45','05:00','05:15','05:30','05:45','06:00','06:15','06:30','06:45','07:00','07:20','07:45','08:15','08:45','09:15','09:45','10:15','10:45','11:15','11:45','12:15','12:45','13:15','13:45','14:15','14:45','15:15','15:45','16:15','16:45','17:15','17:45','18:15','18:45','19:15','19:45','20:15','20:45','21:15','21:45','22:30']
    },
    sunday: {
      firstBus: '05:30',
      lastBus: '22:30',
      peakFreq: 'Cada 12 a 15 min',
      offPeakFreq: 'Cada 15 min',
      outboundDepartures: ['05:30','06:00','06:20','06:40','07:00','07:20','07:45','08:15','08:45','09:15','09:45','10:15','10:45','11:15','11:45','12:15','12:45','13:15','13:45','14:15','14:45','15:15','15:45','16:15','16:45','17:15','17:45','18:15','18:45','19:15','19:45','20:15','20:45','21:15','21:45','22:30'],
      inboundDepartures: ['05:15','05:45','06:05','06:25','06:45','07:05','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00']
    }
  },
  {
    routeId: 'SJO-401',
    concession: 'SJO-401',
    name: 'San José – Turrialba (vía Cartago y Paraíso)',
    operator: 'TRANSTUSA (Transportes Turrialba S.A.)',
    operatorPhone: '+506 2556-0100',
    province: 'Cartago',
    provincesServed: ['San José', 'Cartago'],
    color: '#2bb885',
    tariffRegular: '₡1,840',
    tariffDirect: '₡2,050 (Directo)',
    originTerminal: 'Terminal TRANSTUSA San José (Calle 13, Av. 6, Antiguo Cine Líbano)',
    destinationTerminal: 'Terminal TRANSTUSA Turrialba (Calle 2, Av. 2)',
    distanceKm: 90,
    travelTimeEst: '1h 45 min',
    stopsCount: 6,
    weekday: {
      firstBus: '05:00',
      lastBus: '21:00',
      peakFreq: 'Cada 30-45 min',
      offPeakFreq: 'Cada 45 min',
      outboundDepartures: ['05:00','05:45','06:30','07:15','08:00','09:00','10:00','11:00','12:00','12:45','13:30','14:15','15:00','15:45','16:30','17:15','18:00','18:45','19:30','20:15','21:00'],
      inboundDepartures: ['04:30','05:15','06:00','06:45','07:30','08:15','09:15','10:15','11:15','12:15','13:00','13:45','14:30','15:15','16:00','16:45','17:30','18:15','19:00','20:00']
    },
    saturday: {
      firstBus: '05:30',
      lastBus: '20:30',
      peakFreq: 'Cada 45 min',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:15','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:30'],
      inboundDepartures: ['05:00','05:45','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30','19:30']
    },
    sunday: {
      firstBus: '06:00',
      lastBus: '20:00',
      peakFreq: 'Cada 60 min',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
      inboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30','19:30']
    }
  },
  {
    routeId: 'SJO-402',
    concession: 'SJO-402',
    name: 'Cartago – San José (Servicio Express Ciudad Jardín)',
    operator: 'Auto Transportes Lumaca S.A.',
    operatorPhone: '+506 2537-0101',
    province: 'Cartago',
    provincesServed: ['Cartago', 'San José'],
    color: '#f5a623',
    tariffRegular: '₡745',
    tariffDirect: '₡745 (Express)',
    originTerminal: 'Terminal Ciudad Jardín / Metrocentro Cartago',
    destinationTerminal: 'Plaza González Víquez San José',
    distanceKm: 24,
    travelTimeEst: '35 - 42 min',
    stopsCount: 5,
    weekday: {
      firstBus: '05:30',
      lastBus: '19:30',
      peakFreq: 'Cada 10 a 15 min (Pico)',
      offPeakFreq: 'Servicio exclusivo Horas Pico',
      outboundDepartures: ['05:30','05:45','06:00','06:15','06:30','06:45','07:00','07:15','07:30','08:00','08:30','16:00','16:20','16:40','17:00','17:20','17:40','18:00','18:30','19:00','19:30'],
      inboundDepartures: ['06:15','06:30','06:45','07:00','07:15','07:30','07:45','08:15','08:45','16:45','17:05','17:25','17:45','18:05','18:25','18:45','19:15','19:45','20:15']
    },
    saturday: {
      firstBus: '06:00',
      lastBus: '13:00',
      peakFreq: 'Cada 20 min',
      offPeakFreq: 'No opera en la tarde',
      outboundDepartures: ['06:00','06:20','06:40','07:00','07:30','08:00','08:30','09:00','11:30','12:00','12:30','13:00'],
      inboundDepartures: ['06:45','07:05','07:25','07:45','08:15','08:45','09:15','09:45','12:15','12:45','13:15','13:45']
    },
    sunday: {
      firstBus: 'Sin servicio',
      lastBus: 'Sin servicio',
      peakFreq: 'Usa ruta ordinaria SJO-400',
      offPeakFreq: 'Usa ruta ordinaria SJO-400',
      outboundDepartures: ['Consulte servicio ordinario SJO-400 Lumaca'],
      inboundDepartures: ['Consulte servicio ordinario SJO-400 Lumaca']
    }
  },
  {
    routeId: 'SJO-600',
    concession: 'SJO-600',
    name: 'San José – Desamparados – Aserrí',
    operator: 'Autotransportes Desamparados S.A.',
    operatorPhone: '+506 2259-8080',
    province: 'San José',
    provincesServed: ['San José'],
    color: '#e24c6c',
    tariffRegular: '₡535',
    tariffDirect: '₡535',
    originTerminal: 'Terminal San José (Av. 6 y 8, Calles 2 y 4, Costado Parque Central)',
    destinationTerminal: 'Terminal Aserrí Centro (Frente Iglesia Parroquial)',
    distanceKm: 20,
    travelTimeEst: '35 - 50 min',
    stopsCount: 5,
    weekday: {
      firstBus: '04:30',
      lastBus: '23:00',
      peakFreq: 'Cada 6 a 10 min',
      offPeakFreq: 'Cada 12 min',
      outboundDepartures: ['04:30','04:45','05:00','05:10','05:20','05:30','05:40','05:50','06:00','06:10','06:20','06:30','06:45','07:00','07:15','07:30','07:45','08:00','08:20','08:40','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:20','18:40','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
      inboundDepartures: ['04:15','04:30','04:45','05:00','05:10','05:20','05:30','05:40','05:50','06:00','06:10','06:20','06:35','06:50','07:05','07:20','07:40','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45','18:00','18:20','18:50','19:20','19:50','20:20','20:50','21:20','22:00','22:30']
    },
    saturday: {
      firstBus: '04:45',
      lastBus: '22:30',
      peakFreq: 'Cada 10 a 12 min',
      offPeakFreq: 'Cada 15 min',
      outboundDepartures: ['04:45','05:00','05:20','05:40','06:00','06:20','06:40','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30'],
      inboundDepartures: ['04:30','04:45','05:05','05:25','05:45','06:05','06:25','06:45','07:15','07:45','08:15','08:45','09:15','09:45','10:15','10:45','11:15','11:45','12:15','12:45','13:15','13:45','14:15','14:45','15:15','15:45','16:15','16:45','17:15','17:45','18:15','18:45','19:15','19:45','20:15','20:45','21:15','21:45','22:15']
    },
    sunday: {
      firstBus: '05:00',
      lastBus: '22:00',
      peakFreq: 'Cada 15 min',
      offPeakFreq: 'Cada 20 min',
      outboundDepartures: ['05:00','05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'],
      inboundDepartures: ['04:45','05:15','05:45','06:15','06:45','07:15','07:45','08:15','08:45','09:15','09:45','10:15','10:45','11:15','11:45','12:15','12:45','13:15','13:45','14:15','14:45','15:15','15:45','16:15','16:45','17:15','17:45','18:15','18:45','19:15','19:45','20:15','20:45','21:15','21:45']
    }
  },
  {
    routeId: 'SJO-601',
    concession: 'SJO-601',
    name: 'San José – San Isidro de El General (Pérez Zeledón)',
    operator: 'MUSOC (Empresa de Transportes M.U.S.O.C. S.A.)',
    operatorPhone: '+506 2222-2422',
    province: 'San José',
    provincesServed: ['San José', 'Puntarenas'],
    color: '#ff7043',
    tariffRegular: '₡4,250',
    tariffDirect: '₡4,250 (Servicio Regular Cerro de la Muerte)',
    originTerminal: 'Terminal MUSOC San José (Calle 16, Av. 22)',
    destinationTerminal: 'Terminal MUSOC San Isidro de El General (Calle Central)',
    distanceKm: 120,
    travelTimeEst: '3h 15 min',
    stopsCount: 5,
    weekday: {
      firstBus: '05:30',
      lastBus: '18:30',
      peakFreq: 'Salidas cada hora',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30'],
      inboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30']
    },
    saturday: {
      firstBus: '05:30',
      lastBus: '18:30',
      peakFreq: 'Salidas cada hora',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30'],
      inboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30']
    },
    sunday: {
      firstBus: '05:30',
      lastBus: '18:30',
      peakFreq: 'Salidas cada hora',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30'],
      inboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','18:30']
    }
  },
  {
    routeId: 'PAC-327',
    concession: 'PAC-327',
    name: 'San José – Puntarenas (vía Esparza e Interamericana)',
    operator: 'Empresarios Unidos de Puntarenas S.A.',
    operatorPhone: '+506 2222-0064',
    province: 'Puntarenas',
    provincesServed: ['San José', 'Alajuela', 'Puntarenas'],
    color: '#26c6da',
    tariffRegular: '₡3,100 (Colectivo)',
    tariffDirect: '₡3,420 (Directo)',
    originTerminal: 'Terminal 7-10 San José (Av. 7, Calles 8 y 10, Paso de la Vaca)',
    destinationTerminal: 'Terminal Puntarenas (Paseo de los Turistas, Costado Muelle)',
    distanceKm: 110,
    travelTimeEst: '2h 15 min',
    stopsCount: 5,
    weekday: {
      firstBus: '06:00',
      lastBus: '19:30',
      peakFreq: 'Cada 40 a 50 min',
      offPeakFreq: 'Cada 50 min',
      outboundDepartures: ['06:00','06:40','07:30','08:15','09:00','10:00','11:00','12:00','12:45','13:30','14:15','15:00','16:00','16:45','17:30','18:30','19:30'],
      inboundDepartures: ['05:30','06:15','07:00','07:45','08:30','09:30','10:30','11:30','12:15','13:00','13:45','14:30','15:30','16:15','17:00','18:00','19:00']
    },
    saturday: {
      firstBus: '06:00',
      lastBus: '19:30',
      peakFreq: 'Cada 45 min',
      offPeakFreq: 'Cada 50 min',
      outboundDepartures: ['06:00','06:45','07:30','08:15','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:30'],
      inboundDepartures: ['05:30','06:15','07:00','07:45','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','19:00']
    },
    sunday: {
      firstBus: '06:30',
      lastBus: '19:30',
      peakFreq: 'Cada 45 min (Retorno reforzado)',
      offPeakFreq: 'Cada 50 min',
      outboundDepartures: ['06:30','07:15','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:30'],
      inboundDepartures: ['05:30','06:15','07:00','08:00','09:00','10:00','11:00','12:00','12:40','13:20','14:00','14:40','15:20','16:00','16:40','17:20','18:00','19:00']
    }
  },
  {
    routeId: 'GUA-900',
    concession: 'GUA-900',
    name: 'San José – Liberia (vía Cañas y Bagaces)',
    operator: 'Pulmitan de Liberia S.A.',
    operatorPhone: '+506 2222-0610',
    province: 'Guanacaste',
    provincesServed: ['San José', 'Alajuela', 'Puntarenas', 'Guanacaste'],
    color: '#66bb6a',
    tariffRegular: '₡5,100',
    tariffDirect: '₡5,100 (Directo Guanacaste)',
    originTerminal: 'Terminal Pulmitan San José (Calle 14, Av. 1 y 3, Paso de la Vaca)',
    destinationTerminal: 'Terminal Pulmitan Liberia (Costado Este Parque Central)',
    distanceKm: 230,
    travelTimeEst: '4h 15 min',
    stopsCount: 6,
    weekday: {
      firstBus: '06:00',
      lastBus: '20:00',
      peakFreq: 'Salidas cada 1 a 2 horas',
      offPeakFreq: 'Cada 2 horas',
      outboundDepartures: ['06:00','07:00','09:00','11:00','13:00','15:00','17:00','19:00','20:00'],
      inboundDepartures: ['05:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00']
    },
    saturday: {
      firstBus: '06:00',
      lastBus: '20:00',
      peakFreq: 'Salidas cada 2 horas',
      offPeakFreq: 'Cada 2 horas',
      outboundDepartures: ['06:00','07:00','09:00','11:00','13:00','15:00','17:00','19:00','20:00'],
      inboundDepartures: ['05:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00']
    },
    sunday: {
      firstBus: '06:00',
      lastBus: '20:00',
      peakFreq: 'Salidas cada 2 horas (Refuerzo)',
      offPeakFreq: 'Cada 2 horas',
      outboundDepartures: ['06:00','07:00','09:00','11:00','13:00','15:00','17:00','19:00','20:00'],
      inboundDepartures: ['05:00','06:00','08:00','10:00','11:30','13:00','14:30','16:00','17:30','19:00','20:00']
    }
  },
  {
    routeId: 'CAR-32',
    concession: 'CAR-32',
    name: 'San José – Puerto Limón (vía Guápiles, Ruta 32)',
    operator: 'Autotransportes Caribeños S.A.',
    operatorPhone: '+506 2222-0610',
    province: 'Limón',
    provincesServed: ['San José', 'Heredia', 'Limón'],
    color: '#ab47bc',
    tariffRegular: '₡4,650',
    tariffDirect: '₡4,950 (Directo Caribe)',
    originTerminal: 'Gran Terminal del Caribe San José (Calle Central, Av. 15)',
    destinationTerminal: 'Terminal Caribeños Limón Centro (Parque Vargas / Av. 2)',
    distanceKm: 160,
    travelTimeEst: '3h 30 min',
    stopsCount: 6,
    weekday: {
      firstBus: '05:30',
      lastBus: '19:00',
      peakFreq: 'Cada hora',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','19:00'],
      inboundDepartures: ['05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:30']
    },
    saturday: {
      firstBus: '05:30',
      lastBus: '19:00',
      peakFreq: 'Cada hora',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','19:00'],
      inboundDepartures: ['05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:30']
    },
    sunday: {
      firstBus: '05:30',
      lastBus: '19:00',
      peakFreq: 'Cada hora',
      offPeakFreq: 'Cada 60 min',
      outboundDepartures: ['05:30','06:30','07:30','08:30','09:30','10:30','11:30','12:30','13:30','14:30','15:30','16:30','17:30','19:00'],
      inboundDepartures: ['05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:30']
    }
  }
];

const schedulesState = {
  day: 'weekday',
  dir: 'outbound',
  query: '',
  province: 'all'
};

function getCostaRicaTime() {
  const now = new Date();
  // Costa Rica está en UTC-6 todo el año (no tiene horario de verano)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc - (3600000 * 6));
}

function updateCostaRicaClock() {
  const clockEl = document.getElementById('crLiveClock');
  if (!clockEl) return;
  const crNow = getCostaRicaTime();
  const h = String(crNow.getHours()).padStart(2, '0');
  const m = String(crNow.getMinutes()).padStart(2, '0');
  const s = String(crNow.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${h}:${m}:${s}`;
}
setInterval(updateCostaRicaClock, 1000);
updateCostaRicaClock();

function findNextDeparture(departures, crNow) {
  if (!Array.isArray(departures) || !departures.length) return null;
  const currentMinutes = crNow.getHours() * 60 + crNow.getMinutes();
  for (const dep of departures) {
    const parts = dep.split(':');
    if (parts.length === 2) {
      const depMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if (depMinutes >= currentMinutes) {
        return dep;
      }
    }
  }
  return null; // Ya concluyeron las salidas de hoy
}

function renderSchedules() {
  const container = document.getElementById('schedulesContainer');
  const countEl = document.getElementById('schedulesCount');
  if (!container) return;

  const crNow = getCostaRicaTime();
  const q = schedulesState.query.trim().toLowerCase();
  const dayKey = schedulesState.day; // 'weekday' | 'saturday' | 'sunday'
  const isOutbound = schedulesState.dir === 'outbound';

  const filtered = CR_BUS_SCHEDULES.filter(s => {
    const matchProvince = schedulesState.province === 'all' || s.provincesServed.includes(schedulesState.province);
    const haystack = [s.routeId, s.concession, s.name, s.operator, s.originTerminal, s.destinationTerminal, ...s.provincesServed].join(' ').toLowerCase();
    const matchQuery = !q || haystack.includes(q);
    return matchProvince && matchQuery;
  });

  if (countEl) {
    const dayLabels = { weekday: 'Lunes a Viernes', saturday: 'Sábados', sunday: 'Domingos y Feriados' };
    countEl.innerHTML = `Mostrando <strong>${filtered.length}</strong> de ${CR_BUS_SCHEDULES.length} rutas oficiales · Horario <strong>${dayLabels[dayKey]}</strong> · Sentido: <strong>${isOutbound ? 'Ida' : 'Retorno'}</strong>`;
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="schedules-empty-card">
        <span style="font-size:2.4rem">🔍</span>
        <h3>No se encontraron rutas con los filtros aplicados</h3>
        <p>Prueba buscando por concesión (ej. <em>SJO-201</em>), provincia o nombre del operador (ej. <em>TUASA</em>, <em>Lumaca</em>).</p>
        <button class="btn-primary btn-sm" id="schedEmptyResetBtn" style="margin-top:12px">Restablecer filtros</button>
      </div>
    `;
    const emptyBtn = document.getElementById('schedEmptyResetBtn');
    if (emptyBtn) emptyBtn.addEventListener('click', resetSchedulesFilters);
    return;
  }

  container.innerHTML = filtered.map(item => {
    const dayData = item[dayKey] || item.weekday;
    const departures = isOutbound ? dayData.outboundDepartures : dayData.inboundDepartures;
    const nextDep = findNextDeparture(departures, crNow);
    const origin = isOutbound ? item.originTerminal : item.destinationTerminal;
    const dest = isOutbound ? item.destinationTerminal : item.originTerminal;
    const currentMins = crNow.getHours() * 60 + crNow.getMinutes();

    return `
      <article class="schedule-card" style="--route-accent:${item.color};">
        <header class="schedule-card-header">
          <div class="sched-card-top-row">
            <span class="sched-concession-badge" style="background:${item.color}22; color:${item.color}; border:1px solid ${item.color}55;">
              CTP ${esc(item.concession)}
            </span>
            <span class="sched-province-tag">📍 ${esc(item.province)}</span>
            <span class="sched-tariff-pill" title="Tarifa aprobada por ARESEP">
              💵 ${esc(item.tariffRegular)}
            </span>
          </div>
          <h3 class="sched-route-name">${esc(item.name)}</h3>
          <p class="sched-operator">Empresa: <strong>${esc(item.operator)}</strong> · 📞 ${esc(item.operatorPhone)}</p>
        </header>

        <div class="sched-terminal-flow">
          <div class="sched-term-point">
            <span class="sched-term-bullet origin"></span>
            <div>
              <span class="sched-term-role">ORIGEN (${isOutbound ? 'Ida' : 'Retorno'})</span>
              <p class="sched-term-text">${esc(origin)}</p>
            </div>
          </div>
          <div class="sched-term-arrow">
            <span>➜</span>
            <small>${item.distanceKm} km · aprox. ${item.travelTimeEst}</small>
          </div>
          <div class="sched-term-point">
            <span class="sched-term-bullet dest"></span>
            <div>
              <span class="sched-term-role">DESTINO</span>
              <p class="sched-term-text">${esc(dest)}</p>
            </div>
          </div>
        </div>

        <div class="sched-key-metrics-grid">
          <div class="sched-metric-box">
            <span class="sched-metric-lbl">Primer bus</span>
            <strong class="sched-metric-val">${esc(dayData.firstBus)}</strong>
          </div>
          <div class="sched-metric-box">
            <span class="sched-metric-lbl">Último bus</span>
            <strong class="sched-metric-val">${esc(dayData.lastBus)}</strong>
          </div>
          <div class="sched-metric-box">
            <span class="sched-metric-lbl">Frec. Hora Pico</span>
            <strong class="sched-metric-val">${esc(dayData.peakFreq)}</strong>
          </div>
          <div class="sched-metric-box">
            <span class="sched-metric-lbl">Frec. Hora Valle</span>
            <strong class="sched-metric-val">${esc(dayData.offPeakFreq)}</strong>
          </div>
        </div>

        <div class="sched-departures-panel">
          <div class="sched-departures-head">
            <span class="sched-dep-title">🕒 Salidas programadas (${departures.length})</span>
            ${nextDep ? `<span class="sched-next-dep-pill">Próxima salida: <strong>${nextDep}</strong></span>` : '<span class="sched-no-more-pill">Servicio finalizado por hoy</span>'}
          </div>
          <div class="sched-pills-wrap">
            ${departures.map(d => {
              const parts = d.split(':');
              const dMin = parts.length === 2 ? (parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)) : -1;
              const isPassed = dMin !== -1 && dMin < currentMins;
              const isNext = d === nextDep;
              const cls = isNext ? 'sched-pill next' : isPassed ? 'sched-pill passed' : 'sched-pill';
              return `<span class="${cls}" title="${isNext ? 'Próxima salida inmediata' : isPassed ? 'Salida anterior' : 'Próxima salida'}">${d}</span>`;
            }).join('')}
          </div>
        </div>

        <footer class="sched-card-footer">
          <button class="sched-action-btn primary" data-view-map-route="${item.routeId}">
            🗺️ Ver paradas en mapa
          </button>
          <button class="sched-action-btn" data-copy-schedule="${item.routeId}">
            📋 Copiar itinerario
          </button>
        </footer>
      </article>
    `;
  }).join('');

  // Vincular botones de acciones por tarjeta
  container.querySelectorAll('[data-view-map-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.viewMapRoute;
      const route = ROUTES.find(r => r.id === rid);
      if (route) {
        toast(`Ruta ${route.concession || route.id}: ${route.name}`, 'info');
        focusRouteOnMap(route);
      }
    });
  });

  container.querySelectorAll('[data-copy-schedule]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.copySchedule;
      const route = CR_BUS_SCHEDULES.find(r => r.routeId === rid);
      if (!route) return;
      const dayData = route[schedulesState.day] || route.weekday;
      const departures = schedulesState.dir === 'outbound' ? dayData.outboundDepartures : dayData.inboundDepartures;
      const text = `🚌 Horario Referencial: ${route.concession} - ${route.name}\nOperador: ${route.operator}\nTarifa Aprox.: ${route.tariffRegular}\nOrigen: ${route.originTerminal}\nDestino: ${route.destinationTerminal}\nPrimer bus: ${dayData.firstBus} | Último bus: ${dayData.lastBus}\nFrecuencia: ${dayData.peakFreq}\nSalidas:\n${departures.join(', ')}\n(Nota: Sujeto a variaciones de la empresa operadora)`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          toast(`📋 Itinerario de ${route.concession} copiado al portapapeles`, 'ok');
        }).catch(() => toast('No se pudo copiar el texto', 'warn'));
      } else {
        toast(`Ruta ${route.concession}: ${departures.length} salidas programadas`, 'info');
      }
    });
  });
}

function resetSchedulesFilters() {
  schedulesState.query = '';
  schedulesState.province = 'all';
  schedulesState.day = 'weekday';
  schedulesState.dir = 'outbound';
  const searchInput = document.getElementById('schedulesSearch');
  if (searchInput) searchInput.value = '';
  const provFilter = document.getElementById('schedulesProvinceFilter');
  if (provFilter) provFilter.value = 'all';
  document.querySelectorAll('.sched-day-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.day === 'weekday');
    btn.setAttribute('aria-selected', String(btn.dataset.day === 'weekday'));
  });
  const outBtn = document.getElementById('schedDirOutbound');
  const inBtn = document.getElementById('schedDirInbound');
  if (outBtn) outBtn.classList.add('active');
  if (inBtn) inBtn.classList.remove('active');
  renderSchedules();
}

function setupSchedulesEventListeners() {
  const searchInput = document.getElementById('schedulesSearch');
  if (searchInput && !searchInput._bound) {
    searchInput._bound = true;
    searchInput.addEventListener('input', (e) => {
      schedulesState.query = e.target.value;
      renderSchedules();
    });
  }

  const provFilter = document.getElementById('schedulesProvinceFilter');
  if (provFilter && !provFilter._bound) {
    provFilter._bound = true;
    provFilter.addEventListener('change', (e) => {
      schedulesState.province = e.target.value;
      renderSchedules();
    });
  }

  document.querySelectorAll('.sched-day-btn').forEach(btn => {
    if (!btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sched-day-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        schedulesState.day = btn.dataset.day;
        renderSchedules();
      });
    }
  });

  const outBtn = document.getElementById('schedDirOutbound');
  const inBtn = document.getElementById('schedDirInbound');
  if (outBtn && !outBtn._bound) {
    outBtn._bound = true;
    outBtn.addEventListener('click', () => {
      outBtn.classList.add('active');
      if (inBtn) inBtn.classList.remove('active');
      schedulesState.dir = 'outbound';
      renderSchedules();
    });
  }
  if (inBtn && !inBtn._bound) {
    inBtn._bound = true;
    inBtn.addEventListener('click', () => {
      inBtn.classList.add('active');
      if (outBtn) outBtn.classList.remove('active');
      schedulesState.dir = 'inbound';
      renderSchedules();
    });
  }

  const resetBtn = document.getElementById('schedulesResetBtn');
  if (resetBtn && !resetBtn._bound) {
    resetBtn._bound = true;
    resetBtn.addEventListener('click', () => {
      resetSchedulesFilters();
      toast('Filtros de horarios restablecidos', 'info');
    });
  }

  const printBtn = document.getElementById('schedulesPrintBtn');
  if (printBtn && !printBtn._bound) {
    printBtn._bound = true;
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Vincular botones de la barra inferior móvil
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    if (!btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', () => {
        navigate(btn.dataset.view);
        hapticFeedback([10, 20]);
      });
    }
  });
}

// Inicialización de escuchadores de Horarios
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSchedulesEventListeners);
} else {
  setupSchedulesEventListeners();
}

/* ==========================================================
   COMPATIBILIDAD CON VISTA DE FLOTA PREVIA (SAFE DEGRADATION)
   ========================================================== */
function visibleBuses() {
  const searchEl = $('fleetSearch');
  if (!searchEl) return buses;
  const q = searchEl.value.trim().toLowerCase();
  const status = $('statusFilter') ? $('statusFilter').value : '';
  const route = $('routeFilter') ? $('routeFilter').value : '';

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
  renderSchedules();
  const tbody = $('fleetTableBody');
  if (!tbody) return;
  const rows = visibleBuses();
  if ($('fleetCount')) {
    $('fleetCount').textContent = rows.length === buses.length
      ? `${buses.length} buses en la flota`
      : `${rows.length} de ${buses.length} buses`;
  }
  tbody.innerHTML = rows.map(b => {
    const pct = Math.round((b.passengers / b.capacity) * 100);
    const barColor = pct > 85 ? cssVar('--risk') : pct > 60 ? cssVar('--warn') : cssVar('--ok');
    return `
    <tr>
      <td>${esc(b.id)}</td>
      <td class="mono">${esc(b.plate)}</td>
      <td><span class="route-pill" style="background:${esc(b.route.color)}22;color:${esc(b.route.color)}">Ruta ${esc(b.route.id)}</span></td>
      <td>${esc(b.driver.name)}</td>
      <td class="mono">${esc(b.speed)} km/h</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:7px">
          <span class="mini-bar"><span style="width:${pct}%;background:${barColor}"></span></span>
          ${esc(b.passengers)}/${esc(b.capacity)}
        </span>
      </td>
      <td>
        <select class="status-select status-${esc(b.status)}" data-status-select="${esc(b.id)}" aria-label="Cambiar el estado de ${esc(b.id)}">
          <option value="active" ${b.status === 'active' ? 'selected' : ''}>En servicio</option>
          <option value="delayed" ${b.status === 'delayed' ? 'selected' : ''}>Retrasado</option>
          <option value="stopped" ${b.status === 'stopped' ? 'selected' : ''}>Detenido</option>
          <option value="maintenance" ${b.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
        </select>
      </td>
      <td style="color:var(--text-soft)">hace ${esc(b.updatedAgo)} min</td>
      <td>
        <span class="table-actions">
          <button class="table-btn" data-bus="${esc(b.id)}" title="Ver detalle" aria-label="Ver detalle de ${esc(b.id)}">${ICON_EYE}</button>
          <button class="table-btn" data-track="${esc(b.id)}" title="Ver en el mapa" aria-label="Ver ${esc(b.id)} en el mapa">${ICON_PIN}</button>
        </span>
      </td>
    </tr>`;
  }).join('');
}

// Enlaces seguros para controles de flota si existen
if ($('fleetSearch')) $('fleetSearch').addEventListener('input', renderFleet);
if ($('statusFilter')) $('statusFilter').addEventListener('change', renderFleet);
if ($('routeFilter')) $('routeFilter').addEventListener('change', renderFleet);
if ($('fleetTableBody')) {
  $('fleetTableBody').addEventListener('change', e => {
    const sel = e.target.closest('[data-status-select]');
    if (!sel) return;
    const bus = buses.find(b => b.id === sel.dataset.statusSelect);
    if (!bus) return;
    applyBusStatus(bus, sel.value);
    refreshAfterStatusChange(bus);
    toast('Estado de ' + bus.id + ' actualizado a ' + statusLabel(bus.status), 'ok');
  });
}
if ($('resetFiltersBtn')) {
  $('resetFiltersBtn').addEventListener('click', () => {
    if ($('fleetSearch')) $('fleetSearch').value = '';
    if ($('statusFilter')) $('statusFilter').value = '';
    if ($('routeFilter')) $('routeFilter').value = '';
    state.sort = { key: 'id', dir: 1 };
    $$('.fleet-table th').forEach(th => th.classList.remove('sorted', 'desc'));
    renderFleet();
    toast('Filtros restablecidos');
  });
}
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
if ($('exportCsvBtn')) {
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
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flota-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Archivo CSV generado y descargado', 'ok');
  });
}
 
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

// Rutas GPS reales trazadas sobre carreteras, autopistas y calles reales de Costa Rica
const ROUTE_GPS_PATHS = {
  // 1. SJO-201: San José ↔ Alajuela (Autopista General Cañas / Ruta 1)
  'SJO-201': [
    [9.9348, -84.0864], // Terminal Coca-Cola / Av. 1
    [9.9355, -84.0950], // Paseo Colón
    [9.9360, -84.1035], // Estatua León Cortés / Parque La Sabana
    [9.9430, -84.1110], // Salida a Ruta 1 / Corobicí
    [9.9485, -84.1160], // Puente Juan Pablo II / Pozuelo
    [9.9535, -84.1225], // Frente a Hospital México
    [9.9570, -84.1270], // Hotel San José Palacio
    [9.9675, -84.1440], // Puente Río Virilla ("La Platina")
    [9.9750, -84.1565], // Castella / Cruce Barreal
    [9.9810, -84.1670], // Real Cariari / Centro de Convenciones
    [9.9865, -84.1770], // Cruce San Antonio de Belén
    [9.9910, -84.1880], // Bahía Cervecería Costa Rica
    [9.9930, -84.1950], // Río Segundo de Alajuela
    [10.0000, -84.2100], // Aeropuerto Internacional Juan Santamaría (SJO)
    [10.0075, -84.2125], // City Mall Alajuela
    [10.0120, -84.2140], // Entrada Radial Alajuela
    [10.0165, -84.2142], // Parque Central de Alajuela
    [10.0185, -84.2155], // Terminal Fecosa Alajuela
  ],

  // 2. SJO-300: San José ↔ Heredia (Ruta 3 / Ruta 5)
  'SJO-300': [
    [9.9355, -84.0760], // Terminal 7-10 / San José Centro
    [9.9430, -84.0790], // Tournón / Paso sobre Río Torres
    [9.9510, -84.0815], // Cuatro Reinas de Tibás
    [9.9570, -84.0835], // Parque San Juan de Tibás
    [9.9690, -84.0880], // Puente Río Virilla hacia Heredia
    [9.9795, -84.0915], // Basílica Santo Domingo de Heredia
    [9.9840, -84.0970], // Miraflores
    [9.9890, -84.1030], // San Pablo de Heredia / Paseo de las Flores
    [9.9950, -84.1070], // Cruce La Valencia / Pirro
    [9.9985, -84.1110], // Universidad Nacional (UNA)
    [10.0005, -84.1165], // Parque Central de Heredia
    [10.0020, -84.1180], // Terminal Central de Heredia
  ],

  // 3. SJO-400: San José ↔ Cartago (Autopista Florencio del Castillo / Ruta 2)
  'SJO-400': [
    [9.9325, -84.0780], // Terminal Lumaca San José / Calle 5
    [9.9330, -84.0650], // Barrio California / Estación al Atlántico
    [9.9335, -84.0535], // Fuente de la Hispanidad / San Pedro
    [9.9350, -84.0490], // UCR / San Pedro
    [9.9280, -84.0320], // Plaza del Sol / Curridabat
    [9.9220, -84.0200], // Hacienda Vieja
    [9.9190, -84.0090], // El Fierro / Inicio Autopista Florencio del Castillo
    [9.9120, -83.9980], // Cruce San Diego
    [9.9070, -83.9870], // Tres Ríos / La Unión
    [9.8970, -83.9550], // Alto de Ochomogo / Recope
    [9.8880, -83.9450], // Cruce Quircot
    [9.8770, -83.9350], // Taras de Cartago
    [9.8690, -83.9310], // Paseo Metrópoli
    [9.8655, -83.9260], // Colegio San Luis Gonzaga
    [9.8640, -83.9210], // Ruinas de Cartago / Plaza Mayor
    [9.8635, -83.9130], // Basílica de Los Ángeles (Cartago)
  ],

  // 4. SJO-401: San José ↔ Turrialba (Vía Cartago, Paraíso, Cervantes / Ruta 10)
  'SJO-401': [
    [9.9325, -84.0780], // San José Lumaca
    [9.8970, -83.9550], // Ochomogo
    [9.8640, -83.9210], // Cartago Centro
    [9.8550, -83.8950], // Caballo Blanco / Dulce Nombre
    [9.8390, -83.8680], // Paraíso de Cartago
    [9.8450, -83.8400], // Mirador Ujarrás cruce
    [9.8620, -83.8220], // Birrisito
    [9.8820, -83.8050], // Cervantes de Alvarado
    [9.8890, -83.7750], // Santiago de Paraíso
    [9.8940, -83.7450], // Juan Viñas (Ruta 10)
    [9.8990, -83.7150], // Chitaría
    [9.9010, -83.6950], // Entrada a Turrialba
    [9.9048, -83.6835], // Terminal Central Transtusa (Turrialba)
  ],

  // 5. SJO-402: Cartago ↔ San José Express Ciudad Jardín
  'SJO-402': [
    [9.8635, -83.9130], // Basílica de Los Ángeles
    [9.8640, -83.9210], // Cartago Plaza Mayor
    [9.8770, -83.9350], // Taras
    [9.8970, -83.9550], // Ochomogo
    [9.9070, -83.9870], // Pista Florencio del Castillo
    [9.9230, -84.0570], // Rotonda de las Garantías Sociales (Zapote)
    [9.9270, -84.0740], // Plaza González Víquez
    [9.9332, -84.0768], // Terminal San José Central
  ],

  // 6. SJO-600: San José ↔ Desamparados ↔ Aserrí
  'SJO-600': [
    [9.9330, -84.0790], // Terminal San José Central
    [9.9265, -84.0745], // Plaza González Víquez
    [9.9140, -84.0710], // Parque de la Paz
    [9.9040, -84.0680], // San Antonio de Desamparados
    [9.8974, -84.0664], // Desamparados Centro (Parque Central)
    [9.8880, -84.0690], // El Cruce de Aserrí
    [9.8750, -84.0760], // Salitrillos
    [9.8630, -84.0880], // Aserrí Centro (Parque y Parroquia)
  ],

  // 7. SJO-601: San José ↔ San Isidro de El General (Pérez Zeledón / Ruta 2)
  'SJO-601': [
    [9.9330, -84.0790], // San José Terminal Musoc
    [9.8770, -83.9350], // Cartago Taras
    [9.8450, -83.9380], // Tejar del Guarco
    [9.8120, -83.9420], // La Cangreja
    [9.7420, -83.9510], // El Empalme (Ruta 2)
    [9.7050, -83.9200], // Casa Mata
    [9.6580, -83.8650], // Cañón del Guarco
    [9.6380, -83.8420], // La Georgina
    [9.5630, -83.7540], // Cerro de la Muerte (Cumbre Interamericana)
    [9.4980, -83.7220], // División de Pérez Zeledón
    [9.4200, -83.7090], // Rivas cruce
    [9.3735, -83.7045], // San Isidro de El General Centro
  ],

  // 8. PAC-327: San José ↔ Puntarenas (Ruta 27 / Caldera / Esparza)
  'PAC-327': [
    [9.9348, -84.1042], // Sabana Oeste / Inicio Ruta 27
    [9.9450, -84.1480], // Multiplaza Escazú
    [9.9380, -84.1950], // Forum / Santa Ana
    [9.9330, -84.2280], // Peaje Ciudad Colón
    [9.9250, -84.3400], // Atenas Cruce (Ruta 27)
    [9.9120, -84.5200], // Coyolar / Orotina
    [9.9170, -84.7170], // Puerto Caldera
    [9.9880, -84.6680], // Esparza cruce
    [9.9790, -84.7350], // Barranca entrada
    [9.9810, -84.7750], // El Roble de Puntarenas
    [9.9830, -84.8080], // Chacarita
    [9.9770, -84.8380], // Paseo de los Turistas
    [9.9760, -84.8480], // Terminal Central de Puntarenas
  ],

  // 9. GUA-900: San José ↔ Liberia (Interamericana Norte / Ruta 1)
  'GUA-900': [
    [10.0004, -84.2141], // Alajuela / Cañas
    [10.0450, -84.3500], // Naranjo cruce
    [10.0580, -84.4320], // Palmares
    [10.0880, -84.4710], // San Ramón (Empresarios Unidos)
    [10.0150, -84.6320], // Cambronero
    [9.9920, -84.7320],  // Barranca Interamericana Norte
    [10.0850, -84.7890], // Miramar cruce
    [10.2980, -84.9850], // Limonal
    [10.4312, -85.0945], // Cañas Centro
    [10.5285, -85.2582], // Bagaces Parque Central
    [10.6315, -85.4382], // Terminal Municipal Liberia
    [10.5935, -85.5442], // Aeropuerto Guanacaste (LIR)
  ],

  // 10. CAR-32: San José ↔ Limón (Ruta 32 Braulio Carrillo)
  'CAR-32': [
    [9.9412, -84.0720], // Terminal Caribeños San José
    [10.0180, -84.0250], // San Isidro de Heredia cruce
    [10.0520, -84.0120], // Túnel Zurquí (Braulio Carrillo)
    [10.1530, -83.9520], // Cruce Río Sucio
    [10.2152, -83.7845], // Guápiles Centro (Terminal Pococí)
    [10.2115, -83.6845], // Guácimo Centro
    [10.0982, -83.5075], // Siquirres Centro (Ruta 32)
    [10.0842, -83.3345], // Batán de Matina
    [10.0095, -83.1315], // Liverpool
    [10.0012, -83.0785], // Puerto Moín (APM Terminals)
    [9.9935, -83.0332],  // Terminal Caribeños Limón Centro
  ],
};

// Tabla de distancias acumuladas por longitud de arco para avance realista
const ROUTE_DISTANCES = {};
function initRouteDistances() {
  for (const [routeId, coords] of Object.entries(ROUTE_GPS_PATHS)) {
    const dists = [0];
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const dLat = p2[0] - p1[0];
      const dLon = (p2[1] - p1[1]) * Math.cos(((p1[0] + p2[0]) / 2) * (Math.PI / 180));
      const d = Math.sqrt(dLat * dLat + dLon * dLon);
      total += d;
      dists.push(total);
    }
    ROUTE_DISTANCES[routeId] = { total: total || 1, dists };
  }
}
initRouteDistances();

let realLeafletMap = null;
let leafletMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
  highlightLayer: null,
};

let dashboardLeafletMap = null;
let dashboardMarkers = {
  buses: {},
  stops: {},
  user: null,
  routes: {},
  highlightLayer: null,
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
      resetMapRouteHighlight();
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
  if (state.trackingBus) {
    const trackedBus = buses.find(b => b.id === state.trackingBus);
    if (trackedBus) {
      highlightRouteForBus(trackedBus);
      centerMapOnBus(state.trackingBus, true);
    }
  }
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
  if (state.trackingBus) {
    const trackedBus = buses.find(b => b.id === state.trackingBus);
    if (trackedBus) {
      highlightRouteForBus(trackedBus);
    }
  }
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
      poly.bindTooltip('<b>' + esc(r.concession || r.id) + '</b> ' + esc(r.name) + (r.operator ? '<br><small style="opacity:.8">' + esc(r.operator) + '</small>' : ''), { sticky: true, className: 'route-tooltip' });
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
        (isMini ? '' : '<span class="badge" style="margin-top:6px; display:inline-block; font-size:10px;">' + esc(s.province || 'Costa Rica') + '</span>') +
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

// Interpola posición GPS para un bus según su progreso _t [0..1] sobre las calles reales
function getBusGpsPosition(bus) {
  if (bus && bus._gpsOverride) return bus._gpsOverride;
  const routeId = (bus && bus.route && bus.route.id) || 'SJO-201';
  const coords = ROUTE_GPS_PATHS[routeId] || ROUTE_GPS_PATHS['SJO-201'];
  if (!coords || !coords.length) return [9.9333, -84.0833];

  const meta = ROUTE_DISTANCES[routeId] || ROUTE_DISTANCES['SJO-201'];
  if (!meta || !meta.dists || meta.dists.length < 2) return coords[0];

  const t = Math.max(0, Math.min(1, bus._t !== undefined ? bus._t : 0.5));
  const targetDist = t * meta.total;

  let index = 0;
  for (let i = 0; i < meta.dists.length - 1; i++) {
    if (targetDist <= meta.dists[i + 1]) {
      index = i;
      break;
    }
  }

  const p1 = coords[index];
  const p2 = coords[index + 1] || p1;
  const segDist = meta.dists[index + 1] - meta.dists[index];
  const fraction = segDist > 0 ? (targetDist - meta.dists[index]) / segDist : 0;

  const lat = p1[0] + (p2[0] - p1[0]) * fraction;
  const lon = p1[1] + (p2[1] - p1[1]) * fraction;
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
          '<strong>' + esc(b.id) + '</strong> · Ruta ' + esc(b.route.id) + '<br/>' +
          esc(String(b.speed)) + ' km/h · ' + esc(String(b.passengers)) + ' pas.',
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
              '<span>' + esc(String(b.num || b.id.replace('BUS-', ''))) + '</span>' +
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
          '<strong>' + esc(b.id) + '</strong> · Ruta ' + esc(b.route.id) + '<br/>' +
          esc(String(b.speed)) + ' km/h',
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
    '<div class="map-bus-item ' + (state.highlightBus === b.id ? 'highlight' : '') + '" data-bus="' + esc(b.id) + '" role="button" tabindex="0">' +
      '<span class="map-bus-dot" style="background:' + b.route.color + '"></span>' +
      '<span class="map-bus-info">' +
        '<span class="map-bus-id">' + esc(b.id) + '</span>' +
        '<span class="map-bus-route">Ruta ' + esc(b.route.id) + ' · ' + esc(String(b.speed)) + ' km/h</span>' +
      '</span>' +
      '<span class="status-badge status-' + esc(b.status) + '">' + esc(statusLabel(b.status)) + '</span>' +
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

// Resalta la calle/recorrido en el mapa con el color oficial de la ruta del bus
function applyRouteHighlightToMap(mapInstance, markersStore, bus, isMini) {
  if (!mapInstance || !markersStore) {
    console.warn('⚠️ applyRouteHighlight: map or store is null', { map: !!mapInstance, store: !!markersStore, bus: bus.id, isMini });
    return;
  }

  const routeId = (bus.route && (bus.route.id || bus.route)) || 'SJO-201';
  const coords = ROUTE_GPS_PATHS[routeId] || ROUTE_GPS_PATHS['SJO-201'];
  if (!coords || coords.length < 2) {
    console.warn('⚠️ applyRouteHighlight: no coords for route', { routeId });
    return;
  }

  const color = (bus.route && bus.route.color) || '#38bdf8';

  // 1. Atenuar todas las demás rutas de fondo para dar contraste espectacular a la calle elegida
  if (markersStore.routes) {
    Object.entries(markersStore.routes).forEach(([id, poly]) => {
      if (poly && poly.setStyle) {
        const isThisRoute = id === routeId;
        poly.setStyle({
          opacity: isThisRoute ? 0.2 : 0.08,
          weight: isMini ? 2 : 3
        });
      }
    });
  }

  // 2. Limpiar resaltado anterior si existe
  if (markersStore.highlightLayer) {
    try { mapInstance.removeLayer(markersStore.highlightLayer); } catch (_) {}
    markersStore.highlightLayer = null;
  }

  // 3. Trazado vial iluminado sobre la calle:
  // A) Borde exterior oscuro para contraste sobre cualquier mapa
  const casing = L.polyline(coords, {
    color: '#020617',
    weight: isMini ? 8 : 14,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round'
  });

  // B) Vía principal ancha con el color exacto de la ruta
  const mainStreet = L.polyline(coords, {
    color: color,
    weight: isMini ? 5 : 8,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round'
  });
  mainStreet.bindTooltip('🛣️ Calle de Ruta: ' + ((bus.route && bus.route.name) || canonicalRouteId), { sticky: true });

  // C) Núcleo brillante de luz interior para efecto neón
  const innerCore = L.polyline(coords, {
    color: '#ffffff',
    weight: isMini ? 1.5 : 2.5,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  });

  const layerGroup = L.layerGroup([casing, mainStreet, innerCore]).addTo(mapInstance);
  layerGroup.bringToFront();
  markersStore.highlightLayer = layerGroup;
  console.log('✅ Highlight layer added to', isMini ? 'dashboard' : 'fullmap', '| route:', canonicalRouteId, '| coords:', coords.length, '| color:', color);

  // 4. Asegurar que los marcadores de los buses queden visibles encima de la calle
  if (markersStore.buses) {
    Object.values(markersStore.buses).forEach(m => {
      if (m && m.bringToFront) m.bringToFront();
    });
  }
}

function highlightRouteForBus(bus) {
  if (!bus) {
    console.warn('⚠️ highlightRouteForBus: bus is null');
    return;
  }
  console.log('🛣️ highlightRouteForBus:', bus.id, '| route:', bus.route?.id, '| realMap:', !!realLeafletMap, '| dashMap:', !!dashboardLeafletMap);
  state.highlightBus = bus.id;
  applyRouteHighlightToMap(realLeafletMap, leafletMarkers, bus, false);
  applyRouteHighlightToMap(dashboardLeafletMap, dashboardMarkers, bus, true);
}

function clearHighlightedRoute() {
  const resetMap = (mapInstance, markersStore, isMini) => {
    if (!mapInstance || !markersStore) return;
    if (markersStore.highlightLayer) {
      try { mapInstance.removeLayer(markersStore.highlightLayer); } catch (_) {}
      markersStore.highlightLayer = null;
    }
    if (markersStore.routes) {
      Object.values(markersStore.routes).forEach(poly => {
        if (poly && poly.setStyle) {
          poly.setStyle({ opacity: 0.85, weight: isMini ? 3 : 4 });
        }
      });
    }
  };

  resetMap(realLeafletMap, leafletMarkers, false);
  resetMap(dashboardLeafletMap, dashboardMarkers, true);
}

function stopTracking(msg) {
  if (!state.trackingBus) return;
  state.trackingBus = null;
  clearHighlightedRoute();
  updateTrackingBanner();
  if (msg) toast(msg);
}

function focusBus(busId) {
  const bus = buses.find(b => b.id === busId);
  if (!bus) return;
  state.highlightBus = busId;
  state.trackingBus = busId;
  navigate('map');

  // Si el mapa aún no ha terminado de inicializarse, diferir
  if (!realLeafletMap) {
    setTimeout(() => focusBus(busId), 120);
    return;
  }

  centerMapOnBus(busId, true);
  highlightRouteForBus(bus);
  renderMapBusList();
  drawMapMarkers(true);
  updateTrackingBanner();
  toast('Siguiendo ' + busId + ' · Ruta ' + ((bus.route && bus.route.id) || ''), 'info');
}

function focusRouteOnMap(route) {
  if (!route) return;
  navigate('map');

  // Si el mapa o las capas aún no están listos, diferir
  if (!realLeafletMap || !leafletMarkers || !leafletMarkers.routes || Object.keys(leafletMarkers.routes).length === 0) {
    setTimeout(() => focusRouteOnMap(route), 120);
    return;
  }

  const rid = route.id;
  const routeStopIds = new Set(route.stopIds || []);

  // 1. Resaltar la ruta seleccionada y atenuar todas las demás
  if (leafletMarkers.routes) {
    Object.entries(leafletMarkers.routes).forEach(([id, poly]) => {
      if (!poly || !poly.setStyle) return;
      if (id === rid) {
        poly.setStyle({
          opacity: 1,
          weight: 6,
          dashArray: null,
          color: route.color || '#3b82f6'
        });
        if (poly.bringToFront) poly.bringToFront();
      } else {
        poly.setStyle({
          opacity: 0.08,
          weight: 2,
          dashArray: '4, 4'
        });
      }
    });
  }

  // 2. Resaltar las paradas de la ruta seleccionada y atenuar todas las demás
  if (leafletMarkers.stops) {
    Object.entries(leafletMarkers.stops).forEach(([sid, marker]) => {
      if (!marker) return;
      const isStopOfRoute = routeStopIds.has(sid);

      if (typeof marker.setOpacity === 'function') {
        marker.setOpacity(isStopOfRoute ? 1 : 0.08);
      }

      const el = marker.getElement ? marker.getElement() : null;
      if (el) {
        if (isStopOfRoute) {
          el.style.opacity = '1';
          el.style.zIndex = '1000';
          el.classList.add('stop-route-highlighted');
        } else {
          el.style.opacity = '0.08';
          el.style.zIndex = '1';
          el.classList.remove('stop-route-highlighted');
        }
      }

      if (isStopOfRoute && marker.bringToFront) {
        marker.bringToFront();
      }
    });
  }

  // 3. Centrar y hacer zoom a la ruta seleccionada
  const coords = ROUTE_GPS_PATHS[rid] || (route.concession && ROUTE_GPS_PATHS[route.concession]);
  if (coords && coords.length && typeof L !== 'undefined' && L.latLngBounds) {
    try {
      const bounds = L.latLngBounds(coords);
      realLeafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } catch (e) {
      console.warn('fitBounds error:', e);
    }
  } else {
    const stopPoints = [];
    if (Array.isArray(route.stopIds)) {
      route.stopIds.forEach(sid => {
        const stop = STOPS.find(s => s.id === sid);
        if (stop && typeof stop.lat === 'number' && typeof stop.lon === 'number') {
          stopPoints.push([stop.lat, stop.lon]);
        }
      });
    }
    if (stopPoints.length > 0 && typeof L !== 'undefined' && L.latLngBounds) {
      try {
        const bounds = L.latLngBounds(stopPoints);
        realLeafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        console.warn('fitBounds stopPoints error:', e);
      }
    }
  }

  // 4. Mostrar pill flotante con botón para restablecer la vista
  showMapRouteFocusPill(route);
}

function resetMapRouteHighlight() {
  if (!leafletMarkers) return;

  // Restaurar polylines de rutas
  if (leafletMarkers.routes) {
    ROUTES.forEach(r => {
      const poly = leafletMarkers.routes[r.id];
      if (poly && poly.setStyle) {
        poly.setStyle({
          color: r.color,
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8'
        });
      }
    });
  }

  // Restaurar marcadores de paradas
  if (leafletMarkers.stops) {
    Object.values(leafletMarkers.stops).forEach(marker => {
      if (!marker) return;
      if (typeof marker.setOpacity === 'function') {
        marker.setOpacity(1);
      }
      const el = marker.getElement ? marker.getElement() : null;
      if (el) {
        el.style.opacity = '';
        el.style.zIndex = '';
        el.classList.remove('stop-route-highlighted');
      }
    });
  }

  // Eliminar pill flotante
  const pill = document.getElementById('mapRouteFocusPill');
  if (pill) pill.remove();
}

function showMapRouteFocusPill(route) {
  const existing = document.getElementById('mapRouteFocusPill');
  if (existing) existing.remove();

  const mapBg = document.querySelector('.full-map-bg') || (document.getElementById('realFullMap') && document.getElementById('realFullMap').parentElement);
  if (!mapBg) return;

  const pill = document.createElement('div');
  pill.id = 'mapRouteFocusPill';
  pill.className = 'map-route-focus-pill';
  pill.innerHTML = `
    <span>🗺️ <strong>${esc(route.concession || route.id)}</strong> — ${esc(route.name)}</span>
    <button id="mapRouteFocusClear" title="Mostrar todas las rutas" aria-label="Restablecer vista de todas las rutas">✕</button>
  `;

  mapBg.appendChild(pill);

  const clearBtn = document.getElementById('mapRouteFocusClear');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetMapRouteHighlight();
      toast('Mostrando todas las rutas y paradas', 'info');
    });
  }
}

let animId = null;
let lastTick = 0;

function tick(ts) {
  animId = requestAnimationFrame(tick);
  if (ts - lastTick < 35) return;
  const dt = Math.min((ts - lastTick) / 1000, 0.1);
  lastTick = ts;

  if (prefs.motion) {
    buses.forEach(b => {
      const moving = b.status === 'active' || b.status === 'delayed';
      if (moving) {
        const speed = b.speed || 38;
        // Avance suave a velocidad vehicular simulada sobre las calles
        const delta = (speed / 3600) * dt * 0.5;
        b._t = (b._t !== undefined ? b._t : Math.random()) + (b._dir || 1) * delta;
        if (b._t >= 1) {
          b._t = 1;
          b._dir = -1;
        } else if (b._t <= 0) {
          b._t = 0;
          b._dir = 1;
        }
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
  // NOTA: No se centra automáticamente el mapa por requerimiento expreso del usuario,
  // preservando el encuadre y zoom que el usuario esté consultando.
  // El centrado queda disponible exclusivamente bajo demanda con el botón "Centrar en mi ubicación".
  const distStr = nearest.distance < 1000 ? nearest.distance + ' m' : (nearest.distance / 1000).toFixed(1) + ' km';
  if (isInitial) {
    toast('📍 Ubicación detectada: a ' + distStr + ' de ' + nearest.stop.name, 'ok');
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
        resetMapRouteHighlight();
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
          <p class="route-id">Concesión ${r.concession || r.id}</p>
          <p class="route-name">${r.name}</p>
          ${r.operator ? `<p class="route-operator" title="Empresa operadora">${r.operator}</p>` : ''}
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
    // Escapar title/desc/bus antes de inyectar en innerHTML
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
  if (typeof renderNotifDropdown === 'function') renderNotifDropdown();
  refreshCounters();

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('alerts').update({ read: true }).eq('read', false);
    } catch (e) {
      console.warn('[Supabase] Error al marcar alertas leídas:', e);
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

  const newAlertItem = {
    id: 'ALT-' + Date.now(),
    type: t.type,
    icon: t.icon,
    title: t.title,
    desc: t.desc,
    bus: bus.id,
    time: 'ahora mismo',
    read: false
  };

  alerts.unshift(newAlertItem);
  if (alerts.length > 25) alerts.pop();
  renderAlerts();
  if (typeof renderNotifDropdown === 'function') renderNotifDropdown();
  refreshCounters();
  toast('Nueva alerta: ' + t.title, 'warn');

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('alerts').insert([{
        type: t.type,
        icon: t.icon,
        title: t.title,
        desc: t.desc,
        bus: bus.id,
        read: false
      }]).select().maybeSingle();

      if (data && data.id) {
        newAlertItem.id = data.id;
      }
    } catch (e) {
      console.warn('[Supabase] Inserción de alerta:', e);
    }
  }
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

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('buses').update({ status: newStatus }).eq('id', b.id);
    } catch (e) {
      console.warn('[Supabase] Error actualizando estado de bus:', e);
    }
  }

  toast('Estado de ' + b.id + ' actualizado a ' + statusLabel(b.status), 'ok');
});
 
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (busModal.classList.contains('open')) closeModal(busModal);
  if (settingsModal.classList.contains('open')) closeModal(settingsModal);
  const notifPanel = $('notifDropdownPanel');
  if (notifPanel) notifPanel.hidden = true;
  const nBtn = $('notifBtn');
  if (nBtn) nBtn.setAttribute('aria-expanded', 'false');
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
 
on('accentPicker', 'click', e => {
  const dot = e.target.closest('[data-accent]');
  if (!dot) return;
  prefs.accent = dot.dataset.accent;
  applyPrefs();
  savePrefs();
  buildAccentPicker();
  if (typeof paintRealStopsAndRoutes === 'function') paintRealStopsAndRoutes();
  if (typeof paintDashboardStopsAndRoutes === 'function') paintDashboardStopsAndRoutes();
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
 
document.addEventListener('click', e => {
  const bar = document.querySelector('.search-bar');
  if (bar && bar.classList.contains('mobile-open')
      && !bar.contains(e.target) && !$('mobileSearchBtn')?.contains(e.target)) {
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
 
  const mapBus = e.target.closest('#mapBusList .map-bus-item, .map-bus-item');
  if (mapBus && mapBus.dataset.bus) {
    focusBus(mapBus.dataset.bus);
    return;
  }

  const bus = e.target.closest('[data-bus]');
  if (bus) {
    if (state.view === 'map') {
      focusBus(bus.dataset.bus);
      return;
    }
    openBusModal(bus.dataset.bus);
  }
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
  if (!el) return;
  el.classList.toggle('paused', !prefs.live);
  el.setAttribute('aria-pressed', String(prefs.live));
  const lbl = $('liveLabel');
  if (lbl) lbl.textContent = prefs.live ? 'Actualizando' : 'En pausa';
}
 
const liveToggleBtn = $('liveToggle');
if (liveToggleBtn) {
  liveToggleBtn.addEventListener('click', () => {
    prefs.live = !prefs.live;
    syncLiveIndicator();
    savePrefs();
    toast(prefs.live ? 'Actualización automática activada' : 'Actualización automática en pausa');
  });
}
 
$('expandMapBtn').addEventListener('click', () => navigate('map'));
$('trackingStopBtn').addEventListener('click', () => stopTracking('Dejaste de seguir el bus'));
 
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

// ==================================================================
// CONEXIÓN DIRECTA CON SUPABASE (Opción A: paradas, alertas y posiciones)
// ==================================================================
async function initSupabaseData() {
  if (!supabaseClient) return;

  // 1. Cargar paradas oficiales desde Supabase
  try {
    const { data: remoteStops, error: stopsErr } = await supabaseClient.from('stops').select('*');
    if (!stopsErr && remoteStops && remoteStops.length) {
      remoteStops.forEach(rs => {
        const existing = STOPS.find(s => s.id === rs.id || s.name === rs.name);
        if (existing) {
          Object.assign(existing, rs);
        } else {
          STOPS.push(rs);
        }
      });
      if (typeof realLeafletMap !== 'undefined' && realLeafletMap) paintRealStopsAndRoutes();
      if (typeof dashboardLeafletMap !== 'undefined' && dashboardLeafletMap) paintDashboardStopsAndRoutes();
    }
  } catch (err) {
    console.warn('[Supabase] Paradas remotas no disponibles:', err);
  }

  // 2. Cargar alertas desde Supabase
  try {
    const { data: remoteAlerts, error: alertsErr } = await supabaseClient
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!alertsErr && remoteAlerts && remoteAlerts.length) {
      alerts = remoteAlerts.map(a => ({
        id: a.id,
        type: a.type || 'info',
        icon: a.icon || 'ℹ️',
        title: a.title,
        desc: a.desc,
        bus: a.bus || 'BUS-001',
        time: a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'reciente',
        read: !!(a.is_read || a.read)
      }));
      renderAlerts();
      if (typeof renderNotifDropdown === 'function') renderNotifDropdown();
      refreshCounters();
    }
  } catch (err) {
    console.warn('[Supabase] Alertas remotas no disponibles:', err);
  }

  // 3. Suscripción en tiempo real a posiciones y estado de buses
  try {
    supabaseClient
      .channel('realtime_buses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, payload => {
        const row = payload.new;
        if (!row || !row.id) return;
        const bus = buses.find(b => b.id === row.id);
        if (bus) {
          if (row.pos_x !== undefined && row.pos_y !== undefined) {
            bus.pos = { x: Number(row.pos_x), y: Number(row.pos_y) };
          }
          if (row.speed_kmh !== undefined) bus.speed = row.speed_kmh;
          if (row.passengers_count !== undefined) bus.passengers = row.passengers_count;
          if (row.status) bus.status = row.status;
          drawMapMarkers();
          if (state.view === 'dashboard') renderBusList();
          if (state.view === 'map') renderMapBusList();
          if (state.view === 'fleet') renderFleet();
          refreshCounters();
        }
      })
      .subscribe();
  } catch (err) {
    console.warn('[Supabase Realtime] Error en suscripción:', err);
  }
}

function init() {
  // ------------------------------------------------------------------
  // HAPTIC FEEDBACK & SHARE HELPERS

  // Bind haptics to all buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => hapticFeedback(8));
  });

  // ------------------------------------------------------------------
  // DYNAMIC PAGE META TITLES & DESCRIPTIONS
  // ------------------------------------------------------------------
  const pageMetaMap = {
    dashboard: { title: 'Panel Principal — BusTrack Pro', desc: 'Resumen en tiempo real del estado de la flota, mapa interactivo y métricas.' },
    map: { title: 'Mapa en Vivo — BusTrack Pro', desc: 'Seguimiento satelital y mapa esquemático de todas las unidades en circulación.' },
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

  // ------------------------------------------------------------------
  // AUTHENTICATION & LANDING GATE LOGIC (Email, Google, Apple via Supabase)
  // ------------------------------------------------------------------

  // ── Session state ────────────────────────────────────────────────────
  let currentUser    = null;
  let isGuestSession = false;

  // Restore persisted session from localStorage on cold start
  try {
    const saved = localStorage.getItem('bustrack_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      // El rol se obtiene de public.users en Supabase; por defecto pasajero en cold start
      currentUser = {
        ...parsed,
        role: 'passenger'
      };
    }
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
      if (roleSlot)   roleSlot.textContent   = currentUser.role === 'admin' ? 'Administrador' : 'Pasajero';

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
        const rolEspanol = currentUser.role === 'admin' ? 'Administrador' : 'Pasajero';
        if (activeBadge) activeBadge.textContent = `Cuenta ${providerLabel} · ${rolEspanol}`;
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
  /** Carga el perfil del usuario autenticado directamente desde la tabla public.users de Supabase */
  async function loadUserProfile(supaUser) {
    if (!supaUser || !supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('full_name, role, avatar_url')
        .eq('id', supaUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[loadUserProfile] Error consultando perfil en Supabase:', error.message);
      }

      const role = (data && data.role === 'admin') ? 'admin' : 'passenger';
      const name = data?.full_name || supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || (supaUser.email ? supaUser.email.split('@')[0] : 'Usuario');
      const avatarUrl = data?.avatar_url || supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      const provider = supaUser.app_metadata?.provider || supaUser.app_metadata?.providers?.[0] || 'email';

      return {
        id: supaUser.id,
        email: supaUser.email,
        name,
        avatarUrl,
        role,
        provider
      };
    } catch (err) {
      console.warn('[loadUserProfile] Fallo de red/excepción:', err);
      const name = supaUser.user_metadata?.full_name || (supaUser.email ? supaUser.email.split('@')[0] : 'Usuario');
      return {
        id: supaUser.id,
        email: supaUser.email,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        role: 'passenger',
        provider: supaUser.app_metadata?.provider || 'email'
      };
    }
  }

  /** Build a local currentUser fallback object from a Supabase Auth user record */
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
      role:      'passenger',
      provider,
      avatarUrl: supaUser.user_metadata?.avatar_url
        || supaUser.user_metadata?.picture
        || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    };
  }

  /** Persist user display info, update UI, close modal */
  function finalizeLogin(user) {
    currentUser    = user;
    isGuestSession = false;
    // Guardar únicamente información cosmética; el rol se resuelve en el servidor/DB
    localStorage.setItem('bustrack_user', JSON.stringify({
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      provider: user.provider
    }));
    updateAuthUserUI();
    hideHome();
    navigate('dashboard');
    if (authModal) authModal.classList.remove('active');
  }

  /** Called after a successful Supabase OAuth redirect or session retrieval */
  async function handleSupabaseSession(supaUser) {
    if (!supaUser) return;
    const userProfile = await loadUserProfile(supaUser);
    if (userProfile) {
      finalizeLogin(userProfile);
    }
  }

  // Listen for Supabase Auth state changes
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await handleSupabaseSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        isGuestSession = false;
        localStorage.removeItem('bustrack_user');
        updateAuthUserUI();
      }
    });

    // Restore an existing active Supabase session (e.g. after browser refresh)
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
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
      window.location.href = 'login.html';
    });
  }
  if (sidebarRegisterBtn) {
    sidebarRegisterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      window.location.href = 'register.html';
    });
  }
  if (authBtn) {
    authBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentUser) {
        window.location.href = 'login.html';
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
            const user = await loadUserProfile(supaAuth.user);
            if (user) {
              toast(`¡Bienvenido de nuevo, ${user.name}! 👋`, 'ok');
              finalizeLogin(user);
              setBtnLoading('loginSubmitBtn', false, 'Iniciar Sesión', '');
              return;
            }
          }
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
      if (password.length < 8) { setFieldError($('regPassword'), 'La contraseña debe tener al menos 8 caracteres.'); valid = false; }
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
            if (supaReg.session?.user) {
              const user = await loadUserProfile(supaReg.session.user);
              toast(`¡Cuenta creada! Bienvenido, ${user?.name || name} 🚀`, 'ok');
              finalizeLogin(user || buildUserFromSupabase(supaReg.user, name));
              setBtnLoading('registerSubmitBtn', false, 'Crear Cuenta', '');
              return;
            } else {
              // Flujo de confirmación por correo
              toast('¡Cuenta creada! Revisá tu correo para confirmar tu cuenta antes de iniciar sesión. 📧', 'ok');
              activateTab('login');
              $('loginEmail') && ($('loginEmail').value = email);
              setBtnLoading('registerSubmitBtn', false, 'Crear Cuenta', '');
              return;
            }
          }
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
    sessionStorage.removeItem('bustrack_guest');

    toast(`Hasta pronto, ${name}. Sesión cerrada correctamente. 👋`, 'info');
    updateAuthUserUI();
    if (authModal) authModal.classList.remove('active');
  }

  const logoutBtn      = $('logoutBtn');
  const modalLogoutBtn = $('modalLogoutBtn');
  if (logoutBtn)      logoutBtn.addEventListener('click',      performLogout);
  if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', performLogout);

  // ARCO: Derechos de Acceso (Exportación) y Supresión (Eliminación) - Ley 8968
  const exportDataBtn    = $('exportDataBtn');
  const deleteAccountBtn = $('deleteAccountBtn');

  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      try {
        const token = (await supabaseClient?.auth?.getSession())?.data?.session?.access_token;
        const res = await fetch('/api/v1/auth/me/export', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('No se pudo exportar la información');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bustrack_mis_datos_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('📥 Archivo de datos personales descargado', 'ok');
      } catch (err) {
        toast(err.message || 'Error al exportar datos', 'warn');
      }
    });
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      const confirmDelete = confirm('¿Estás seguro de que deseas eliminar permanentemente tu cuenta y todos tus datos personales asociados? Esta acción no se puede deshacer (Ley 8968).');
      if (!confirmDelete) return;
      try {
        const token = (await supabaseClient?.auth?.getSession())?.data?.session?.access_token;
        const res = await fetch('/api/v1/auth/me', {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          toast('Cuenta eliminada correctamente', 'info');
          await performLogout();
        } else {
          toast('No se pudo eliminar la cuenta directamente. Contacte a soporte.', 'warn');
        }
      } catch (err) {
        toast('Error al procesar la solicitud de eliminación', 'warn');
      }
    });
  }




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
      if (action === 'go-dashboard') navigate('dashboard');
      else if (action === 'go-map') navigate('map');
      else if (action === 'go-fleet') navigate('fleet');
      else if (action === 'toggle-map-style' || action === 'toggle-theme') {
        const styleBtn = $('mapStyleToggleBtn');
        if (styleBtn) {
          styleBtn.click();
        } else {
          toast('Estilo de mapa alternado', 'info');
        }
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

      // Validación estricta anti-XSS y formato
      const busIdRegex = /^BUS-\d{3,4}$/;
      const plateRegex = /^[A-Z0-9-]{1,10}$/;

      if (!busIdRegex.test(id)) {
        toast('El ID del bus debe cumplir el formato BUS-000 (ej. BUS-015)', 'warn');
        $('newBusId')?.focus();
        return;
      }

      if (!plateRegex.test(plate)) {
        toast('La placa solo puede contener letras, números y guion (máx. 10 caracteres)', 'warn');
        $('newBusPlate')?.focus();
        return;
      }

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
  const fullLocBtn = $('locateUserBtnFull');
  const recenterBtn = $('recenterUserBtn');
  const geoSwitchBtn = $('geoSwitch');

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
  initSupabaseData();
  setInterval(updateLiveData, 3000);
  setInterval(pushActivity, 9000);
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


