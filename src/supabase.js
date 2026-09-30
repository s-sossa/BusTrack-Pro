import { createClient } from '@supabase/supabase-js';

// Asigna las variables de entorno para Vite (Frontend) o Node.js
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Crea y exporta el cliente para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseKey);

