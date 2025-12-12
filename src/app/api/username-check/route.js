import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, userId } = body;

        if (!username) {
            return NextResponse.json({ available: false, message: 'Username is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ available: false, message: 'Server configuration error' }, { status: 500 });
        }

        // Initialize Supabase with Service Role Key for admin privileges (Bypass RLS)
        // CRITICAL: This key stays on the server.
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Check if username exists for ANY OTHER user (Case Insensitive)
        const { count, error } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id', { count: 'exact', head: true })
            .ilike('username', username)
            .neq('auth_user_id', userId); // Exclude current user

        if (error) {
            console.error('Supabase Admin Error:', error);
            throw error;
        }

        if (count > 0) {
            return NextResponse.json({ available: false, message: 'Username is already taken' });
        } else {
            return NextResponse.json({ available: true, message: 'Username is available' });
        }

    } catch (error) {
        console.error('Username Check API Error:', error);
        return NextResponse.json(
            { available: false, message: 'Error checking availability' },
            { status: 500 }
        );
    }
}
