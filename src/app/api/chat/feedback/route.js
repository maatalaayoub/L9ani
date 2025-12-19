import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/chat/feedback
 * Submit feedback for a chat message
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { messageId, sessionId, feedbackType, feedbackText } = body;
        
        if (!messageId || !sessionId || !feedbackType) {
            return NextResponse.json(
                { error: 'Missing required fields: messageId, sessionId, feedbackType' },
                { status: 400 }
            );
        }
        
        if (!['helpful', 'not_helpful', 'report'].includes(feedbackType)) {
            return NextResponse.json(
                { error: 'Invalid feedback type. Must be: helpful, not_helpful, or report' },
                { status: 400 }
            );
        }
        
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }
        
        // Insert feedback
        const { error } = await supabaseAdmin
            .from('chat_feedback')
            .insert({
                message_id: messageId,
                session_id: sessionId,
                feedback_type: feedbackType,
                feedback_text: feedbackText || null
            });
        
        if (error) {
            console.error('[Chat Feedback] Error:', error);
            return NextResponse.json(
                { error: 'Failed to save feedback' },
                { status: 500 }
            );
        }
        
        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully'
        });
        
    } catch (error) {
        console.error('[Chat Feedback] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
