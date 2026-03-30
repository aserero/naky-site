import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars are missing in imported-naky.');
}

export const supabase = createClient(
  supabaseUrl || 'https://demo-project.supabase.co',
  supabaseAnonKey || 'demo-key'
);
