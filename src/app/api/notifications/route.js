/**
 * API Route: Get Notifications
 * GET /api/notifications
 * 
 * Fetches notifications for the authenticated user.
 * 
 * Query Parameters:
 * - limit: Maximum notifications to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - unreadOnly: If "true", only return unread notifications
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

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        // Fetch notifications
        let query = supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            console.error('[API/notifications] Error fetching:', error);
            return Response.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            notifications,
            count,
            pagination: {
                limit,
                offset,
                hasMore: offset + notifications.length < count
            }
        });

    } catch (err) {
        console.error('[API/notifications] Unexpected error:', err);
        return Response.json(
            { error: 'Internal server error', message: err.message },
            { status: 500 }
        );
    }
}
