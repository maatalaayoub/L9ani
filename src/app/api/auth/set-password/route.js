import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, password, confirmPassword } = body;

        // Validation
        if (!userId || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        if (!/\d/.test(password)) {
            return NextResponse.json(
                { error: 'Password must contain at least one number' },
                { status: 400 }
            );
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return NextResponse.json(
                { error: 'Password must contain at least one symbol' },
                { status: 400 }
            );
        }

        // Verify the user exists and is an OAuth user
        const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (userError || !authUser?.user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Update the user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password
        });

        if (updateError) {
            console.error('Error setting password:', updateError);
            return NextResponse.json(
                { error: 'Failed to set password: ' + updateError.message },
                { status: 500 }
            );
        }

        // Update the profile to mark that password has been set
        await supabaseAdmin
            .from('profiles')
            .update({ has_password: true })
            .eq('auth_user_id', userId);

        return NextResponse.json(
            { message: 'Password set successfully' },
            { status: 200 }
        );

    } catch (err) {
        console.error('Set password route error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
