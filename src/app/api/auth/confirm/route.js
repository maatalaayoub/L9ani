import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = requestUrl.origin;

    console.log('[ConfirmEmail API] Starting');
    console.log('[ConfirmEmail API] token_hash:', !!token_hash, 'type:', type);

    // Handle errors from Supabase
    if (error) {
        console.error('[ConfirmEmail API] Error:', error, errorDescription);
        return NextResponse.redirect(`${origin}?error=${encodeURIComponent(errorDescription || error)}&type=email_confirm`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[ConfirmEmail API] Missing Supabase configuration');
        return NextResponse.redirect(`${origin}?error=configuration_error&type=email_confirm`);
    }

    if (!token_hash) {
        console.error('[ConfirmEmail API] No token_hash provided');
        return NextResponse.redirect(`${origin}?error=invalid_token&type=email_confirm`);
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

        // Handle signup confirmation
        if (type === 'signup') {
            console.log('[ConfirmEmail API] Verifying signup token');
            
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token_hash,
                type: 'signup',
            });

            if (verifyError) {
                console.error('[ConfirmEmail API] verifyOtp error:', verifyError);
                return NextResponse.redirect(`${origin}?error=${encodeURIComponent(verifyError.message)}&type=email_confirm`);
            }

            if (data.user) {
                console.log('[ConfirmEmail API] Email confirmed for user:', data.user.email);
                
                // Update the profile to mark email as verified if needed
                if (data.session) {
                    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                        },
                        global: {
                            headers: {
                                Authorization: `Bearer ${data.session.access_token}`,
                            },
                        },
                    });

                    // Update profile email_verified status
                    await supabaseAdmin
                        .from('profiles')
                        .update({ 
                            email_verified: true,
                            email_verification_code: null 
                        })
                        .eq('id', data.user.id);
                }

                // Redirect to home with success message
                return NextResponse.redirect(`${origin}?email_confirmed=true`);
            }
        }

        // Handle email change confirmation
        if (type === 'email_change') {
            console.log('[ConfirmEmail API] Verifying email change token');
            
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token_hash,
                type: 'email_change',
            });

            if (verifyError) {
                console.error('[ConfirmEmail API] verifyOtp error:', verifyError);
                return NextResponse.redirect(`${origin}/settings?error=${encodeURIComponent(verifyError.message)}&type=email_change`);
            }

            if (data.user) {
                console.log('[ConfirmEmail API] Email changed successfully for user:', data.user.email);
                
                // Update the profile with new email if needed
                if (data.session) {
                    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                        },
                        global: {
                            headers: {
                                Authorization: `Bearer ${data.session.access_token}`,
                            },
                        },
                    });

                    // Update profile email
                    await supabaseAdmin
                        .from('profiles')
                        .update({ email: data.user.email })
                        .eq('id', data.user.id);
                }

                // Redirect to settings with success message
                return NextResponse.redirect(`${origin}/settings?email_changed=true`);
            }
        }

        // Unknown type
        console.error('[ConfirmEmail API] Unknown type:', type);
        return NextResponse.redirect(`${origin}?error=invalid_request&type=email_confirm`);

    } catch (err) {
        console.error('[ConfirmEmail API] Unexpected error:', err);
        return NextResponse.redirect(`${origin}?error=unexpected_error&type=email_confirm`);
    }
}
