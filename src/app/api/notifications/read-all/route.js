/**
 * API Route: Mark All Notifications as Read
 * POST /api/notifications/read-all
 * 
 * Marks all unread notifications as read for the authenticated user.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
    try {
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

        // Update all unread notifications for the user
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .select();

        if (error) {
            console.error('[API/notifications/read-all] Error updating:', error);
            return Response.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            updatedCount: data?.length || 0
        });

    } catch (err) {
        console.error('[API/notifications/read-all] Unexpected error:', err);
        return Response.json(
            { error: 'Internal server error', message: err.message },
            { status: 500 }
        );
    }
}
