import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        console.log('[EMAIL-CHECK] API called');

        const body = await request.json();
        const { email } = body;

        console.log('[EMAIL-CHECK] Checking email:', email);

        if (!email) {
            console.log('[EMAIL-CHECK] No email provided');
            return NextResponse.json({ available: false, message: 'Email is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log('[EMAIL-CHECK] Service Role Key exists:', !!serviceRoleKey);
        console.log('[EMAIL-CHECK] Supabase URL exists:', !!supabaseUrl);

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('[EMAIL-CHECK] Server missing Supabase environment variables');
            return NextResponse.json(
                { available: false, message: 'Server Configuration Error' },
                { status: 500 }
            );
        }

        // Initialize Supabase with Service Role Key for admin privileges
        console.log('[EMAIL-CHECK] Creating Supabase admin client');
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        console.log('[EMAIL-CHECK] Querying profiles table for email:', email);

        // Check profiles table first (faster/safer than scanning auth users if sync is working)
        const { count, error } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id', { count: 'exact', head: true })
            .ilike('email', email); // Case insensitive check

        console.log('[EMAIL-CHECK] Query result - count:', count, 'error:', error);

        if (error) {
            console.error('[EMAIL-CHECK] Supabase Admin Email Check Error:', error);
            throw error;
        }

        if (count > 0) {
            console.log('[EMAIL-CHECK] Email is taken');
            return NextResponse.json({ available: false, message: 'Email is already in use' });
        }

        console.log('[EMAIL-CHECK] Email is available');
        return NextResponse.json({ available: true, message: 'Email is available' });

    } catch (error) {
        console.error('[EMAIL-CHECK] API Error:', error);
        return NextResponse.json(
            { available: false, message: 'Error checking email availability' },
            { status: 500 }
        );
    }
}
