import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawKey = process.env.SUPABASE_ANON_KEY || 
               process.env.SUPABASE_PUBLISHABLE_KEY || 
               process.env.SUPABASE_SERVICE_ROLE_KEY || 
               process.env.SUPABASE_SECRET_KEY || 
               process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('dummy-project'));

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-url.supabase.co';
const supabaseKey = rawKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

