import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { token, userId, newPassword } = await request.json();

        console.log('[ConfirmPasswordReset] Request received for user:', userId);

        if (!token || !userId || !newPassword) {
            return NextResponse.json({ error: 'Token, user ID, and new password are required' }, { status: 400 });
        }

        // Validate password
        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }
        if (!/\d/.test(newPassword)) {
            return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return NextResponse.json({ error: 'Password must contain at least one special character' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[ConfirmPasswordReset] Missing Supabase configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Verify the token exists and is valid
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, password_reset_token, password_reset_token_expires')
            .eq('auth_user_id', userId)
            .single();

        if (fetchError || !profile) {
            console.error('[ConfirmPasswordReset] Profile not found:', fetchError);
            return NextResponse.json({ error: 'Invalid reset link' }, { status: 400 });
        }

        // Check if token matches
        if (profile.password_reset_token !== token) {
            console.log('[ConfirmPasswordReset] Token mismatch');
            return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
        }

        // Check if token has expired
        if (profile.password_reset_token_expires) {
            const expiryDate = new Date(profile.password_reset_token_expires);
            if (expiryDate < new Date()) {
                console.log('[ConfirmPasswordReset] Token expired');
                // Clear the expired token
                await supabaseAdmin
                    .from('profiles')
                    .update({
                        password_reset_token: null,
                        password_reset_token_expires: null,
                    })
                    .eq('auth_user_id', userId);
                
                return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
            }
        }

        console.log('[ConfirmPasswordReset] Token valid, updating password...');

        // Update the password using Admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) {
            console.error('[ConfirmPasswordReset] Password update error:', updateError);
            
            // Handle "same password" error
            if (updateError.message && updateError.message.toLowerCase().includes('same')) {
                return NextResponse.json({ error: 'New password must be different from your current password' }, { status: 400 });
            }
            
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        console.log('[ConfirmPasswordReset] Password updated successfully');

        // Clear the reset token
        const { error: clearError } = await supabaseAdmin
            .from('profiles')
            .update({
                password_reset_token: null,
                password_reset_token_expires: null,
            })
            .eq('auth_user_id', userId);

        if (clearError) {
            console.warn('[ConfirmPasswordReset] Failed to clear token:', clearError);
            // Don't fail the request, password was already updated
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Password reset successfully' 
        });

    } catch (err) {
        console.error('[ConfirmPasswordReset] Unexpected error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}

// GET endpoint to validate token without resetting
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const userId = searchParams.get('user_id');

        console.log('[ConfirmPasswordReset] Token validation request for user:', userId);
        console.log('[ConfirmPasswordReset] Token received:', token ? `${token.substring(0, 8)}...` : 'none');

        if (!token || !userId) {
            return NextResponse.json({ valid: false, error: 'Token and user ID are required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[ConfirmPasswordReset] Missing Supabase configuration');
            return NextResponse.json({ valid: false, error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Verify the token exists and is valid
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, password_reset_token, password_reset_token_expires')
            .eq('auth_user_id', userId)
            .single();

        console.log('[ConfirmPasswordReset] Profile fetch result:', { 
            hasProfile: !!profile, 
            error: fetchError?.message,
            hasToken: !!profile?.password_reset_token,
            tokenExpires: profile?.password_reset_token_expires
        });

        if (fetchError) {
            console.error('[ConfirmPasswordReset] Fetch error:', fetchError);
            // Check if error is about missing columns
            if (fetchError.message?.includes('password_reset_token')) {
                console.error('[ConfirmPasswordReset] Missing password_reset_token column. Run migration 016.');
                return NextResponse.json({ valid: false, error: 'Server configuration error. Please contact support.' });
            }
            return NextResponse.json({ valid: false, error: 'Invalid reset link' });
        }

        if (!profile) {
            console.log('[ConfirmPasswordReset] Profile not found');
            return NextResponse.json({ valid: false, error: 'Invalid reset link' });
        }

        // Check if password_reset_token column exists and has a value
        if (!profile.password_reset_token) {
            console.log('[ConfirmPasswordReset] No reset token stored for this user');
            return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' });
        }

        // Check if token matches
        if (profile.password_reset_token !== token) {
            console.log('[ConfirmPasswordReset] Token mismatch');
            console.log('[ConfirmPasswordReset] Stored:', profile.password_reset_token?.substring(0, 8) + '...');
            console.log('[ConfirmPasswordReset] Provided:', token.substring(0, 8) + '...');
            return NextResponse.json({ valid: false, error: 'Invalid or expired reset link' });
        }

        // Check if token has expired
        if (profile.password_reset_token_expires) {
            const expiryDate = new Date(profile.password_reset_token_expires);
            if (expiryDate < new Date()) {
                console.log('[ConfirmPasswordReset] Token expired at:', expiryDate);
                return NextResponse.json({ valid: false, error: 'Reset link has expired' });
            }
        }

        console.log('[ConfirmPasswordReset] Token is valid');
        return NextResponse.json({ valid: true });

    } catch (err) {
        console.error('[ConfirmPasswordReset] Unexpected error:', err);
        return NextResponse.json({ valid: false, error: 'An unexpected error occurred' }, { status: 500 });
    }
}
