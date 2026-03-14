import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/user/public-profile?id=USER_ID
// Returns basic public profile info for a user
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, username, first_name, last_name, avatar_url, city, created_at')
            .eq('auth_user_id', userId)
            .single();

        if (error || !profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ profile: { id: profile.auth_user_id, username: profile.username, first_name: profile.first_name, last_name: profile.last_name, avatar_url: profile.avatar_url, city: profile.city, created_at: profile.created_at } });
    } catch (err) {
        console.error('[API/public-profile] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
