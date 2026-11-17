/**
 * BusTrack Pro — Herramienta de Ingesta Masiva de Paradas de Autobús de Costa Rica
 * 
 * Permite poblar la base de datos SQLite (data/bustrack.sqlite) con decenas de miles
 * de paradas intermedias a nivel nacional desde:
 * 1. OpenStreetMap Overpass API (etiquetas highway=bus_stop y public_transport=platform en Costa Rica).
 * 2. Archivos locales GeoJSON / GTFS exportados del Consejo de Transporte Público (CTP) o MOPT.
 * 
 * Uso:
 *   node scripts/import-osm-stops.js --overpass
 *   node scripts/import-osm-stops.js --file=ruta/a/paradas.geojson
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '..', 'data', 'bustrack.sqlite');

function getDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new DatabaseSync(DB_PATH);
}

function classifyProvince(lat, lon) {
  // Delimitación heurística rápida de provincias de Costa Rica por coordenadas
  if (lat >= 10.1 && lon <= -85.0) return 'Guanacaste';
  if (lon >= -83.6 && lat <= 10.7) return 'Limón';
  if (lat <= 9.7 && lon <= -83.0) return 'Puntarenas';
  if (lat <= 9.98 && lon <= -84.5 && lon >= -84.9) return 'Puntarenas';
  if (lat <= 9.93 && lon >= -83.98 && lon <= -83.5) return 'Cartago';
  if (lat >= 9.97 && lat <= 10.5 && lon >= -84.18 && lon <= -84.0) return 'Heredia';
  if (lat >= 10.0 && lon <= -84.18 && lon >= -84.8) return 'Alajuela';
  return 'San José';
}

export async function importFromOverpass(limit = 2000) {
  console.log('📡 Conectando a OpenStreetMap Overpass API para Costa Rica...');
  
  // Query Overpass para Costa Rica (bbox: 8.03, -85.95, 11.22, -82.55)
  const query = `
    [out:json][timeout:90];
    (
      node["highway"="bus_stop"](8.03,-85.95,11.22,-82.55);
      node["public_transport"="platform"](8.03,-85.95,11.22,-82.55);
    );
    out body ${limit};
  `;

  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    throw new Error(`Overpass API respondió con HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const elements = data.elements || [];
  console.log(`✅ ${elements.length} paradas recibidas de OpenStreetMap.`);

  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO stops (id, name, subtext, is_primary, lat, lon, routes_json, pos_x, pos_y, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let count = 0;
  for (const el of elements) {
    if (!el.lat || !el.lon) continue;
    const name = el.tags?.name || el.tags?.['name:es'] || `Parada ${el.tags?.ref || el.id}`;
    const subtext = el.tags?.description || el.tags?.bench ? `Parada con banca y techo` : `Parada de autobús local`;
    const province = classifyProvince(el.lat, el.lon);
    const stopId = `osm-${el.id}`;

    insertStmt.run(
      stopId,
      name,
      `${subtext} (${province})`,
      0,
      el.lat,
      el.lon,
      JSON.stringify([]),
      400,
      225
    );
    count++;
  }

  console.log(`💾 ${count} paradas procesadas e integradas en ${DB_PATH}.`);
  db.close();
}

export function importFromFile(filePath) {
  console.log(`📂 Leyendo archivo: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);
  const items = Array.isArray(json) ? json : json.features || [];

  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO stops (id, name, subtext, is_primary, lat, lon, routes_json, pos_x, pos_y, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let count = 0;
  for (const item of items) {
    const props = item.properties || item;
    const geom = item.geometry || {};
    const coords = geom.coordinates || [item.lon, item.lat];
    const lon = coords[0];
    const lat = coords[1];
    if (!lat || !lon) continue;

    const id = props.id || `stop-${count + 1}`;
    const name = props.name || props.nombre || `Parada ${id}`;
    const subtext = props.subtext || props.descripcion || null;
    const isPrimary = props.isPrimary ? 1 : 0;

    insertStmt.run(id, name, subtext, isPrimary, lat, lon, JSON.stringify([]), 400, 225);
    count++;
  }

  console.log(`💾 ${count} paradas importadas exitosamente.`);
  db.close();
}

// Ejecución CLI directa
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isOverpass = process.argv.includes('--overpass');
  const fileArg = process.argv.find(a => a.startsWith('--file='));

  if (fileArg) {
    const p = fileArg.split('=')[1];
    importFromFile(p);
  } else if (isOverpass) {
    importFromOverpass().catch(err => console.error('Error:', err.message));
  } else {
    console.log('Uso: node scripts/import-osm-stops.js [--overpass | --file=archivo.geojson]');
  }
}
