/**
 * API Route: Conversations
 * GET /api/messages - List user's conversations
 * POST /api/messages - Create a new conversation or send a message
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

// GET - List conversations for the authenticated user
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch conversations where user is a participant
        const { data: conversations, error } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('[API/messages] Error fetching conversations:', error);
            return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
        }

        // Get all unique participant IDs (the other person in each conversation)
        const otherUserIds = conversations.map(c =>
            c.participant_one === user.id ? c.participant_two : c.participant_one
        );

        // Fetch profiles for other participants
        let profilesMap = {};
        if (otherUserIds.length > 0) {
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, username, first_name, last_name, avatar_url')
                .in('id', otherUserIds);

            if (profiles) {
                profiles.forEach(p => { profilesMap[p.id] = p; });
            }
        }

        // For each conversation, get last message and unread count
        const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
            const otherId = conv.participant_one === user.id ? conv.participant_two : conv.participant_one;

            // Get last message
            const { data: lastMessages } = await supabaseAdmin
                .from('messages')
                .select('content, sender_id, created_at')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1);

            // Get unread count (messages sent by the other user that are unread)
            const { count: unreadCount } = await supabaseAdmin
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .eq('is_read', false)
                .neq('sender_id', user.id);

            return {
                id: conv.id,
                other_user: profilesMap[otherId] || { id: otherId },
                last_message: lastMessages?.[0] || null,
                unread_count: unreadCount || 0,
                created_at: conv.created_at,
                last_message_at: conv.last_message_at
            };
        }));

        return NextResponse.json({ success: true, conversations: enrichedConversations });

    } catch (err) {
        console.error('[API/messages] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Start a new conversation or send a message to an existing one
export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { recipient_id, content } = body;

        if (!recipient_id || !content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'recipient_id and content are required' }, { status: 400 });
        }

        if (content.length > 2000) {
            return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 });
        }

        if (recipient_id === user.id) {
            return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
        }

        // Check if recipient exists
        const { data: recipientProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', recipient_id)
            .single();

        if (!recipientProfile) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
        }

        // Check if recipient allows messages
        const { data: recipientSettings } = await supabaseAdmin
            .from('user_settings')
            .select('allow_messages')
            .eq('user_id', recipient_id)
            .single();

        const messageSetting = recipientSettings?.allow_messages || 'everyone';

        if (messageSetting === 'nobody') {
            return NextResponse.json({ error: 'This user has disabled messages' }, { status: 403 });
        }

        if (messageSetting === 'reports_only') {
            // Check if sender has any report (lost or found) OR recipient has any report
            // that connects these two users through the reporting system
            const [{ count: senderReports }, { count: recipientReports }, { count: senderSightings }, { count: recipientSightings }] = await Promise.all([
                supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', recipient_id),
                supabaseAdmin.from('sighting_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabaseAdmin.from('sighting_reports').select('id', { count: 'exact', head: true }).eq('user_id', recipient_id),
            ]);

            const hasConnection = (senderReports > 0 || senderSightings > 0) && (recipientReports > 0 || recipientSightings > 0);
            if (!hasConnection) {
                return NextResponse.json({ error: 'This user only accepts messages from users with reports' }, { status: 403 });
            }
        }

        // Find or create conversation (order participants consistently)
        const [p1, p2] = [user.id, recipient_id].sort();

        let { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('participant_one', p1)
            .eq('participant_two', p2)
            .single();

        if (!conversation) {
            const { data: newConv, error: convError } = await supabaseAdmin
                .from('conversations')
                .insert({
                    participant_one: p1,
                    participant_two: p2,
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single();

            if (convError) {
                console.error('[API/messages] Error creating conversation:', convError);
                return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
            }
            conversation = newConv;
        }

        // Insert the message
        const { data: message, error: msgError } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversation.id,
                sender_id: user.id,
                content: content.trim()
            })
            .select()
            .single();

        if (msgError) {
            console.error('[API/messages] Error sending message:', msgError);
            return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
        }

        // Update conversation last_message_at
        await supabaseAdmin
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation.id);

        return NextResponse.json({
            success: true,
            message,
            conversation_id: conversation.id
        });

    } catch (err) {
        console.error('[API/messages] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
