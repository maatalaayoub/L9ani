import { createClient } from '@supabase/supabase-js';

// Environment variables - NEXT_PUBLIC_ prefix makes them available on client-side
// These MUST be set in Vercel Environment Variables for production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Debug: Log on client side to verify env vars are loaded
if (typeof window !== 'undefined') {
    console.log('[Supabase] URL exists:', !!supabaseUrl, 'Key exists:', !!supabaseAnonKey);
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Supabase] Missing environment variables!');
        console.error('[Supabase] URL:', supabaseUrl ? 'SET' : 'MISSING');
        console.error('[Supabase] ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
    }
}

// Always create the client - required for Next.js static optimization
// The client will fail gracefully on API calls if credentials are invalid
export const supabase = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,  // Important for OAuth redirects
            flowType: 'pkce',  // Recommended for SPAs
        }
    })
    : null;

// Admin client for privileged operations (server-side ONLY)
export const supabaseAdmin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    })
    : null;
