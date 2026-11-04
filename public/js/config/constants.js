/**
 * BusTrack Pro — Constantes y configuraciones globales
 */

export const ACCENTS = [
  { id: 'indigo', label: 'Índigo', swatch: 'linear-gradient(135deg,#5b6ef5,#7c4ddb)' },
  { id: 'teal', label: 'Verde azulado', swatch: 'linear-gradient(135deg,#22a79b,#2aa3c4)' },
  { id: 'forest', label: 'Verde', swatch: 'linear-gradient(135deg,#2f9e63,#2aa3c4)' },
  { id: 'amber', label: 'Ámbar', swatch: 'linear-gradient(135deg,#d38b2a,#c96a3c)' },
  { id: 'rose', label: 'Rosa', swatch: 'linear-gradient(135deg,#d95273,#9b4bc4)' },
];

export const STATUS_LABELS = {
  active: 'En servicio',
  delayed: 'Retrasado',
  stopped: 'Detenido',
  maintenance: 'Mantenimiento',
};

export const STATUS_ORDER = {
  active: 0,
  delayed: 1,
  stopped: 2,
  maintenance: 3,
};

export const VIEW_TITLES = {
  dashboard: 'Panel Principal',
  map: 'Mapa en Vivo',
  schedules: 'Horarios de Buses (Costa Rica)',
  fleet: 'Horarios de Buses (Costa Rica)',
  routes: 'Rutas',
  reports: 'Reportes',
  drivers: 'Conductores',
};

export const SUPABASE_URL = 'https://jhuvaqrdhkzxqmvcrlws.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_YdweRSdqvXLG_Ai1GQVYQw_sOtK_hZ0';

