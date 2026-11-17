import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawUrl.startsWith('http') && anonKey);

// ⛔ SECURITY: Si SUPABASE_SERVICE_ROLE_KEY no está definida, advertir explícitamente.
// En producción, configura REQUIRE_SERVICE_ROLE=true para causar error de arranque.
if (!serviceKey && process.env.REQUIRE_SERVICE_ROLE === 'true') {
  console.error('[SECURITY] FATAL: SUPABASE_SERVICE_ROLE_KEY no está definida. Abortando (REQUIRE_SERVICE_ROLE=true).');
  process.exit(1);
}

if (!serviceKey) {
  console.warn('[SECURITY] ADVERTENCIA: SUPABASE_SERVICE_ROLE_KEY no configurada. supabaseAdmin usará anonKey — operaciones admin (deleteUser, etc.) pueden fallar o estar restringidas por RLS. Configura SUPABASE_SERVICE_ROLE_KEY en .env para habilitar todas las funcionalidades administrativas.');
}

const url = isSupabaseConfigured ? rawUrl : 'https://placeholder-url.supabase.co';
const sessionOpts = { auth: { persistSession: false, autoRefreshToken: false } };

export const supabase = createClient(url, anonKey || 'placeholder-anon-key', sessionOpts);

// supabaseAdmin usa serviceKey si está disponible; si no, cae a anonKey con advertencia ya emitida.
export const supabaseAdmin = serviceKey
  ? createClient(url, serviceKey, sessionOpts)
  : createClient(url, anonKey || 'placeholder-anon-key', sessionOpts);

// Exportar indicador para que otros módulos sepan si tienen privilegios de admin reales
export const hasAdminPrivileges = Boolean(serviceKey);
