/**
 * API Route: Conversation Messages
 * GET /api/messages/[id] - Get messages for a conversation
 * PATCH /api/messages/[id] - Mark messages as read in a conversation
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function getAuthUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

// GET - Get messages for a specific conversation
export async function GET(request, { params }) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: conversationId } = await params;

        // Verify user is participant of this conversation
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
            .single();

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Get other participant's profile
        const otherId = conversation.participant_one === user.id
            ? conversation.participant_two
            : conversation.participant_one;

        const { data: otherProfile } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, username, first_name, last_name, avatar_url')
            .eq('auth_user_id', otherId)
            .single();

        // Parse pagination
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // Fetch messages
        const { data: messages, error, count } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[API/messages/id] Error fetching messages:', error);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            messages,
            other_user: otherProfile ? { id: otherProfile.auth_user_id, username: otherProfile.username, first_name: otherProfile.first_name, last_name: otherProfile.last_name, avatar_url: otherProfile.avatar_url } : { id: otherId },
            conversation,
            pagination: { limit, offset, total: count, hasMore: offset + messages.length < count }
        });

    } catch (err) {
        console.error('[API/messages/id] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Mark all messages in conversation as read
export async function PATCH(request, { params }) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: conversationId } = await params;

        // Verify user is participant
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
            .single();

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Mark messages as read (only messages NOT sent by current user)
        const { error } = await supabaseAdmin
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .eq('is_read', false)
            .neq('sender_id', user.id);

        if (error) {
            console.error('[API/messages/id] Error marking as read:', error);
            return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[API/messages/id] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
