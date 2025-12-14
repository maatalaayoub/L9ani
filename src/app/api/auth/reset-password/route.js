import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = requestUrl.origin;

    console.log('[ResetPassword API] Starting, code exists:', !!code);

    // Handle errors from Supabase
    if (error) {
        console.error('[ResetPassword API] Error:', error, errorDescription);
        return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code) {
        console.error('[ResetPassword API] No code provided');
        return NextResponse.redirect(`${origin}/reset-password?error=missing_code`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[ResetPassword API] Missing Supabase configuration');
        return NextResponse.redirect(`${origin}/reset-password?error=configuration_error`);
    }

    try {
        // Create a server-side Supabase client WITHOUT PKCE
        // This allows us to exchange the code without needing the code_verifier
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                flowType: 'implicit', // Use implicit flow for server-side exchange
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
            },
        });

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('[ResetPassword API] Exchange error:', exchangeError);
            return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(exchangeError.message)}`);
        }

        if (!data.session) {
            console.error('[ResetPassword API] No session returned');
            return NextResponse.redirect(`${origin}/reset-password?error=no_session`);
        }

        console.log('[ResetPassword API] Session obtained successfully');

        // Redirect to reset-password page with tokens in hash (implicit flow format)
        // This way the client can pick up the tokens directly
        const { access_token, refresh_token } = data.session;
        const redirectUrl = `${origin}/reset-password#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`;

        return NextResponse.redirect(redirectUrl);

    } catch (err) {
        console.error('[ResetPassword API] Error:', err);
        return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(err.message || 'unknown_error')}`);
    }
}
