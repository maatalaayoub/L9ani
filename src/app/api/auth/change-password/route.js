import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, email, oldPassword, newPassword, confirmPassword } = body;

        // Validation
        if (!userId || !email || !oldPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'New passwords do not match' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        if (!/\d/.test(newPassword)) {
            return NextResponse.json(
                { error: 'Password must contain at least one number' },
                { status: 400 }
            );
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return NextResponse.json(
                { error: 'Password must contain at least one symbol' },
                { status: 400 }
            );
        }

        // Verify the old password by attempting to sign in
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });

        const { error: signInError } = await tempClient.auth.signInWithPassword({
            email: email,
            password: oldPassword,
        });

        if (signInError) {
            console.error('Old password verification failed:', signInError);
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Old password is correct, now update to new password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (updateError) {
            console.error('Error changing password:', updateError);
            return NextResponse.json(
                { error: 'Failed to change password: ' + updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Password changed successfully' },
            { status: 200 }
        );

    } catch (err) {
        console.error('Change password route error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
