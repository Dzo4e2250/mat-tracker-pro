// Mat Tracker Supabase Client
// Uses self-hosted Supabase with mat_tracker schema
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DB_SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'mat_tracker';

// Custom fetch that reports failed requests to Sentry with URL diagnostics
const instrumentedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  try {
    const response = await fetch(input, init);
    if (!response.ok && response.status >= 500) {
      Sentry.addBreadcrumb({
        category: 'supabase',
        message: `API ${response.status}: ${url.split('?')[0]}`,
        level: 'error',
        data: {
          status: response.status,
          urlLength: url.length,
          method: init?.method || 'GET',
        },
      });
    }
    return response;
  } catch (error) {
    // Network error (Failed to fetch) - likely CORS/502/URL too long
    Sentry.captureMessage('Supabase fetch failed', {
      level: 'error',
      tags: {
        urlLength: String(url.length),
        urlTooLong: String(url.length > 4000),
        method: init?.method || 'GET',
        endpoint: url.split('?')[0].replace(SUPABASE_URL, ''),
      },
      extra: {
        urlLength: url.length,
        queryParamCount: (url.match(/%2C/g) || []).length,
      },
    });
    throw error;
  }
};

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
  global: {
    fetch: instrumentedFetch,
  },
});

// Export schema for use in queries
export const SCHEMA = DB_SCHEMA;