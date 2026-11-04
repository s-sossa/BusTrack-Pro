/**
 * BusTrack Pro — Gestor de Tema (Modo Claro / Oscuro y Acentos)
 */
import { prefs, savePrefs } from './state.js';
import { toast, $ } from './utils.js';

export function applyTheme(theme, showToast = false) {
  const currentTheme = theme === 'light' ? 'light' : 'dark';
  prefs.theme = currentTheme;
  document.documentElement.setAttribute('data-theme', currentTheme);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', currentTheme === 'light' ? '#f8fafc' : '#0a0f1c');
  }

  const isLight = currentTheme === 'light';
  const label = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';

  const themeToggleBtn = $('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.setAttribute('aria-label', label);
    themeToggleBtn.setAttribute('title', label);
  }

  const sidebarThemeBtn = $('sidebarThemeToggleBtn');
  if (sidebarThemeBtn) {
    sidebarThemeBtn.setAttribute('aria-label', label);
    sidebarThemeBtn.setAttribute('title', label);
  }

  const themeSwitch = $('themeSwitch');
  if (themeSwitch) {
    themeSwitch.setAttribute('aria-checked', String(isLight));
  }

  try {
    localStorage.setItem('bustrack:theme', currentTheme);
  } catch (_) {}

  if (showToast) {
    toast(`Modo ${isLight ? 'claro' : 'oscuro'} activado`, 'info');
  }
}

export function toggleTheme() {
  const nextTheme = prefs.theme === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme, true);
  savePrefs();
}

