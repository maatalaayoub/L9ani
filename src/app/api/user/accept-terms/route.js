import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Update the profile to mark terms as accepted
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                terms_accepted: true,
                terms_accepted_at: new Date().toISOString()
            })
            .eq('auth_user_id', userId)
            .select()
            .single();

        if (error) {
            console.error('[Accept Terms] Error updating profile:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            profile: data 
        });
    } catch (err) {
        console.error('[Accept Terms] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
