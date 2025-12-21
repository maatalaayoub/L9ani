/**
 * API Route: Mark Notification as Read
 * PATCH /api/notifications/[id]
 * 
 * Marks a specific notification as read for the authenticated user.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function PATCH(request, { params }) {
    try {
        const { id: notificationId } = await params;

        if (!notificationId) {
            return Response.json(
                { error: 'Bad request', message: 'Notification ID is required' },
                { status: 400 }
            );
        }

        // Get authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.json(
                { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');

        // Create admin client to verify user
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        });

        // Verify the user's token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized', message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Update notification (only if it belongs to the user)
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return Response.json(
                    { error: 'Not found', message: 'Notification not found or access denied' },
                    { status: 404 }
                );
            }
            console.error('[API/notifications/[id]] Error updating:', error);
            return Response.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            notification: data
        });

    } catch (err) {
        console.error('[API/notifications/[id]] Unexpected error:', err);
        return Response.json(
            { error: 'Internal server error', message: err.message },
            { status: 500 }
        );
    }
}

/**
 * API Route: Delete Notification
 * DELETE /api/notifications/[id]
 * 
 * Deletes a specific notification for the authenticated user.
 */
export async function DELETE(request, { params }) {
    try {
        const { id: notificationId } = await params;

        if (!notificationId) {
            return Response.json(
                { error: 'Bad request', message: 'Notification ID is required' },
                { status: 400 }
            );
        }

        // Get authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.json(
                { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');

        // Create admin client to verify user
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        });

        // Verify the user's token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized', message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Delete notification (only if it belongs to the user)
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return Response.json(
                    { error: 'Not found', message: 'Notification not found or access denied' },
                    { status: 404 }
                );
            }
            console.error('[API/notifications/[id]] Error deleting:', error);
            return Response.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (err) {
        console.error('[API/notifications/[id]] DELETE Unexpected error:', err);
        return Response.json(
            { error: 'Internal server error', message: err.message },
            { status: 500 }
        );
    }
}
