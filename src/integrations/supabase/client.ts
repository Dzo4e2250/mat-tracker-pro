// Mat Tracker Supabase Client
// Uses self-hosted Supabase with mat_tracker schema
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DB_SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'mat_tracker';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: DB_SCHEMA,
  },
});

// Export schema for use in queries
export const SCHEMA = DB_SCHEMA;