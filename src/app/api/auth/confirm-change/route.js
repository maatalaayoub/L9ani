import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Diagnostic check
if (!supabaseUrl || !serviceRoleKey) {
    console.error("Confirm Change API: Missing env variables");
}

const supabaseAdmin = (supabaseUrl && serviceRoleKey)
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    })
    : null;

export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { userId, code } = await request.json();

        if (!userId || !code) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Verify code matches the one in profiles table
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('email_change_code, pending_new_email')
            .eq('auth_user_id', userId)
            .single();

        if (fetchError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (profile.email_change_code !== code) {
            return NextResponse.json({ error: 'Invalid security code' }, { status: 400 });
        }

        if (!profile.pending_new_email) {
            return NextResponse.json({ error: 'No pending email change found' }, { status: 400 });
        }

        const newEmail = profile.pending_new_email;

        // 2. Security Check Passed - Update User in Auth System
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
                email: newEmail,
                email_confirm: true // Auto-confirm the CHANGE itself (so they can log in), but we will require separate verification
            }
        );

        if (updateError) {
            console.error("Update User Error:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 3. Reset Profile Verification Status
        // They are now using the NEW email, so they must verify it again.
        const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email: newEmail,  // Sync email column with auth.users
                email_verified: false,
                email_verified_code: newVerificationCode,
                pending_new_email: null,
                email_change_code: null,
                last_email_change: new Date().toISOString()
            })
            .eq('auth_user_id', userId);

        if (profileUpdateError) {
            console.error("Profile Update Error:", profileUpdateError);
            // User updated but profile failed - partial failure, but we return success so user knows email changed
        }

        return NextResponse.json({ success: true, newEmail });

    } catch (err) {
        console.error('Confirm Change API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
