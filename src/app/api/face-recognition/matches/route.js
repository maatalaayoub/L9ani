/**
 * Face Recognition Matches API
 * 
 * Handles viewing and managing face match records
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/face-recognition/matches
 * 
 * Get all matches for the authenticated user's reports
 * Query params:
 *   - status: filter by match status (pending, confirmed, rejected)
 *   - reportId: filter by specific report
 *   - reportType: filter by missing or sighting
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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const reportId = searchParams.get('reportId');
        const reportType = searchParams.get('reportType');

        // Build query for matches related to user's reports
        let query = supabaseAdmin
            .from('face_matches_details')
            .select('*')
            .or(`missing_report_user_id.eq.${user.id},sighting_report_user_id.eq.${user.id}`);

        if (status) {
            query = query.eq('match_status', status);
        }

        if (reportId && reportType) {
            if (reportType === 'missing') {
                query = query.eq('missing_report_id', reportId);
            } else if (reportType === 'sighting') {
                query = query.eq('sighting_report_id', reportId);
            }
        }

        const { data: matches, error } = await query.order('match_found_at', { ascending: false });

        if (error) {
            console.error('[Face Matches API] Error fetching matches:', error);
            return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            matches,
            count: matches?.length || 0
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Matches API] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/face-recognition/matches
 * 
 * Update match status (confirm/reject)
 * 
 * Body: {
 *   matchId: string,
 *   status: 'confirmed' | 'rejected' | 'reviewing',
 *   notes: string (optional)
 * }
 */
export async function PATCH(request) {
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

        const body = await request.json();
        const { matchId, status, notes } = body;

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
        }

        if (!status || !['confirmed', 'rejected', 'reviewing', 'pending'].includes(status)) {
            return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
        }

        // Verify user owns one of the reports in this match
        const { data: match, error: fetchError } = await supabaseAdmin
            .from('face_matches_details')
            .select('*')
            .eq('match_id', matchId)
            .single();

        if (fetchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Check if user owns either report or is admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        const isOwner = match.missing_report_user_id === user.id || match.sighting_report_user_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Not authorized to update this match' }, { status: 403 });
        }

        // Update the match
        const updateData = {
            status,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
        };

        if (notes) {
            updateData.review_notes = notes;
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('face_matches')
            .update(updateData)
            .eq('id', matchId)
            .select()
            .single();

        if (updateError) {
            console.error('[Face Matches API] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
        }

        // If confirmed, update the sighting report to linked status
        if (status === 'confirmed') {
            // Update sighting report matched_report_id
            const { error: linkError } = await supabaseAdmin
                .from('sighting_reports')
                .update({ 
                    matched_report_id: match.missing_report_id,
                    status: 'matched'
                })
                .eq('id', match.sighting_report_id);

            if (linkError) {
                console.error('[Face Matches API] Error linking reports:', linkError);
            }

            // Optionally update missing report status
            const { error: missingUpdateError } = await supabaseAdmin
                .from('reports')
                .update({ status: 'found' })
                .eq('id', match.missing_report_id);

            if (missingUpdateError) {
                console.error('[Face Matches API] Error updating missing report:', missingUpdateError);
            }
        }

        return NextResponse.json({
            success: true,
            match: updated
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Matches API] PATCH Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
