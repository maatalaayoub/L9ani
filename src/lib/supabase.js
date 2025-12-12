import { createClient } from '@supabase/supabase-js';

// Environment variables - NEXT_PUBLIC_ prefix makes them available on client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug logging (only in development)
if (process.env.NODE_ENV === 'development') {
    console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('Supabase Anon Key:', supabaseAnonKey ? 'SET' : 'NOT SET');
}

// Client for public operations (client-side safe)
// Create client only if we have valid credentials
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    // Create a dummy client that will show meaningful errors
    console.error('Supabase environment variables are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Admin client for privileged operations (server-side ONLY)
let supabaseAdmin = null;
if (supabaseUrl && serviceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

export { supabase, supabaseAdmin };
