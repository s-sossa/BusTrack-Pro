/**
 * BusTrack Pro — Gestor de Estado Centralizado
 */

export const state = {
  view: 'dashboard',
  busFilter: 'all',
  chartPeriod: 'day',
  sort: { key: 'id', dir: 1 },
  highlightBus: null,
  trackingBus: null,
};

export const prefs = {
  theme: 'dark',
  accent: 'indigo',
  motion: true,
  live: true,
  density: 'normal',
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem('bustrack:prefs');
    if (raw) Object.assign(prefs, JSON.parse(raw));
    const savedTheme = localStorage.getItem('bustrack:theme');
    if (savedTheme) prefs.theme = savedTheme;
  } catch (e) {
    console.warn('No se pudieron leer las preferencias:', e);
  }
  return prefs;
}

export function savePrefs() {
  try {
    localStorage.setItem('bustrack:prefs', JSON.stringify(prefs));
    if (prefs.theme) localStorage.setItem('bustrack:theme', prefs.theme);
  } catch (e) {
    console.warn('No se pudieron guardar las preferencias:', e);
  }
}

