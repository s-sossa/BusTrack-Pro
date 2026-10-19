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

const url = isSupabaseConfigured ? rawUrl : 'https://placeholder-url.supabase.co';
const sessionOpts = { auth: { persistSession: false, autoRefreshToken: false } };

export const supabase = createClient(url, anonKey || 'placeholder-anon-key', sessionOpts);
export const supabaseAdmin = createClient(url, serviceKey || anonKey || 'placeholder-anon-key', sessionOpts);
