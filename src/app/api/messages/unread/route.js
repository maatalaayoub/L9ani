/**
 * API Route: Unread Messages Count
 * GET /api/messages/unread - Get total unread message count
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all conversation IDs where user is a participant
        const { data: conversations } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`);

        if (!conversations || conversations.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        const conversationIds = conversations.map(c => c.id);

        // Count unread messages not sent by user
        const { count, error } = await supabaseAdmin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .eq('is_read', false)
            .neq('sender_id', user.id);

        if (error) {
            console.error('[API/messages/unread] Error:', error);
            return NextResponse.json({ error: 'Failed to get unread count' }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: count || 0 });

    } catch (err) {
        console.error('[API/messages/unread] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
