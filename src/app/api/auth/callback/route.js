import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = requestUrl.origin;

    console.log('[OAuth Callback] Starting, code exists:', !!code);

    // Handle OAuth errors from provider
    if (error) {
        console.error('[OAuth Callback] OAuth error:', error, errorDescription);
        return NextResponse.redirect(`${origin}?error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (code) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[OAuth Callback] Missing Supabase configuration');
            return NextResponse.redirect(`${origin}?error=Configuration error`);
        }

        try {
            // Create Supabase client with cookie storage for SSR
            const cookieStore = await cookies();
            
            const supabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    flowType: 'pkce',
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                    persistSession: false,
                },
            });

            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error('[OAuth Callback] Exchange error:', exchangeError);
                return NextResponse.redirect(`${origin}?error=${encodeURIComponent(exchangeError.message)}`);
            }

            if (data.session && data.user) {
                console.log('[OAuth Callback] Session obtained for user:', data.user.email);
                
                // Create response with redirect
                const response = NextResponse.redirect(`${origin}?auth=success`);
                
                // Set session cookies so the client can pick them up
            // These cookies will be read by the Supabase client on the frontend
            response.cookies.set('sb-access-token', data.session.access_token, {
                path: '/',
                httpOnly: false,  // Client needs to read this
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });
            
            response.cookies.set('sb-refresh-token', data.session.refresh_token, {
                path: '/',
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days
            });

            // Store user info temporarily for the client to read
            response.cookies.set('sb-user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                user_metadata: data.user.user_metadata,
            }), {
                path: '/',
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60, // Short-lived, just for initial pickup
            });

            // Check if user profile exists, if not create one (using admin client)
            // This is done asynchronously and should not block the redirect
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (serviceRoleKey) {
                try {
                    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
                    
                    // First check by auth_user_id
                    const { data: existingProfile } = await supabaseAdmin
                        .from('profiles')
                        .select('id, auth_user_id')
                        .eq('auth_user_id', data.user.id)
                        .single();

                    if (!existingProfile) {
                        // Also check if profile exists with same email (different auth_user_id)
                        // This handles the case where user signed up with email, then tries Google login
                        const { data: profileByEmail } = await supabaseAdmin
                            .from('profiles')
                            .select('auth_user_id, has_password')
                            .ilike('email', data.user.email)
                            .maybeSingle();

                        if (profileByEmail) {
                            // Profile exists with this email but different auth_user_id
                            // This means user already has an account - link them or update
                            console.log('[OAuth Callback] Found existing profile with same email, updating auth_user_id');
                            
                            // Update the existing profile to link to this OAuth auth_user_id
                            // Note: This effectively links the accounts
                            const { error: updateError } = await supabaseAdmin
                                .from('profiles')
                                .update({ 
                                    auth_user_id: data.user.id,
                                    // Keep has_password as is - they can still use their password
                                    avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null
                                })
                                .eq('auth_user_id', profileByEmail.auth_user_id);

                            if (updateError) {
                                console.error('[OAuth Callback] Error linking accounts:', updateError);
                            } else {
                                console.log('[OAuth Callback] Successfully linked OAuth to existing account');
                            }
                        } else {
                            // No profile exists at all - create new one
                            const userMetadata = data.user.user_metadata || {};
                            const fullName = userMetadata.full_name || userMetadata.name || '';
                            const nameParts = fullName.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ') || '';
                            const baseUsername = data.user.email?.split('@')[0] || 'user';
                            const username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

                            // Create profile - terms_accepted is false for OAuth users
                            // They will be prompted to accept terms on first login
                            const { error: profileError } = await supabaseAdmin.from('profiles').insert({
                                auth_user_id: data.user.id,
                                email: data.user.email,
                                username: username,
                                first_name: firstName,
                                last_name: lastName,
                                avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
                                has_password: false,
                                terms_accepted: false,
                                created_at: new Date().toISOString(),
                            });

                            if (profileError) {
                                console.error('[OAuth Callback] Profile creation error:', profileError);
                            } else {
                                // Create default settings
                                const { error: settingsError } = await supabaseAdmin.from('user_settings').insert({
                                    user_id: data.user.id,
                                    theme: 'system',
                                    language: 'en',
                                    sighting_alerts: true,
                                    new_device_login: true,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                });
                                
                                if (settingsError) {
                                    console.error('[OAuth Callback] Settings creation error:', settingsError);
                                }
                            }
                        }
                    }
                } catch (profileErr) {
                    console.error('[OAuth Callback] Profile/settings creation exception:', profileErr);
                    // Don't fail the auth - profile can be created later
                }
            }

            console.log('[OAuth Callback] Redirecting to auth=success');
            return response;
            }
        } catch (err) {
            console.error('[OAuth Callback] Unexpected error:', err);
            return NextResponse.redirect(`${origin}?error=${encodeURIComponent('Authentication failed')}`);
        }
    }

    // If no code, redirect to home
    console.log('[OAuth Callback] No code found, redirecting to home');
    return NextResponse.redirect(origin);
}
