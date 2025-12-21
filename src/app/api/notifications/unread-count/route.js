/**
 * API Route: Get Unread Notification Count
 * GET /api/notifications/unread-count
 * 
 * Returns the count of unread notifications for the authenticated user.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
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

        // Get unread count
        const { count, error } = await supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('[API/notifications/unread-count] Error fetching:', error);
            return Response.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            count: count || 0
        });

    } catch (err) {
        console.error('[API/notifications/unread-count] Unexpected error:', err);
        return Response.json(
            { error: 'Internal server error', message: err.message },
            { status: 500 }
        );
    }
}
