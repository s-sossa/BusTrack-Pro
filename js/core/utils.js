/**
 * BusTrack Pro — Utilidades generales y helpers del DOM
 */

export const $ = id => document.getElementById(id);
export const $$ = sel => Array.from(document.querySelectorAll(sel));

export function on(target, event, handler) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener(event, handler);
  }
}

export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cssVar(name, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const fmt = n => Number(n).toLocaleString('es-CR');

export function hapticFeedback(pattern = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

export function toast(message, type = 'info', duration = 3200) {
  const stack = $('toastStack');
  if (!stack) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 240);
  }, duration);
}

