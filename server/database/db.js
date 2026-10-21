/* ==============================================================================
   BusTrack Pro — Production-Grade Relational Database Repository
   Engine: 100% Real Embedded SQLite (ACID, WAL Mode, Foreign Keys)
   Compatible with PostgreSQL schema via server/database/schema.sql
   ============================================================================== */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SEED DEFINITIONS (Synchronized with BusTrack Transit Domain) ---

export const SEED_ROUTES = [
  // Rutas interprovinciales reales de Costa Rica — CTP/ARESEP
  { id: 'SJO-201', name: 'San José – Alajuela vía Aeropuerto Juan Santamaría',        operator: 'TUASA (Transportes Unidos Alajuelenses S.A.)',          concession: 'SJO-201', varName: '--route-a', color: '#5b6ef5', stops: 8,  length: 22 },
  { id: 'SJO-300', name: 'San José – Heredia vía Tibás y Santo Domingo',              operator: 'Transportes Unidos La 400 S.A.',                        concession: 'SJO-300', varName: '--route-b', color: '#7c4ddb', stops: 6,  length: 18 },
  { id: 'SJO-400', name: 'San José – Cartago vía Autopista Florencio del Castillo',   operator: 'Auto Transportes Lumaca S.A.',                          concession: 'SJO-400', varName: '--route-c', color: '#2aa3c4', stops: 7,  length: 25 },
  { id: 'SJO-401', name: 'San José – Turrialba vía Cartago y Paraíso',                operator: 'TRANSTUSA (Transportes Turrialba S.A.)',                 concession: 'SJO-401', varName: '--route-d', color: '#2bb885', stops: 6,  length: 90 },
  { id: 'SJO-402', name: 'Cartago – San José Servicio Express Ciudad Jardín',         operator: 'Auto Transportes Lumaca S.A.',                          concession: 'SJO-402', varName: '--route-e', color: '#f5a623', stops: 5,  length: 24 },
  { id: 'SJO-600', name: 'San José – Desamparados – Aserrí',                          operator: 'Autotransportes Desamparados S.A.',                     concession: 'SJO-600', varName: '--route-f', color: '#e24c6c', stops: 5,  length: 20 },
  { id: 'SJO-601', name: 'San José – San Isidro de El General (Pérez Zeledón)',       operator: 'MUSOC (Empresa de Transportes M.U.S.O.C. S.A.)',         concession: 'SJO-601', varName: '--route-g', color: '#ff7043', stops: 5,  length: 120 },
  { id: 'PAC-327', name: 'San José – Puntarenas vía Esparza e Interamericana',        operator: 'Empresarios Unidos de Puntarenas S.A.',                 concession: 'PAC-327', varName: '--route-h', color: '#26c6da', stops: 5,  length: 110 },
  { id: 'GUA-900', name: 'San José – Liberia vía Cañas y Bagaces',                    operator: 'Pulmitan de Liberia S.A.',                              concession: 'GUA-900', varName: '--route-i', color: '#66bb6a', stops: 6,  length: 230 },
  { id: 'CAR-32',  name: 'San José – Puerto Limón vía Guápiles (Ruta 32)',            operator: 'Autotransportes Caribeños S.A.',                        concession: 'CAR-32',  varName: '--route-j', color: '#ab47bc', stops: 6,  length: 160 },
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
  // ==========================================
  // 1. PROVINCIA DE SAN JOSÉ (GAM Y PERIFERIA)
  // ==========================================
  { id: 'stop-central-sjo',        name: 'Terminal Central San José',              subtext: 'Av. Central y Calle 4',                                  province: 'San José',    isPrimary: 1, lat: 9.9325,  lon: -84.0815, pos_x: 200, pos_y: 150 },
  { id: 'stop-coca-cola',          name: 'Terminal Coca Cola',                     subtext: 'Paso de la Vaca / Central Interurbana',                   province: 'San José',    isPrimary: 1, lat: 9.9366,  lon: -84.0845, pos_x: 220, pos_y: 155 },
  { id: 'stop-7-10',               name: 'Terminal 7-10 Interurbana',              subtext: 'Conexión Pacífico y Guanacaste',                          province: 'San José',    isPrimary: 1, lat: 9.9398,  lon: -84.0827, pos_x: 240, pos_y: 160 },
  { id: 'stop-tuasa-sjo',          name: 'Terminal TUASA San José',                subtext: 'Av. 2, Calle 12',                                        province: 'San José',    isPrimary: 1, lat: 9.9345,  lon: -84.0852, pos_x: 210, pos_y: 152 },
  { id: 'stop-lumaca-sjo',         name: 'Terminal Lumaca San José',               subtext: 'Costado Sur Plaza González Víquez',                       province: 'San José',    isPrimary: 1, lat: 9.9272,  lon: -84.0745, pos_x: 230, pos_y: 165 },
  { id: 'stop-tracopa-sjo',        name: 'Terminal Tracopa San José',              subtext: 'Plaza González Víquez (Zona Sur)',                        province: 'San José',    isPrimary: 1, lat: 9.9238,  lon: -84.0762, pos_x: 235, pos_y: 170 },
  { id: 'stop-musoc-sjo',          name: 'Terminal Musoc San José',                subtext: 'Calle 16, Av. 22',                                       province: 'San José',    isPrimary: 1, lat: 9.9242,  lon: -84.0812, pos_x: 225, pos_y: 168 },
  { id: 'stop-parque-central-sjo', name: 'Parque Central San José',               subtext: 'Catedral Metropolitana',                                  province: 'San José',    isPrimary: 0, lat: 9.9333,  lon: -84.0792, pos_x: 400, pos_y: 150 },
  { id: 'stop-merced',             name: 'Parque La Merced',                       subtext: 'Av. 2 / Calle 10',                                       province: 'San José',    isPrimary: 0, lat: 9.9349,  lon: -84.0841, pos_x: 215, pos_y: 153 },
  { id: 'stop-hospital-sanjuan',   name: 'Hospital San Juan de Dios',              subtext: 'Paseo Colón',                                            province: 'San José',    isPrimary: 0, lat: 9.9348,  lon: -84.0864, pos_x: 600, pos_y: 150 },
  { id: 'stop-hospital-mexico',    name: 'Hospital México',                        subtext: 'La Uruca / Radial Pozuelo',                               province: 'San José',    isPrimary: 0, lat: 9.9535,  lon: -84.1102, pos_x: 190, pos_y: 140 },
  { id: 'stop-hospital-calderon',  name: 'Hospital Calderón Guardia',              subtext: 'Barrio Aranjuez / Av. 7',                                province: 'San José',    isPrimary: 0, lat: 9.9362,  lon: -84.0695, pos_x: 260, pos_y: 148 },
  { id: 'stop-paseo-colon',        name: 'Paseo Colón — Calle 28',                subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9351,  lon: -84.0945, pos_x: 195, pos_y: 155 },
  { id: 'stop-sabana',             name: 'La Sabana — Estadio Nacional',           subtext: 'Mata Redonda',                                           province: 'San José',    isPrimary: 0, lat: 9.9355,  lon: -84.1042, pos_x: 200, pos_y: 225 },
  { id: 'stop-escalante',          name: 'Barrio Escalante',                       subtext: 'Calle 33 Gastronómica',                                  province: 'San José',    isPrimary: 0, lat: 9.9358,  lon: -84.0625, pos_x: 100, pos_y: 225 },
  { id: 'stop-los-yoses',          name: 'Los Yoses / Av. Central',                subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9329,  lon: -84.0592, pos_x: 270, pos_y: 160 },
  { id: 'stop-mall-sp',            name: 'Mall San Pedro / Fuente Hispanidad',     subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9341,  lon: -84.0620, pos_x: 200, pos_y: 225 },
  { id: 'stop-ucr',                name: 'Universidad de Costa Rica (UCR)',        subtext: 'San Pedro Montes de Oca',                                province: 'San José',    isPrimary: 0, lat: 9.9365,  lon: -84.0512, pos_x: 400, pos_y: 300 },
  { id: 'stop-san-pedro-centro',   name: 'San Pedro Centro / Muñoz & Nanne',      subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9338,  lon: -84.0535, pos_x: 250, pos_y: 225 },
  { id: 'stop-fidelitas',          name: 'Entrada Principal U Fidélitas',          subtext: 'Santa Marta de Montes de Oca',                           province: 'San José',    isPrimary: 1, lat: 9.9392,  lon: -84.0321, pos_x: 400, pos_y: 225 },
  { id: 'stop-zapote',             name: 'Rotonda Garantías Sociales — Zapote',    subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9285,  lon: -84.0542, pos_x: 280, pos_y: 175 },
  { id: 'stop-curridabat',         name: 'Plaza del Sol / Curridabat',             subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9252,  lon: -84.0415, pos_x: 290, pos_y: 180 },
  { id: 'stop-escazu-centro',      name: 'Escazú Centro — Parque Central',         subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9185,  lon: -84.1402, pos_x: 130, pos_y: 210 },
  { id: 'stop-escazu-multiplaza',  name: 'Multiplaza Escazú / Autopista 27',       subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9458,  lon: -84.1492, pos_x: 120, pos_y: 200 },
  { id: 'stop-santa-ana-centro',   name: 'Santa Ana Centro',                       subtext: 'Parque de Santa Ana / Cruz Roja',                         province: 'San José',    isPrimary: 0, lat: 9.9328,  lon: -84.1824, pos_x: 100, pos_y: 210 },
  { id: 'stop-lindora',            name: 'Lindora / Forum 1 & 2',                 subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9562,  lon: -84.1852, pos_x: 95,  pos_y: 205 },
  { id: 'stop-ciudad-colon',       name: 'Ciudad Colón (Mora)',                    subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9142,  lon: -84.2415, pos_x: 80,  pos_y: 220 },
  { id: 'stop-desamparados',       name: 'Desamparados Parque Central',            subtext: 'Parque Central de Desamparados',                          province: 'San José',    isPrimary: 0, lat: 9.8974,  lon: -84.0664, pos_x: 300, pos_y: 350 },
  { id: 'stop-aserri',             name: 'Aserrí Centro — Iglesia',                subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.8662,  lon: -84.0745, pos_x: 305, pos_y: 360 },
  { id: 'stop-alajuelita',         name: 'Alajuelita Centro',                      subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9025,  lon: -84.1012, pos_x: 185, pos_y: 190 },
  { id: 'stop-moravia',            name: 'Moravia Centro / Lincoln Plaza',         subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9632,  lon: -84.0482, pos_x: 310, pos_y: 130 },
  { id: 'stop-tibas',              name: 'Tibás Parque Central / Estadio Saprissa',subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9582,  lon: -84.0812, pos_x: 245, pos_y: 135 },
  { id: 'stop-guadalupe',          name: 'Guadalupe (Goicoechea)',                 subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9472,  lon: -84.0558, pos_x: 265, pos_y: 140 },
  { id: 'stop-coronado',           name: 'Vázquez de Coronado (San Isidro)',       subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.9765,  lon: -84.0092, pos_x: 330, pos_y: 125 },
  { id: 'stop-puriscal',           name: 'Santiago de Puriscal',                   subtext: null,                                                      province: 'San José',    isPrimary: 0, lat: 9.8495,  lon: -84.3125, pos_x: 60,  pos_y: 240 },
  { id: 'stop-perez-zeledon',      name: 'Terminal San Isidro de El General',      subtext: 'Pérez Zeledón — Tracopa y Musoc',                         province: 'San José',    isPrimary: 1, lat: 9.3735,  lon: -83.7042, pos_x: 350, pos_y: 480 },
  { id: 'stop-empalme',            name: 'El Empalme / La División',               subtext: 'Cruce Ruta Interamericana — Bifurcación Valle y Pacífico Sur', province: 'San José', isPrimary: 0, lat: 9.7648, lon: -83.9412, pos_x: 320, pos_y: 400 },

  // ==========================================
  // 2. PROVINCIA DE ALAJUELA
  // ==========================================
  { id: 'stop-alajuela-fecosa',    name: 'Terminal Fecosa Alajuela',               subtext: 'Terminal Central de Alajuela',                            province: 'Alajuela',    isPrimary: 1, lat: 10.0152, lon: -84.2145, pos_x: 550, pos_y: 180 },
  { id: 'stop-tuasa-alajuela',     name: 'Terminal TUASA Alajuela',                subtext: null,                                                      province: 'Alajuela',    isPrimary: 1, lat: 10.0182, lon: -84.2138, pos_x: 552, pos_y: 178 },
  { id: 'stop-aeropuerto-sjo',     name: 'Aeropuerto Juan Santamaría (SJO)',       subtext: 'Terminal Internacional de Pasajeros',                     province: 'Alajuela',    isPrimary: 1, lat: 10.0004, lon: -84.2141, pos_x: 600, pos_y: 225 },
  { id: 'stop-city-mall',          name: 'City Mall Alajuela',                     subtext: 'Radial Francisco J. Orlich',                              province: 'Alajuela',    isPrimary: 0, lat: 10.0094, lon: -84.2102, pos_x: 570, pos_y: 200 },
  { id: 'stop-coyol',              name: 'Zona Franca El Coyol',                   subtext: 'Parque Médico y Logístico',                               province: 'Alajuela',    isPrimary: 0, lat: 9.9965,  lon: -84.2698, pos_x: 620, pos_y: 250 },
  { id: 'stop-la-garita',          name: 'La Garita / Viveros',                    subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.0085, lon: -84.3215, pos_x: 580, pos_y: 230 },
  { id: 'stop-grecia',             name: 'Terminal Grecia Centro',                 subtext: 'Mercado Municipal de Grecia',                             province: 'Alajuela',    isPrimary: 1, lat: 10.0735, lon: -84.3115, pos_x: 640, pos_y: 260 },
  { id: 'stop-sarchi',             name: 'Sarchí Centro (Artesanías)',              subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.0915, lon: -84.3475, pos_x: 650, pos_y: 265 },
  { id: 'stop-naranjo',            name: 'Terminal Naranjo Parque Central',        subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.0982, lon: -84.3785, pos_x: 660, pos_y: 270 },
  { id: 'stop-palmares',           name: 'Terminal Palmares Centro',               subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.0582, lon: -84.4325, pos_x: 670, pos_y: 275 },
  { id: 'stop-san-ramon',          name: 'Terminal San Ramón',                     subtext: 'Empresarios Unidos / Mercado',                            province: 'Alajuela',    isPrimary: 1, lat: 10.0872, lon: -84.4705, pos_x: 680, pos_y: 280 },
  { id: 'stop-atenas',             name: 'Atenas Parque Central',                  subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 9.9785,  lon: -84.3825, pos_x: 590, pos_y: 240 },
  { id: 'stop-orotina',            name: 'Terminal Orotina',                       subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 9.9112,  lon: -84.5235, pos_x: 510, pos_y: 290 },
  { id: 'stop-poas',               name: 'San Pedro de Poás',                      subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.0745, lon: -84.2415, pos_x: 560, pos_y: 190 },
  { id: 'stop-ciudad-quesada',     name: 'Terminal Ciudad Quesada (San Carlos)',   subtext: 'Mercado Municipal San Carlos',                            province: 'Alajuela',    isPrimary: 1, lat: 10.3245, lon: -84.4298, pos_x: 700, pos_y: 320 },
  { id: 'stop-la-fortuna',         name: 'La Fortuna / Volcán Arenal',             subtext: 'Parque Central de La Fortuna',                            province: 'Alajuela',    isPrimary: 1, lat: 10.4716, lon: -84.6452, pos_x: 720, pos_y: 340 },
  { id: 'stop-aguas-zarcas',       name: 'Aguas Zarcas de San Carlos',             subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.3812, lon: -84.3395, pos_x: 710, pos_y: 310 },
  { id: 'stop-pital',              name: 'Pital de San Carlos',                    subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.4512, lon: -84.2755, pos_x: 715, pos_y: 300 },
  { id: 'stop-los-chiles',         name: 'Terminal Los Chiles (Frontera Norte)',   subtext: null,                                                      province: 'Alajuela',    isPrimary: 1, lat: 11.0335, lon: -84.7165, pos_x: 730, pos_y: 360 },
  { id: 'stop-upala',              name: 'Terminal Upala Centro',                  subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.8985, lon: -85.0185, pos_x: 740, pos_y: 370 },
  { id: 'stop-guatuso',            name: 'San Rafael de Guatuso',                  subtext: null,                                                      province: 'Alajuela',    isPrimary: 0, lat: 10.6715, lon: -84.8215, pos_x: 725, pos_y: 350 },

  // ==========================================
  // 3. PROVINCIA DE HEREDIA
  // ==========================================
  { id: 'stop-heredia-central',    name: 'Terminal Central Heredia',               subtext: 'Calle Central — Parada Buses 400',                        province: 'Heredia',     isPrimary: 1, lat: 9.9984,  lon: -84.1165, pos_x: 350, pos_y: 120 },
  { id: 'stop-una',                name: 'Universidad Nacional (UNA)',              subtext: 'Campus Omar Dengo',                                       province: 'Heredia',     isPrimary: 1, lat: 9.9998,  lon: -84.1112, pos_x: 370, pos_y: 115 },
  { id: 'stop-parque-heredia',     name: 'Parque Central Nicolás Ulloa (Heredia)', subtext: null,                                                      province: 'Heredia',     isPrimary: 0, lat: 9.9975,  lon: -84.1182, pos_x: 348, pos_y: 122 },
  { id: 'stop-oxigeno',            name: 'Mall Oxígeno Human Playground',          subtext: 'San Francisco de Heredia',                                province: 'Heredia',     isPrimary: 0, lat: 9.9882,  lon: -84.1332, pos_x: 340, pos_y: 130 },
  { id: 'stop-belen',              name: 'San Antonio de Belén',                   subtext: 'Centro y Pedregal',                                       province: 'Heredia',     isPrimary: 0, lat: 9.9812,  lon: -84.1878, pos_x: 320, pos_y: 140 },
  { id: 'stop-san-joaquin',        name: 'San Joaquín de Flores',                  subtext: null,                                                      province: 'Heredia',     isPrimary: 0, lat: 10.0052, lon: -84.1565, pos_x: 335, pos_y: 128 },
  { id: 'stop-santo-domingo',      name: 'Santo Domingo de Heredia',               subtext: 'Parque Central',                                          province: 'Heredia',     isPrimary: 0, lat: 9.9805,  lon: -84.0915, pos_x: 360, pos_y: 125 },
  { id: 'stop-san-pablo',          name: 'San Pablo de Heredia',                   subtext: null,                                                      province: 'Heredia',     isPrimary: 0, lat: 9.9932,  lon: -84.0985, pos_x: 355, pos_y: 122 },
  { id: 'stop-barva',              name: 'Barva de Heredia — Parque Central',      subtext: null,                                                      province: 'Heredia',     isPrimary: 0, lat: 10.0212, lon: -84.1235, pos_x: 345, pos_y: 110 },
  { id: 'stop-san-rafael-heredia', name: 'San Rafael de Heredia',                  subtext: null,                                                      province: 'Heredia',     isPrimary: 0, lat: 10.0135, lon: -84.1012, pos_x: 365, pos_y: 112 },
  { id: 'stop-san-isidro-heredia', name: 'San Isidro de Heredia',                  subtext: null,                                                      province: 'Heredia',     isPrimary: 0, lat: 10.0175, lon: -84.0555, pos_x: 375, pos_y: 115 },
  { id: 'stop-sarapiqui',          name: 'Terminal Puerto Viejo de Sarapiquí',     subtext: null,                                                      province: 'Heredia',     isPrimary: 1, lat: 10.4572, lon: -84.0085, pos_x: 420, pos_y: 90  },

  // ==========================================
  // 4. PROVINCIA DE CARTAGO
  // ==========================================
  { id: 'stop-cartago-central',    name: 'Terminal Lumaca Cartago',                subtext: 'Costado Norte Ruinas de Cartago',                         province: 'Cartago',     isPrimary: 1, lat: 9.8645,  lon: -83.9212, pos_x: 450, pos_y: 350 },
  { id: 'stop-basilica',           name: 'Basílica Nuestra Señora de Los Ángeles', subtext: 'Plaza Santuario Nacional',                                province: 'Cartago',     isPrimary: 1, lat: 9.8638,  lon: -83.9131, pos_x: 470, pos_y: 360 },
  { id: 'stop-tec',                name: 'Tecnológico de Costa Rica (TEC)',        subtext: 'Campus Central Cartago',                                  province: 'Cartago',     isPrimary: 1, lat: 9.8552,  lon: -83.9095, pos_x: 480, pos_y: 370 },
  { id: 'stop-hospital-cartago',   name: 'Hospital Max Peralta de Cartago',        subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.8615,  lon: -83.9242, pos_x: 445, pos_y: 352 },
  { id: 'stop-metrocentro-cartago',name: 'Paseo Metrópoli / Taras',                subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.8695,  lon: -83.9425, pos_x: 435, pos_y: 340 },
  { id: 'stop-tres-rios',          name: 'Tres Ríos Parque Central (La Unión)',    subtext: 'Conexión Florencio del Castillo',                         province: 'Cartago',     isPrimary: 0, lat: 9.9075,  lon: -83.9878, pos_x: 420, pos_y: 320 },
  { id: 'stop-paraiso',            name: 'Paraíso de Cartago — Parque Central',   subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.8385,  lon: -83.8655, pos_x: 495, pos_y: 375 },
  { id: 'stop-cervantes',          name: 'Cervantes de Alvarado',                  subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.8825,  lon: -83.8215, pos_x: 505, pos_y: 380 },
  { id: 'stop-pacayas',            name: 'Pacayas (Alvarado)',                     subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.9142,  lon: -83.8055, pos_x: 512, pos_y: 375 },
  { id: 'stop-oreamuno',           name: 'San Rafael de Oreamuno',                 subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.8712,  lon: -83.9045, pos_x: 465, pos_y: 345 },
  { id: 'stop-turrialba',          name: 'Terminal Transtusa Turrialba',           subtext: 'Parque Central de Turrialba',                             province: 'Cartago',     isPrimary: 1, lat: 9.9048,  lon: -83.6835, pos_x: 520, pos_y: 380 },
  { id: 'stop-cachi',              name: 'Cachí / Represa Hidroeléctrica',         subtext: null,                                                      province: 'Cartago',     isPrimary: 0, lat: 9.8285,  lon: -83.8085, pos_x: 500, pos_y: 385 },

  // ==========================================
  // 5. PROVINCIA DE PUNTARENAS
  // ==========================================
  { id: 'stop-puntarenas-centro',  name: 'Terminal Central Puntarenas',            subtext: 'Paseo de los Turistas / Empresarios Unidos',               province: 'Puntarenas',  isPrimary: 1, lat: 9.9765,  lon: -84.8295, pos_x: 160, pos_y: 395 },
  { id: 'stop-puntarenas-ferry',   name: 'Terminal Ferry Puntarenas (Paquera)',    subtext: 'Embarcadero Tambor y Paquera',                            province: 'Puntarenas',  isPrimary: 1, lat: 9.9774,  lon: -84.8488, pos_x: 150, pos_y: 400 },
  { id: 'stop-el-roble',           name: 'El Roble de Puntarenas',                 subtext: 'Hospital Monseñor Sanabria',                              province: 'Puntarenas',  isPrimary: 0, lat: 9.9795,  lon: -84.7565, pos_x: 170, pos_y: 390 },
  { id: 'stop-barranca',           name: 'Barranca / Cruce Interamericana',        subtext: null,                                                      province: 'Puntarenas',  isPrimary: 0, lat: 9.9882,  lon: -84.7312, pos_x: 175, pos_y: 385 },
  { id: 'stop-caldera',            name: 'Puerto Caldera',                          subtext: 'Ruta 27 / Entrada Portuaria',                             province: 'Puntarenas',  isPrimary: 0, lat: 9.9185,  lon: -84.7175, pos_x: 180, pos_y: 380 },
  { id: 'stop-esparza',            name: 'Esparza Centro — Parque Pérez',          subtext: null,                                                      province: 'Puntarenas',  isPrimary: 0, lat: 9.9942,  lon: -84.6675, pos_x: 185, pos_y: 375 },
  { id: 'stop-jaco',               name: 'Terminal Jacó Centro',                   subtext: 'Avenida Pastor Díaz — Playa Jacó',                        province: 'Puntarenas',  isPrimary: 1, lat: 9.6152,  lon: -84.6295, pos_x: 200, pos_y: 420 },
  { id: 'stop-herradura',          name: 'Playa Herradura / Los Sueños',           subtext: null,                                                      province: 'Puntarenas',  isPrimary: 0, lat: 9.6482,  lon: -84.6415, pos_x: 198, pos_y: 415 },
  { id: 'stop-parrita',            name: 'Parrita Centro',                          subtext: null,                                                      province: 'Puntarenas',  isPrimary: 0, lat: 9.5215,  lon: -84.3285, pos_x: 215, pos_y: 435 },
  { id: 'stop-quepos',             name: 'Terminal Quepos Centro',                  subtext: 'Terminal Municipal de Quepos',                            province: 'Puntarenas',  isPrimary: 1, lat: 9.4312,  lon: -84.1615, pos_x: 230, pos_y: 450 },
  { id: 'stop-manuel-antonio',     name: 'Parque Nacional Manuel Antonio',         subtext: 'Playa Espadilla y Reserva',                               province: 'Puntarenas',  isPrimary: 1, lat: 9.3895,  lon: -84.1482, pos_x: 235, pos_y: 455 },
  { id: 'stop-dominical',          name: 'Playa Dominical',                         subtext: null,                                                      province: 'Puntarenas',  isPrimary: 0, lat: 9.2535,  lon: -83.8645, pos_x: 250, pos_y: 465 },
  { id: 'stop-uvita',              name: 'Uvita / Bahía Ballena',                  subtext: 'Cola de Ballena',                                         province: 'Puntarenas',  isPrimary: 0, lat: 9.1725,  lon: -83.7385, pos_x: 260, pos_y: 470 },
  { id: 'stop-palmar-norte',       name: 'Palmar Norte — Puente Río Grande de Térraba', subtext: null,                                                 province: 'Puntarenas',  isPrimary: 1, lat: 8.9592,  lon: -83.4542, pos_x: 280, pos_y: 490 },
  { id: 'stop-ciudad-neily',       name: 'Terminal Ciudad Neily (Corredores)',      subtext: null,                                                      province: 'Puntarenas',  isPrimary: 1, lat: 8.6475,  lon: -82.9435, pos_x: 300, pos_y: 510 },
  { id: 'stop-golfito',            name: 'Terminal Golfito / Depósito Libre',      subtext: null,                                                      province: 'Puntarenas',  isPrimary: 1, lat: 8.6362,  lon: -83.1675, pos_x: 290, pos_y: 515 },
  { id: 'stop-puerto-jimenez',     name: 'Puerto Jiménez (Península de Osa)',      subtext: null,                                                      province: 'Puntarenas',  isPrimary: 0, lat: 8.5385,  lon: -83.3082, pos_x: 285, pos_y: 525 },
  { id: 'stop-paso-canoas',        name: 'Paso Canoas (Frontera con Panamá)',      subtext: 'Aduana Internacional',                                    province: 'Puntarenas',  isPrimary: 1, lat: 8.5312,  lon: -82.8425, pos_x: 310, pos_y: 530 },
  { id: 'stop-monteverde',         name: 'Santa Elena de Monteverde',               subtext: 'Bosque Nuboso',                                           province: 'Puntarenas',  isPrimary: 1, lat: 10.3182, lon: -84.8255, pos_x: 145, pos_y: 350 },

  // ==========================================
  // 6. PROVINCIA DE GUANACASTE
  // ==========================================
  { id: 'stop-liberia-central',    name: 'Terminal Municipal de Liberia',          subtext: 'Centro de Liberia',                                       province: 'Guanacaste',  isPrimary: 1, lat: 10.6315, lon: -85.4382, pos_x: 100, pos_y: 80  },
  { id: 'stop-pulmitan-liberia',   name: 'Terminal Pulmitan Liberia',              subtext: 'Conexión San José y Playas',                              province: 'Guanacaste',  isPrimary: 1, lat: 10.6342, lon: -85.4412, pos_x: 98,  pos_y: 78  },
  { id: 'stop-aeropuerto-lir',     name: 'Aeropuerto Guanacaste (LIR)',            subtext: 'Daniel Oduber Quirós',                                    province: 'Guanacaste',  isPrimary: 1, lat: 10.5935, lon: -85.5442, pos_x: 90,  pos_y: 75  },
  { id: 'stop-canas',              name: 'Terminal Cañas Centro',                  subtext: null,                                                      province: 'Guanacaste',  isPrimary: 1, lat: 10.4312, lon: -85.0945, pos_x: 125, pos_y: 95  },
  { id: 'stop-bagaces',            name: 'Bagaces Parque Central',                 subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 10.5285, lon: -85.2582, pos_x: 115, pos_y: 88  },
  { id: 'stop-santa-cruz',         name: 'Terminal Santa Cruz',                    subtext: 'Ciudad Folclórica — Plaza Los Mangos',                    province: 'Guanacaste',  isPrimary: 1, lat: 10.2625, lon: -85.5862, pos_x: 110, pos_y: 110 },
  { id: 'stop-nicoya',             name: 'Terminal Nicoya Colonial',               subtext: 'Parque Recaredo Briceño',                                 province: 'Guanacaste',  isPrimary: 1, lat: 10.1448, lon: -85.4525, pos_x: 120, pos_y: 130 },
  { id: 'stop-filadelfia',         name: 'Filadelfia de Carrillo',                 subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 10.4435, lon: -85.5492, pos_x: 95,  pos_y: 85  },
  { id: 'stop-playas-del-coco',    name: 'Playas del Coco',                        subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 10.5525, lon: -85.6985, pos_x: 80,  pos_y: 70  },
  { id: 'stop-tamarindo',          name: 'Parada Playa Tamarindo',                 subtext: 'Rotonda de Tamarindo',                                    province: 'Guanacaste',  isPrimary: 1, lat: 10.2995, lon: -85.8412, pos_x: 70,  pos_y: 100 },
  { id: 'stop-flamingo',           name: 'Playa Flamingo / Marina Flamingo',       subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 10.4385, lon: -85.7895, pos_x: 75,  pos_y: 90  },
  { id: 'stop-samara',             name: 'Playa Sámara Centro',                    subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 9.8812,  lon: -85.5285, pos_x: 110, pos_y: 145 },
  { id: 'stop-nosara',             name: 'Nosara / Playa Guiones',                 subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 9.9785,  lon: -85.6675, pos_x: 90,  pos_y: 135 },
  { id: 'stop-la-cruz',            name: 'La Cruz — Peñas Blancas (Frontera Nicaragua)', subtext: null,                                               province: 'Guanacaste',  isPrimary: 1, lat: 11.2185, lon: -85.6115, pos_x: 85,  pos_y: 50  },
  { id: 'stop-tilaran',            name: 'Tilarán Centro',                          subtext: null,                                                      province: 'Guanacaste',  isPrimary: 0, lat: 10.4725, lon: -84.9685, pos_x: 135, pos_y: 100 },

  // ==========================================
  // 7. PROVINCIA DE LIMÓN (CARIBE)
  // ==========================================
  { id: 'stop-limon-centro',       name: 'Terminal Caribeños Limón Centro',        subtext: 'Parque Vargas / Puerto Limón',                            province: 'Limón',       isPrimary: 1, lat: 9.9935,  lon: -83.0332, pos_x: 750, pos_y: 220 },
  { id: 'stop-moin',               name: 'Terminal Puerto Moín (APM Terminals)',   subtext: 'Entrada Complejo Portuario',                              province: 'Limón',       isPrimary: 0, lat: 10.0012, lon: -83.0785, pos_x: 740, pos_y: 210 },
  { id: 'stop-cieneguita',         name: 'Cieneguita / Aeropuerto de Limón',       subtext: null,                                                      province: 'Limón',       isPrimary: 0, lat: 9.9612,  lon: -83.0245, pos_x: 755, pos_y: 225 },
  { id: 'stop-liverpool',          name: 'Liverpool de Limón',                      subtext: null,                                                      province: 'Limón',       isPrimary: 0, lat: 10.0095, lon: -83.1315, pos_x: 730, pos_y: 205 },
  { id: 'stop-siquirres',          name: 'Terminal Central Siquirres',              subtext: 'Conexión Ruta 32 Caribe',                                 province: 'Limón',       isPrimary: 1, lat: 10.0982, lon: -83.5075, pos_x: 680, pos_y: 180 },
  { id: 'stop-guapiles',           name: 'Terminal Pococí / Guápiles',             subtext: 'Ruta 32 / Centro de Guápiles',                            province: 'Limón',       isPrimary: 1, lat: 10.2152, lon: -83.7845, pos_x: 650, pos_y: 160 },
  { id: 'stop-guacimo',            name: 'Guácimo Centro',                          subtext: null,                                                      province: 'Limón',       isPrimary: 0, lat: 10.2115, lon: -83.6845, pos_x: 665, pos_y: 170 },
  { id: 'stop-batan',              name: 'Batán de Matina',                         subtext: null,                                                      province: 'Limón',       isPrimary: 0, lat: 10.0842, lon: -83.3345, pos_x: 700, pos_y: 195 },
  { id: 'stop-cahuita',            name: 'Parque Nacional Cahuita (Playa Blanca)', subtext: null,                                                      province: 'Limón',       isPrimary: 1, lat: 9.7395,  lon: -82.8445, pos_x: 770, pos_y: 250 },
  { id: 'stop-puerto-viejo',       name: 'Parada Puerto Viejo de Talamanca',       subtext: 'Caribe Sur / Playa Salsa Brava',                          province: 'Limón',       isPrimary: 1, lat: 9.6565,  lon: -82.7545, pos_x: 790, pos_y: 280 },
  { id: 'stop-bribri',             name: 'Bribri Centro (Talamanca)',               subtext: null,                                                      province: 'Limón',       isPrimary: 0, lat: 9.6235,  lon: -82.8415, pos_x: 785, pos_y: 290 },
  { id: 'stop-sixaola',            name: 'Sixaola (Frontera con Panamá)',           subtext: 'Puente Internacional Binacional',                         province: 'Limón',       isPrimary: 1, lat: 9.5025,  lon: -82.6145, pos_x: 800, pos_y: 310 },
];


