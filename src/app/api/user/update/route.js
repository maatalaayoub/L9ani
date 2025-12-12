import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function PUT(request) {
    try {
        // Check if supabase clients are initialized
        if (!supabase || !supabaseAdmin) {
            console.error('Supabase clients not initialized');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const body = await request.json();
        const { firstName, lastName, phoneNumber } = body;

        // Update user metadata using admin client to ensure permissions
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                user_metadata: {
                    firstName,
                    lastName,
                    phoneNumber
                }
            }
        );

        if (error) {
            console.error('Update user error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Profile updated successfully', user: data.user }, { status: 200 });

    } catch (err) {
        console.error('Profile update error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
