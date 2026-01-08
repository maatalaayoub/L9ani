/**
 * Face Recognition Match Details API
 * 
 * Get detailed information about a specific face match,
 * including the original images where the faces were detected
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/face-recognition/matches/[matchId]
 * 
 * Get detailed information about a specific face match
 */
export async function GET(request, { params }) {
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

        const { matchId } = await params;

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
        }

        // Get the match details with all related information
        const { data: match, error: matchError } = await supabaseAdmin
            .from('face_matches_details')
            .select('*')
            .eq('match_id', matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Check authorization - user must own one of the reports or be admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        const isOwner = match.missing_report_user_id === user.id || match.sighting_report_user_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Not authorized to view this match' }, { status: 403 });
        }

        // Get additional face details
        const { data: missingFace } = await supabaseAdmin
            .from('missing_report_faces')
            .select('*')
            .eq('report_id', match.missing_report_id)
            .eq('photo_url', match.missing_matched_photo)
            .single();

        const { data: sightingFace } = await supabaseAdmin
            .from('sighting_report_faces')
            .select('*')
            .eq('report_id', match.sighting_report_id)
            .eq('photo_url', match.sighting_matched_photo)
            .single();

        // Get reporter info for the sighting
        const { data: sightingReport } = await supabaseAdmin
            .from('sighting_reports')
            .select('reporter_first_name, reporter_last_name, reporter_phone, reporter_email, created_at')
            .eq('id', match.sighting_report_id)
            .single();

        // Get missing report details
        const { data: missingReport } = await supabaseAdmin
            .from('reports')
            .select('created_at, last_known_location, additional_info')
            .eq('id', match.missing_report_id)
            .single();

        return NextResponse.json({
            success: true,
            match: {
                id: match.match_id,
                similarityScore: match.similarity_score,
                status: match.match_status,
                foundAt: match.match_found_at,
                reviewedAt: match.reviewed_at,
                reviewNotes: match.review_notes,
                
                // Missing person report info with original image
                missingReport: {
                    id: match.missing_report_id,
                    userId: match.missing_report_user_id,
                    firstName: match.missing_first_name,
                    lastName: match.missing_last_name,
                    city: match.missing_city,
                    location: missingReport?.last_known_location,
                    status: match.missing_report_status,
                    createdAt: missingReport?.created_at,
                    additionalInfo: missingReport?.additional_info,
                    // All photos from the report
                    allPhotos: match.missing_photos,
                    // The specific photo where the face was matched
                    matchedPhoto: match.missing_matched_photo,
                    // Face bounding box in the matched photo
                    faceBoundingBox: missingFace?.bounding_box,
                    faceConfidence: missingFace?.confidence
                },
                
                // Sighting report info with original image
                sightingReport: {
                    id: match.sighting_report_id,
                    userId: match.sighting_report_user_id,
                    city: match.sighting_city,
                    location: match.sighting_location,
                    status: match.sighting_report_status,
                    createdAt: sightingReport?.created_at,
                    reporterFirstName: sightingReport?.reporter_first_name,
                    reporterLastName: sightingReport?.reporter_last_name,
                    reporterPhone: sightingReport?.reporter_phone,
                    reporterEmail: sightingReport?.reporter_email,
                    // All photos from the sighting
                    allPhotos: match.sighting_photos,
                    // The specific photo where the face was matched
                    matchedPhoto: match.sighting_matched_photo,
                    // Face bounding box in the matched photo
                    faceBoundingBox: sightingFace?.bounding_box,
                    faceConfidence: sightingFace?.confidence
                }
            }
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Match Details API] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/face-recognition/matches/[matchId]
 * 
 * Update a specific match status
 */
export async function PATCH(request, { params }) {
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

        const { matchId } = await params;
        const body = await request.json();
        const { status, notes } = body;

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
        }

        if (!status || !['confirmed', 'rejected', 'reviewing', 'pending'].includes(status)) {
            return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
        }

        // Get the match to verify authorization
        const { data: match, error: fetchError } = await supabaseAdmin
            .from('face_matches_details')
            .select('*')
            .eq('match_id', matchId)
            .single();

        if (fetchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Check authorization
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

        if (notes !== undefined) {
            updateData.review_notes = notes;
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('face_matches')
            .update(updateData)
            .eq('id', matchId)
            .select()
            .single();

        if (updateError) {
            console.error('[Face Match Details API] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
        }

        // If confirmed, link the reports
        if (status === 'confirmed') {
            // Update sighting report to link to missing report
            await supabaseAdmin
                .from('sighting_reports')
                .update({ 
                    matched_report_id: match.missing_report_id,
                    status: 'matched'
                })
                .eq('id', match.sighting_report_id);

            // Update missing report status to found
            await supabaseAdmin
                .from('reports')
                .update({ status: 'found' })
                .eq('id', match.missing_report_id);

            // Send notification to both users
            const notifications = [];
            
            // Notify missing report owner
            notifications.push({
                user_id: match.missing_report_user_id,
                type: 'match_confirmed',
                title: 'Match Confirmed!',
                message: `A sighting of ${match.missing_first_name} ${match.missing_last_name} has been confirmed in ${match.sighting_city}.`,
                data: {
                    match_id: matchId,
                    sighting_report_id: match.sighting_report_id,
                    matched_photo: match.sighting_matched_photo
                },
                is_read: false
            });

            // Notify sighting report owner (if different user)
            if (match.sighting_report_user_id !== match.missing_report_user_id) {
                notifications.push({
                    user_id: match.sighting_report_user_id,
                    type: 'match_confirmed',
                    title: 'Your Sighting Matched!',
                    message: `Your sighting report has been confirmed as a match for a missing person.`,
                    data: {
                        match_id: matchId,
                        missing_report_id: match.missing_report_id,
                        matched_photo: match.missing_matched_photo
                    },
                    is_read: false
                });
            }

            if (notifications.length > 0) {
                await supabaseAdmin.from('notifications').insert(notifications);
            }
        }

        return NextResponse.json({
            success: true,
            match: updated
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Match Details API] PATCH Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
