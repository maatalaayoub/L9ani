import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Check] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        console.log('[API Admin Check] Checking admin status for userId:', userId);

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Check if user exists in admin_users table and is active
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, role, is_active, created_at, auth_user_id')
            .eq('auth_user_id', userId)
            .eq('is_active', true)
            .maybeSingle();  // Use maybeSingle to avoid errors when no row found

        console.log('[API Admin Check] Query result:', { data, error: error?.message });

        if (error) {
            console.error('[API Admin Check] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const result = { 
            isAdmin: !!data,
            role: data?.role || null,
            adminSince: data?.created_at || null
        };
        
        console.log('[API Admin Check] Returning:', result);

        return NextResponse.json(result);
    } catch (err) {
        console.error('[API Admin Check] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
