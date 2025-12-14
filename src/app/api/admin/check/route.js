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

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Check if user exists in admin_users table and is active
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, role, is_active, created_at')
            .eq('auth_user_id', userId)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[API Admin Check] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            isAdmin: !!data,
            role: data?.role || null,
            adminSince: data?.created_at || null
        });
    } catch (err) {
        console.error('[API Admin Check] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
