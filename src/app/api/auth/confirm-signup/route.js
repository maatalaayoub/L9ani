import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyEmailVerified } from '@/lib/notifications';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const userId = searchParams.get('user_id');

        console.log('[ConfirmSignup] Request received:', { token: token?.substring(0, 10) + '...', userId });

        // Get the base URL for redirects
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';

        if (!token || !userId) {
            console.error('[ConfirmSignup] Missing token or user_id');
            return NextResponse.redirect(`${baseUrl}/en/profile?error=invalid_link`);
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[ConfirmSignup] Missing Supabase configuration');
            return NextResponse.redirect(`${baseUrl}/en/profile?error=server_error`);
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Find the profile with this token
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, email, email_verification_token, email_verification_token_expires, email_verified')
            .eq('auth_user_id', userId)
            .single();

        if (fetchError || !profile) {
            console.error('[ConfirmSignup] Profile not found:', fetchError);
            return NextResponse.redirect(`${baseUrl}/en/profile?error=user_not_found`);
        }

        // Check if already verified
        if (profile.email_verified) {
            console.log('[ConfirmSignup] Email already verified for user:', userId);
            return NextResponse.redirect(`${baseUrl}/en/profile?verified=already`);
        }

        // Verify token matches
        if (profile.email_verification_token !== token) {
            console.error('[ConfirmSignup] Token mismatch');
            return NextResponse.redirect(`${baseUrl}/en/profile?error=invalid_link`);
        }

        // Check if token is expired
        if (profile.email_verification_token_expires) {
            const expiryDate = new Date(profile.email_verification_token_expires);
            if (new Date() > expiryDate) {
                console.error('[ConfirmSignup] Token expired');
                return NextResponse.redirect(`${baseUrl}/en/profile?error=token_expired`);
            }
        }

        // Update profile to mark email as verified
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email_verified: true,
                email_verification_token: null,
                email_verification_token_expires: null,
            })
            .eq('auth_user_id', userId);

        if (updateError) {
            console.error('[ConfirmSignup] Update error:', updateError);
            return NextResponse.redirect(`${baseUrl}/en/profile?error=update_failed`);
        }

        console.log('[ConfirmSignup] Email verified successfully for user:', userId);

        // Create notification that email was verified
        await notifyEmailVerified(userId, profile.email, { locale: 'en' });

        // Redirect to profile with success message
        return NextResponse.redirect(`${baseUrl}/en/profile?email_verified=true`);

    } catch (err) {
        console.error('[ConfirmSignup] Unexpected error:', err);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
        return NextResponse.redirect(`${baseUrl}/en/profile?error=unexpected_error`);
    }
}