export const SEED_ALERTS = [
  { severity: 'critical', icon: '🚨', title: 'Temperatura del motor fuera de rango', description: 'El sensor del BUS-011 reporta 112 °C de forma sostenida. Conviene detener la unidad en la próxima parada.', bus_id: 'BUS-011', is_read: 0 },
  { severity: 'warning',  icon: '⚠️', title: 'Retraso acumulado en Ruta B', description: 'BUS-007 va 8 minutos por detrás del horario. Las pantallas de las paradas ya muestran el ajuste.', bus_id: 'BUS-007', is_read: 0 },
  { severity: 'warning',  icon: '⛽', title: 'Combustible bajo', description: 'BUS-004 al 15%. Alcanza para terminar el recorrido, pero no para el siguiente.', bus_id: 'BUS-004', is_read: 0 },
  { severity: 'info',     icon: '📊', title: 'Reporte diario generado', description: 'Operación del día cerrada: 2.847 pasajeros y 2,3 min de retraso promedio.', bus_id: 'Sistema', is_read: 1 },
  { severity: 'info',     icon: '🔄', title: 'Mantenimiento programado', description: 'BUS-012 entra a taller mañana a las 06:00. Hay que reasignar su turno de la Ruta D.', bus_id: 'BUS-012', is_read: 1 },
];

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export class Database {
  /**
   * Initializes real SQLite database with ACID schema, WAL mode, foreign keys, and seeds
   */
  constructor(customPath = null) {
    const isTest = process.env.NODE_ENV === 'test';
    const rawPath = customPath || (isTest && !process.env.DB_FILE ? ':memory:' : config.dbFile);

    if (rawPath === ':memory:') {
      this.filePath = ':memory:';
      this.sqlite = new DatabaseSync(':memory:');
    } else {
      const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.filePath = resolved;
      this.sqlite = new DatabaseSync(resolved);
    }

    this._initPragmas();
    this._initTables();
    this._seedDatabase();
    this._compileStatements();
  }

  _initPragmas() {
    this.sqlite.exec('PRAGMA foreign_keys = ON;');
    if (this.filePath !== ':memory:') {
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  _initTables() {
    this.sqlite.exec(`
      -- 1. ROUTES TABLE
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        var_name TEXT,
        color TEXT NOT NULL,
        stops_count INTEGER DEFAULT 0,
        length_km REAL DEFAULT 0.0,
        operator TEXT,
        concession TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 2. DRIVERS TABLE
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        trips_completed INTEGER DEFAULT 0,
        rating REAL DEFAULT 5.0,
        hours_worked REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

      -- 4. FLEET BUSES TABLE
      CREATE TABLE IF NOT EXISTS buses (
        id TEXT PRIMARY KEY,
        bus_number TEXT NOT NULL,
        license_plate TEXT UNIQUE NOT NULL,
        route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
        driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'stopped',
        speed_kmh INTEGER DEFAULT 0,
        passengers_count INTEGER DEFAULT 0,
        capacity INTEGER DEFAULT 52,
        fuel_percent INTEGER DEFAULT 100,
        delay_minutes INTEGER DEFAULT 0,
        next_stop TEXT,
        eta_minutes INTEGER DEFAULT 0,
        pos_x REAL DEFAULT 400.00,
        pos_y REAL DEFAULT 225.00,
        _t REAL DEFAULT 0.0,
        _step REAL DEFAULT 0.005,
        _dir INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
      CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);

      -- 5. ALERTS TABLE
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT NOT NULL DEFAULT 'info',
        icon TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        bus_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_severity_read ON alerts(severity, is_read);

      -- 5. ACTIVITY LOGS TABLE
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action_text TEXT NOT NULL,
        action_type TEXT DEFAULT 'info',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

      -- 7. STOPS TABLE
      CREATE TABLE IF NOT EXISTS stops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subtext TEXT,
        is_primary INTEGER DEFAULT 0,
        lat REAL,
        lon REAL,
        routes_json TEXT,
        pos_x REAL DEFAULT 0.0,
        pos_y REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  _seedDatabase() {
    // 1. Seed Routes
    const routeCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM routes').get();
    if (routeCount.count === 0) {
      const insertRoute = this.sqlite.prepare(`
        INSERT INTO routes (id, name, var_name, color, stops_count, length_km, operator, concession, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const r of SEED_ROUTES) {
        insertRoute.run(r.id, r.name, r.varName, r.color, r.stops, r.length, r.operator || null, r.concession || null);
      }
    }

    // 3. Seed Drivers
    const driverCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM drivers').get();
    if (driverCount.count === 0) {
      const insertDriver = this.sqlite.prepare(`
        INSERT INTO drivers (id, name, initials, license_number, trips_completed, rating, hours_worked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const d of SEED_DRIVERS) {
        insertDriver.run(d.id, d.name, d.initials, d.license, d.trips, d.rating, d.hours);
      }
    }

    // 4. Seed Stops
    const stopCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM stops').get();
    if (stopCount.count === 0) {
      const insertStop = this.sqlite.prepare(`
        INSERT INTO stops (id, name, subtext, is_primary, lat, lon, routes_json, pos_x, pos_y, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const s of SEED_STOPS) {
        insertStop.run(
          s.id || `stop-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          s.name,
          s.subtext || null,
          s.isPrimary || 0,
          s.lat || 9.9333,
          s.lon || -84.0833,
          JSON.stringify(s.routes || []),
          s.pos_x || s.x || 400,
          s.pos_y || s.y || 225
        );
      }
    }

    // 5. Seed Buses (12 operational units)
    const busCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get();
    if (busCount.count === 0) {
      const statuses = ['active', 'active', 'active', 'active', 'active', 'delayed', 'delayed', 'stopped', 'maintenance'];
      const insertBus = this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (let i = 1; i <= 12; i++) {
        const busId = 'BUS-' + String(i).padStart(3, '0');
        const num = String(i).padStart(3, '0');
        const plate = 'SJB-' + String(1000 + i);
        const route = SEED_ROUTES[(i - 1) % SEED_ROUTES.length];
        const driver = SEED_DRIVERS[(i - 1) % SEED_DRIVERS.length];
        const status = statuses[(i - 1) % statuses.length];
        const moving = status === 'active' || status === 'delayed';
        const speed = moving ? randInt(28, 58) : 0;
        const passengers = randInt(4, 44);
        const fuel = randInt(25, 96);
        const delay = status === 'delayed' ? randInt(3, 11) : 0;
        const stop = SEED_STOPS[(i - 1) % SEED_STOPS.length];

        insertBus.run(
          busId,
          num,
          plate,
          route.id,
          driver.id,
          status,
          speed,
          passengers,
          52,
          fuel,
          delay,
          stop.name,
          randInt(2, 9),
          400.0,
          225.0,
          (i * 0.08) % 1.0,
          0.005 + (i % 3) * 0.001,
          i % 2 === 0 ? 1 : -1
        );
      }
    }

    // 6. Seed Alerts
    const alertCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM alerts').get();
    if (alertCount.count === 0) {
      const insertAlert = this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const a of SEED_ALERTS) {
        insertAlert.run(a.severity, a.icon, a.title, a.description, a.bus_id, a.is_read);
      }
    }

    // 7. Seed Activity Logs
    const actCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM activity_logs').get();
    if (actCount.count === 0) {
      const insertAct = this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `);
      insertAct.run('BUS-003 completó la Ruta B en horario', 'ok');
      insertAct.run('BUS-007 reportó retraso de 8 min por congestión', 'warn');
      insertAct.run('Conductor Carlos Mendoza inició turno en Ruta A', 'info');
    }
  }

  _compileStatements() {
    this.stmts = {
      // Buses
      selectBusById: this.sqlite.prepare(`
        SELECT 
          b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
          b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
          b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
          r.id as route_id, r.name as route_name, r.operator as route_operator, r.concession as route_concession, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
          d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
        FROM buses b
        LEFT JOIN routes r ON b.route_id = r.id
        LEFT JOIN drivers d ON b.driver_id = d.id
        WHERE LOWER(b.id) = LOWER(?)
      `),

      insertBus: this.sqlite.prepare(`
        INSERT INTO buses (
          id, bus_number, license_plate, route_id, driver_id, status,
          speed_kmh, passengers_count, capacity, fuel_percent, delay_minutes,
          next_stop, eta_minutes, pos_x, pos_y, _t, _step, _dir, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'stopped', 0, 0, 52, 100, 0, ?, 0, 400.0, 225.0, ?, 0.005, 1, datetime('now'))
      `),

      updateBusStatus: this.sqlite.prepare(`
        UPDATE buses
        SET status = ?, speed_kmh = ?, delay_minutes = ?, updated_at = datetime('now')
        WHERE LOWER(id) = LOWER(?)
      `),

      updateBusTelemetryBatch: this.sqlite.prepare(`
        UPDATE buses SET
          speed_kmh = ?, passengers_count = ?, fuel_percent = ?, delay_minutes = ?,
          next_stop = ?, eta_minutes = ?, pos_x = ?, pos_y = ?, _t = ?, _dir = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `),

      // Routes
      selectAllRoutes: this.sqlite.prepare(`
        SELECT 
          r.id, r.name, r.operator, r.concession, r.var_name as varName, r.color, r.stops_count as stops, r.length_km as length,
          COUNT(b.id) as totalBuses,
          SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as activeBuses,
          COALESCE(SUM(b.passengers_count), 0) as passengersOnboard,
          COALESCE(AVG(b.delay_minutes), 0.0) as avgDelayMinutes
        FROM routes r
        LEFT JOIN buses b ON r.id = b.route_id
        GROUP BY r.id
        ORDER BY r.id ASC
      `),

      selectRouteById: this.sqlite.prepare(`
        SELECT id, name, operator, concession, var_name as varName, color, stops_count as stops, length_km as length
        FROM routes
        WHERE LOWER(id) = LOWER(?)
      `),

      // Drivers
      selectAllDrivers: this.sqlite.prepare(`
        SELECT 
          d.id, d.name, d.initials, d.license_number as license, d.trips_completed as trips, d.rating, d.hours_worked as hours,
          (SELECT b.id FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped' LIMIT 1) as assignedBusId,
          CASE 
            WHEN EXISTS(SELECT 1 FROM buses b WHERE b.driver_id = d.id AND b.status != 'stopped') THEN 'on_duty' 
            ELSE 'off_duty' 
          END as status
        FROM drivers d
        ORDER BY d.id ASC
      `),

      selectDriverById: this.sqlite.prepare(`
        SELECT id, name, initials, license_number as license, trips_completed as trips, rating, hours_worked as hours
        FROM drivers
        WHERE LOWER(id) = LOWER(?)
      `),

      // Alerts
      insertAlert: this.sqlite.prepare(`
        INSERT INTO alerts (severity, icon, title, description, bus_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
      `),

      markAllAlertsRead: this.sqlite.prepare(`
        UPDATE alerts SET is_read = 1 WHERE is_read = 0
      `),



      // Activities
      selectActivities: this.sqlite.prepare(`
        SELECT id, action_text as text, action_type as type, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT 20
      `),

      insertActivity: this.sqlite.prepare(`
        INSERT INTO activity_logs (action_text, action_type, created_at)
        VALUES (?, ?, datetime('now'))
      `),

      // Stops
      selectAllStops: this.sqlite.prepare(`
        SELECT id, name, subtext, is_primary as isPrimary, lat, lon, routes_json, pos_x as x, pos_y as y
        FROM stops
        ORDER BY rowid ASC
      `),
    };
  }

  // --- COMPATIBILITY GETTERS ---
  get stops() {
    return this.getAllStops();
  }

  get buses() {
    return this.getAllBuses();
  }

  get routes() {
    return this.getAllRoutes();
  }

  get drivers() {
    return this.getAllDrivers();
  }

  get alerts() {
    return this.getAllAlerts();
  }

  get activities() {
    return this.getActivities();
  }

  get stops() {
    return this.getAllStops();
  }



  // --- STOPS API ---
  getAllStops() {
    const rows = this.stmts.selectAllStops.all();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      subtext: r.subtext || undefined,
      isPrimary: Boolean(r.isPrimary),
      lat: r.lat,
      lon: r.lon,
      routes: r.routes_json ? JSON.parse(r.routes_json) : [],
      x: r.x,
      y: r.y,
    }));
  }

  // --- BUSES REPOSITORY ---
  _mapBusRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      num: row.bus_number,
      plate: row.license_plate,
      route: {
        id: row.route_id || 'SJO-201',
        name: row.route_name || 'Ruta General',
        operator: row.route_operator || null,
        concession: row.route_concession || null,
        varName: row.route_var_name || `--route-${(row.route_id || 'sjo-201').toLowerCase()}`,
        color: row.route_color || '#5b6ef5',
        stops: row.route_stops || 0,
        length: row.route_length || 0,
      },
      driver: {
        id: row.driver_id || 'D001',
        name: row.driver_name || 'Conductor No Asignado',
        initials: row.driver_initials || 'NA',
        license: row.driver_license || '',
        trips: row.driver_trips || 0,
        rating: row.driver_rating || 5.0,
        hours: row.driver_hours || 0.0,
      },
      status: row.status,
      speed: row.speed_kmh,
      passengers: row.passengers_count,
      capacity: row.capacity,
      fuel: row.fuel_percent,
      delay: row.delay_minutes,
      nextStop: row.next_stop || 'Terminal Central',
      etaMin: row.eta_minutes,
      updatedAgo: 1,
      pos: { x: Number(row.pos_x), y: Number(row.pos_y) },
      _t: Number(row._t || 0),
      _step: Number(row._step || 0.005),
      _dir: Number(row._dir || 1),
    };
  }

  getAllBuses(filters = {}) {
    let sql = `
      SELECT 
        b.id, b.bus_number, b.license_plate, b.status, b.speed_kmh, b.passengers_count,
        b.capacity, b.fuel_percent, b.delay_minutes, b.next_stop, b.eta_minutes,
        b.pos_x, b.pos_y, b._t, b._step, b._dir, b.updated_at,
        r.id as route_id, r.name as route_name, r.operator as route_operator, r.concession as route_concession, r.var_name as route_var_name, r.color as route_color, r.stops_count as route_stops, r.length_km as route_length,
        d.id as driver_id, d.name as driver_name, d.initials as driver_initials, d.license_number as driver_license, d.trips_completed as driver_trips, d.rating as driver_rating, d.hours_worked as driver_hours
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.route && filters.route !== 'all') {
      sql += ' AND LOWER(b.route_id) = LOWER(?)';
      params.push(filters.route);
    }
    if (filters.status && filters.status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      sql += ' AND (LOWER(b.id) LIKE ? OR LOWER(b.license_plate) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(r.name) LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY b.id ASC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => this._mapBusRow(r));
  }

  getBusById(id) {
    if (!id) return null;
    const row = this.stmts.selectBusById.get(id);
    return this._mapBusRow(row);
  }

  createBus(data = {}) {
    const totalCount = this.sqlite.prepare('SELECT COUNT(*) as count FROM buses').get().count;
    const nextNum = totalCount + 1;
    const busId = 'BUS-' + String(nextNum).padStart(3, '0');
    const busNum = String(nextNum).padStart(3, '0');
    const plate = 'SJB-' + String(1000 + nextNum);

    const routes = this.getAllRoutes();
    const drivers = this.getAllDrivers();
    const stops = this.getAllStops();

    const route = data.routeId
      ? this.getRouteById(data.routeId) || routes[0]
      : routes[(nextNum - 1) % routes.length];

    const driver = data.driverId
      ? this.getDriverById(data.driverId) || drivers[0]
      : drivers[(nextNum - 1) % drivers.length];

    const nextStopName = stops.length ? stops[0].name : 'Terminal Central';

    this.stmts.insertBus.run(
      busId,
      busNum,
      plate,
      route.id,
      driver.id,
      nextStopName,
      Math.random()
    );

    return this.getBusById(busId);
  }

  updateBusStatus(id, newStatus) {
    const bus = this.getBusById(id);
    if (!bus) return null;

    let speed = bus.speed;
    let delay = bus.delay;

    if (newStatus === 'stopped' || newStatus === 'maintenance') {
      speed = 0;
      delay = 0;
    } else if (newStatus === 'active') {
      delay = 0;
      if (speed === 0) speed = randInt(25, 55);
    } else if (newStatus === 'delayed') {
      if (speed === 0) speed = randInt(20, 48);
      if (delay === 0) delay = randInt(3, 10);
    }

    this.stmts.updateBusStatus.run(newStatus, speed, delay, id);
    return this.getBusById(id);
  }

  updateAllBusesTelemetry(busesList) {
    for (const b of busesList) {
      this.stmts.updateBusTelemetryBatch.run(
        b.speed,
        b.passengers,
        b.fuel,
        b.delay,
        b.nextStop,
        b.etaMin,
        b.pos.x,
        b.pos.y,
        b._t,
        b._dir,
        b.id
      );
    }
  }

  // --- ROUTES REPOSITORY ---
  getAllRoutes() {
    const rows = this.stmts.selectAllRoutes.all();
    return rows.map(r => {
      const total = Number(r.totalBuses || 0);
      const active = Number(r.activeBuses || 0);
      return {
        id: r.id,
        name: r.name,
        operator: r.operator || null,
        concession: r.concession || null,
        varName: r.varName || `--route-${r.id.toLowerCase()}`,
        color: r.color,
        stops: Number(r.stops),
        length: Number(r.length),
        totalBuses: total,
        activeBuses: active,
        coveragePercent: total ? Math.round((active / total) * 100) : 0,
        passengersOnboard: Number(r.passengersOnboard || 0),
        avgDelayMinutes: total ? +(Number(r.avgDelayMinutes) / 1).toFixed(1) : 0,
      };
    });
  }

  getRouteById(id) {
    if (!id) return null;
    const row = this.stmts.selectRouteById.get(id);
    if (!row) return null;
    const buses = this.getAllBuses({ route: row.id });
    const active = buses.filter(b => b.status === 'active').length;
    return {
      id: row.id,
      name: row.name,
      operator: row.operator || null,
      concession: row.concession || null,
      varName: row.varName || `--route-${row.id.toLowerCase()}`,
      color: row.color,
      stops: Number(row.stops),
      length: Number(row.length),
      totalBuses: buses.length,
      activeBuses: active,
      coveragePercent: buses.length ? Math.round((active / buses.length) * 100) : 0,
      passengersOnboard: buses.reduce((s, b) => s + b.passengers, 0),
      avgDelayMinutes: buses.length ? +(buses.reduce((s, b) => s + b.delay, 0) / buses.length).toFixed(1) : 0,
    };
  }

  // --- DRIVERS REPOSITORY ---
  getAllDrivers() {
    const rows = this.stmts.selectAllDrivers.all();
    return rows.map(d => ({
      id: d.id,
      name: d.name,
      initials: d.initials,
      license: d.license,
      trips: Number(d.trips),
      rating: Number(d.rating),
      hours: Number(d.hours),
      assignedBusId: d.assignedBusId || null,
      status: d.status,
    }));
  }

  getDriverById(id) {
    if (!id) return null;
    const row = this.stmts.selectDriverById.get(id);
    if (!row) return null;
    const assignedBus = this.getAllBuses().find(b => b.driver.id === row.id && b.status !== 'stopped');
    return {
      id: row.id,
      name: row.name,
      initials: row.initials,
      license: row.license,
      trips: Number(row.trips),
      rating: Number(row.rating),
      hours: Number(row.hours),
      assignedBusId: assignedBus ? assignedBus.id : null,
      status: assignedBus ? 'on_duty' : 'off_duty',
    };
  }

  // --- ALERTS REPOSITORY ---
  getAllAlerts(severity = 'all') {
    let sql = 'SELECT id, severity as type, icon, title, description as desc, bus_id as bus, is_read as read, created_at as createdAt FROM alerts';
    const params = [];
    if (severity && severity !== 'all') {
      sql += ' WHERE severity = ?';
      params.push(severity);
    }
    sql += ' ORDER BY id DESC';
    const rows = this.sqlite.prepare(sql).all(...params);
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      icon: r.icon || (r.type === 'critical' ? '🚨' : r.type === 'warning' ? '⚠️' : 'ℹ️'),
      title: r.title,
      desc: r.desc,
      bus: r.bus || 'Sistema',
      time: 'hace momentos',
      read: Boolean(r.read),
      createdAt: r.createdAt,
    }));
  }

  createAlert(data) {
    const type = data.type || data.severity || 'info';
    const icon = data.icon || (type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️');
    const title = data.title || '';
    const desc = data.desc || data.description || '';
    const bus = data.bus || data.bus_id || 'Sistema';

    const info = this.stmts.insertAlert.run(type, icon, title, desc, bus);
    return {
      id: Number(info.lastInsertRowid),
      type,
      icon,
      title,
      desc,
      bus,
      time: 'ahora mismo',
      read: false,
      createdAt: new Date().toISOString(),
    };
  }

  markAllAlertsAsRead() {
    const info = this.stmts.markAllAlertsRead.run();
    return Number(info.changes);
  }



  // --- ACTIVITIES LOG ---
  getActivities() {
    const rows = this.stmts.selectActivities.all();
    return rows.map(r => ({
      id: r.id,
      text: r.text,
      time: 'hace unos momentos',
      type: r.type,
      createdAt: r.created_at,
    }));
  }

  pushActivity(text, type = 'info') {
    const info = this.stmts.insertActivity.run(text, type);
    return {
      id: Number(info.lastInsertRowid),
      text,
      time: 'ahora mismo',
      type,
    };
  }

  // --- DB METADATA & DIAGNOSTICS ---
  getDbStatus() {
    let sizeBytes = 0;
    try {
      if (this.filePath !== ':memory:' && fs.existsSync(this.filePath)) {
        sizeBytes = fs.statSync(this.filePath).size;
      }
    } catch {}

    const sqliteVer = this.sqlite.prepare('SELECT sqlite_version() as v').get().v;
    const tables = [
      { name: 'routes', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM routes').get().c },
      { name: 'drivers', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM drivers').get().c },
      { name: 'buses', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM buses').get().c },
      { name: 'alerts', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM alerts').get().c },
      { name: 'activity_logs', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM activity_logs').get().c },
      { name: 'stops', count: this.sqlite.prepare('SELECT COUNT(*) as c FROM stops').get().c },
    ];

    const totalRows = tables.reduce((acc, t) => acc + t.count, 0);

    return {
      engine: 'SQLite 3 (ACID Relational File DB)',
      version: sqliteVer,
      dialect: 'sqlite',
      connected: true,
      storage: this.filePath === ':memory:' ? 'in_memory_sqlite' : 'persistent_file',
      filePath: this.filePath,
      fileSizeBytes: sizeBytes,
      fileSizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
      totalRows,
      tables,
      features: {
        foreignKeys: true,
        walJournalMode: this.filePath !== ':memory:',
        acidTransactions: true,
        postgresCompatible: true,
      },
    };
  }

  close() {
    try {
      this.sqlite.close();
    } catch {}
  }
}

export const db = new Database();
