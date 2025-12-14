import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = requestUrl.origin;

    console.log('[ResetPassword API] Starting');
    console.log('[ResetPassword API] code:', !!code, 'token_hash:', !!token_hash, 'type:', type);

    // Handle errors from Supabase
    if (error) {
        console.error('[ResetPassword API] Error:', error, errorDescription);
        return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(errorDescription || error)}`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[ResetPassword API] Missing Supabase configuration');
        return NextResponse.redirect(`${origin}/reset-password?error=configuration_error`);
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                flowType: 'implicit',
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
            },
        });

        // Try token_hash verification first (OTP flow)
        if (token_hash && type === 'recovery') {
            console.log('[ResetPassword API] Using token_hash verification');
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token_hash,
                type: 'recovery',
            });

            if (verifyError) {
                console.error('[ResetPassword API] verifyOtp error:', verifyError);
                return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(verifyError.message)}`);
            }

            if (data.session) {
                console.log('[ResetPassword API] Token verification successful');
                const { access_token, refresh_token } = data.session;
                return NextResponse.redirect(`${origin}/reset-password#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`);
            }
        }

        // If we have a code, try to exchange it (may fail with PKCE)
        if (code) {
            console.log('[ResetPassword API] Attempting code exchange');
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (!exchangeError && data.session) {
                console.log('[ResetPassword API] Code exchange successful');
                const { access_token, refresh_token } = data.session;
                return NextResponse.redirect(`${origin}/reset-password#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`);
            }

            // If code exchange fails, redirect with error
            console.error('[ResetPassword API] Code exchange failed:', exchangeError);
            return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(exchangeError?.message || 'code_exchange_failed')}`);
        }

        // No valid parameters
        console.error('[ResetPassword API] No code or token_hash provided');
        return NextResponse.redirect(`${origin}/reset-password?error=missing_parameters`);

    } catch (err) {
        console.error('[ResetPassword API] Error:', err);
        return NextResponse.redirect(`${origin}/reset-password?error=${encodeURIComponent(err.message || 'unknown_error')}`);
    }
}
