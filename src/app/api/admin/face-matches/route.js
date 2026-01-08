/**
 * Admin Face Matches API
 * 
 * Admin-only endpoints for viewing and managing all face matches
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Check if user is admin
 */
async function isUserAdmin(userId) {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    return profile?.role === 'admin' || profile?.role === 'super_admin';
}

/**
 * GET /api/admin/face-matches
 * 
 * Get all face matches (admin only)
 * Query params:
 *   - status: filter by match status
 *   - minSimilarity: minimum similarity score
 *   - page: page number
 *   - limit: items per page
 */
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin role
        if (!await isUserAdmin(user.id)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Build query
        let query = supabaseAdmin
            .from('face_matches_details')
            .select('*', { count: 'exact' });

        if (status) {
            query = query.eq('match_status', status);
        }

        if (minSimilarity > 0) {
            query = query.gte('similarity_score', minSimilarity);
        }

        query = query
            .order('match_found_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: matches, count, error } = await query;

        if (error) {
            console.error('[Admin Face Matches] Error fetching matches:', error);
            return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            matches,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        }, { status: 200 });

    } catch (err) {
        console.error('[Admin Face Matches] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET /api/admin/face-matches/stats
 * 
 * Get face match statistics
 */
export async function getMatchStats() {
    const { data: stats, error } = await supabaseAdmin
        .from('face_matches')
        .select('status', { count: 'exact' });

    // This is a simplified stats query - in production you'd want more sophisticated aggregation
    const { count: totalMatches } = await supabaseAdmin
        .from('face_matches')
        .select('*', { count: 'exact', head: true });

    const { count: pendingMatches } = await supabaseAdmin
        .from('face_matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    const { count: confirmedMatches } = await supabaseAdmin
        .from('face_matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

    const { count: rejectedMatches } = await supabaseAdmin
        .from('face_matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

    return {
        total: totalMatches || 0,
        pending: pendingMatches || 0,
        confirmed: confirmedMatches || 0,
        rejected: rejectedMatches || 0
    };
}
