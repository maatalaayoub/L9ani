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

        console.log('[EMAIL-CHECK] Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log('[EMAIL-CHECK] Service Role Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[EMAIL-CHECK] Server missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json(
                { available: false, message: 'Server Config Error: Missing SUPABASE_SERVICE_ROLE_KEY' },
                { status: 500 }
            );
        }

        // Initialize Supabase with Service Role Key for admin privileges
        console.log('[EMAIL-CHECK] Creating Supabase admin client');
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

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
