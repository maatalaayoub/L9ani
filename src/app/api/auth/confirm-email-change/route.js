import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const token = requestUrl.searchParams.get('token');
    const userId = requestUrl.searchParams.get('user_id');
    const origin = requestUrl.origin;

    console.log('[ConfirmEmailChange] Starting');

    if (!token || !userId) {
        console.error('[ConfirmEmailChange] Missing token or user_id');
        return NextResponse.redirect(`${origin}/profile?error=invalid_link`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[ConfirmEmailChange] Missing Supabase configuration');
        return NextResponse.redirect(`${origin}/profile?error=configuration_error`);
    }

    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Get the profile with pending email change
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('email, pending_email, email_change_token, email_change_token_expires')
            .eq('auth_user_id', userId)
            .single();

        if (fetchError || !profile) {
            console.error('[ConfirmEmailChange] Profile not found:', fetchError);
            return NextResponse.redirect(`${origin}/profile?error=user_not_found`);
        }

        // Verify token
        if (profile.email_change_token !== token) {
            console.error('[ConfirmEmailChange] Token mismatch');
            return NextResponse.redirect(`${origin}/profile?error=invalid_token`);
        }

        // Check expiry
        if (new Date(profile.email_change_token_expires) < new Date()) {
            console.error('[ConfirmEmailChange] Token expired');
            // Clear the expired token
            await supabaseAdmin
                .from('profiles')
                .update({
                    pending_email: null,
                    email_change_token: null,
                    email_change_token_expires: null,
                })
                .eq('auth_user_id', userId);
            return NextResponse.redirect(`${origin}/profile?error=token_expired`);
        }

        const newEmail = profile.pending_email;

        if (!newEmail) {
            console.error('[ConfirmEmailChange] No pending email');
            return NextResponse.redirect(`${origin}/profile?error=no_pending_change`);
        }

        // Update the email in auth.users using admin API
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: newEmail,
            email_confirm: true,
        });

        if (authError) {
            console.error('[ConfirmEmailChange] Auth update error:', authError);
            return NextResponse.redirect(`${origin}/profile?error=update_failed`);
        }

        // Update the profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                email: newEmail,
                pending_email: null,
                email_change_token: null,
                email_change_token_expires: null,
            })
            .eq('auth_user_id', userId);

        if (profileError) {
            console.error('[ConfirmEmailChange] Profile update error:', profileError);
            // Auth was updated but profile failed - still consider success
        }

        console.log('[ConfirmEmailChange] Email changed successfully to:', newEmail);
        return NextResponse.redirect(`${origin}/profile?email_changed=true`);

    } catch (err) {
        console.error('[ConfirmEmailChange] Unexpected error:', err);
        return NextResponse.redirect(`${origin}/profile?error=unexpected_error`);
    }
}
