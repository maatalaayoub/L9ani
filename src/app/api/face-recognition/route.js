/**
 * Face Recognition API Routes
 * 
 * Handles face fingerprint extraction, storage, and comparison
 * for missing person reports and sightings.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
    indexMissingPersonFace,
    indexSightingFace,
    searchMissingPersonsForMatch,
    searchSightingsForMatch,
    fetchImageAsBuffer,
    initializeCollections,
    deleteMissingPersonFace,
    deleteSightingFace,
    THRESHOLDS
} from '@/lib/rekognition';

/**
 * POST /api/face-recognition
 * 
 * Process and index faces from report photos
 * 
 * Body: {
 *   reportId: string,
 *   reportType: 'missing' | 'sighting',
 *   photoUrls: string[]
 * }
 */
export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[Face Recognition API] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[Face Recognition API] No authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            console.error('[Face Recognition API] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { reportId, reportType, photoUrls } = body;

        // Validate input
        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }
        
        if (!reportType || !['missing', 'sighting'].includes(reportType)) {
            return NextResponse.json({ error: 'Valid report type (missing/sighting) is required' }, { status: 400 });
        }

        if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
            return NextResponse.json({ error: 'At least one photo URL is required' }, { status: 400 });
        }

        console.log(`[Face Recognition API] Processing ${photoUrls.length} photos for ${reportType} report:`, reportId);

        // Initialize Rekognition collections if needed
        await initializeCollections();

        const results = {
            indexed: [],
            failed: [],
            matches: []
        };

        // Process each photo
        for (const photoUrl of photoUrls) {
            try {
                console.log(`[Face Recognition API] Processing photo: ${photoUrl}`);
                
                // Fetch the image
                const imageBuffer = await fetchImageAsBuffer(photoUrl);
                
                let faceResult;
                let tableName;
                let searchFunction;

                if (reportType === 'missing') {
                    // Index in missing persons collection
                    faceResult = await indexMissingPersonFace(imageBuffer, reportId, photoUrl);
                    tableName = 'missing_report_faces';
                    
                    // Search for matches in sightings
                    searchFunction = searchSightingsForMatch;
                } else {
                    // Index in sightings collection
                    faceResult = await indexSightingFace(imageBuffer, reportId, photoUrl);
                    tableName = 'sighting_report_faces';
                    
                    // Search for matches in missing persons
                    searchFunction = searchMissingPersonsForMatch;
                }

                if (!faceResult) {
                    results.failed.push({
                        photoUrl,
                        reason: 'No face detected in image'
                    });
                    continue;
                }

                // Store face fingerprint in database
                const faceRecord = {
                    report_id: reportId,
                    photo_url: photoUrl,
                    aws_face_id: faceResult.faceId,
                    external_image_id: faceResult.externalImageId,
                    bounding_box: faceResult.boundingBox,
                    confidence: faceResult.confidence,
                    face_details: faceResult.faceDetails
                };

                const { data: savedFace, error: saveError } = await supabaseAdmin
                    .from(tableName)
                    .insert(faceRecord)
                    .select()
                    .single();

                if (saveError) {
                    console.error('[Face Recognition API] Error saving face record:', saveError);
                    results.failed.push({
                        photoUrl,
                        reason: 'Failed to save face record'
                    });
                    continue;
                }

                results.indexed.push({
                    photoUrl,
                    faceId: savedFace.id,
                    awsFaceId: faceResult.faceId,
                    confidence: faceResult.confidence
                });

                // Search for potential matches
                console.log(`[Face Recognition API] Searching for matches...`);
                const matches = await searchFunction(imageBuffer, THRESHOLDS.MIN_SIMILARITY_THRESHOLD);

                if (matches && matches.length > 0) {
                    for (const match of matches) {
                        // Get the face record from the opposite table
                        const oppositeTable = reportType === 'missing' 
                            ? 'sighting_report_faces' 
                            : 'missing_report_faces';

                        const { data: matchedFace, error: matchError } = await supabaseAdmin
                            .from(oppositeTable)
                            .select('*')
                            .eq('aws_face_id', match.Face.FaceId)
                            .single();

                        if (matchError || !matchedFace) {
                            console.log('[Face Recognition API] Could not find matched face in database');
                            continue;
                        }

                        // Create a match record
                        const matchRecord = reportType === 'missing' 
                            ? {
                                missing_face_id: savedFace.id,
                                sighting_face_id: matchedFace.id,
                                similarity_score: match.Similarity,
                                status: 'pending'
                            }
                            : {
                                missing_face_id: matchedFace.id,
                                sighting_face_id: savedFace.id,
                                similarity_score: match.Similarity,
                                status: 'pending'
                            };

                        // Check if match already exists
                        const { data: existingMatch } = await supabaseAdmin
                            .from('face_matches')
                            .select('id')
                            .eq('missing_face_id', matchRecord.missing_face_id)
                            .eq('sighting_face_id', matchRecord.sighting_face_id)
                            .single();

                        if (existingMatch) {
                            console.log('[Face Recognition API] Match already exists, skipping');
                            continue;
                        }

                        const { data: savedMatch, error: saveMatchError } = await supabaseAdmin
                            .from('face_matches')
                            .insert(matchRecord)
                            .select()
                            .single();

                        if (saveMatchError) {
                            console.error('[Face Recognition API] Error saving match:', saveMatchError);
                            continue;
                        }

                        results.matches.push({
                            matchId: savedMatch.id,
                            similarity: match.Similarity,
                            matchedReportId: matchedFace.report_id,
                            matchedPhotoUrl: matchedFace.photo_url
                        });

                        console.log(`[Face Recognition API] Found match with ${match.Similarity}% similarity`);

                        // TODO: Send notification about potential match
                    }
                }

            } catch (photoError) {
                console.error('[Face Recognition API] Error processing photo:', photoError);
                results.failed.push({
                    photoUrl,
                    reason: photoError.message || 'Processing error'
                });
            }
        }

        console.log(`[Face Recognition API] Completed. Indexed: ${results.indexed.length}, Failed: ${results.failed.length}, Matches: ${results.matches.length}`);

        return NextResponse.json({
            success: true,
            reportId,
            reportType,
            results
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Recognition API] Exception:', err);
        return NextResponse.json({ 
            error: 'Internal Server Error',
            details: err.message 
        }, { status: 500 });
    }
}

/**
 * GET /api/face-recognition?reportId=xxx&reportType=missing|sighting
 * 
 * Get face records and matches for a report
 */
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('reportId');
        const reportType = searchParams.get('reportType');

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        if (!reportType || !['missing', 'sighting'].includes(reportType)) {
            return NextResponse.json({ error: 'Valid report type is required' }, { status: 400 });
        }

        const facesTable = reportType === 'missing' ? 'missing_report_faces' : 'sighting_report_faces';

        // Get face records for the report
        const { data: faces, error: facesError } = await supabaseAdmin
            .from(facesTable)
            .select('*')
            .eq('report_id', reportId);

        if (facesError) {
            return NextResponse.json({ error: 'Failed to fetch face records' }, { status: 500 });
        }

        // Get matches for each face
        const faceIds = faces.map(f => f.id);
        let matches = [];

        if (faceIds.length > 0) {
            const matchColumn = reportType === 'missing' ? 'missing_face_id' : 'sighting_face_id';
            
            const { data: matchData, error: matchError } = await supabaseAdmin
                .from('face_matches_details')
                .select('*')
                .in(matchColumn, faceIds);

            if (!matchError && matchData) {
                matches = matchData;
            }
        }

        return NextResponse.json({
            success: true,
            reportId,
            reportType,
            faces,
            matches
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Recognition API] GET Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/face-recognition
 * 
 * Delete face records when a report is deleted
 * 
 * Body: {
 *   reportId: string,
 *   reportType: 'missing' | 'sighting'
 * }
 */
export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token
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
        const { reportId, reportType } = body;

        if (!reportId || !reportType) {
            return NextResponse.json({ error: 'Report ID and type are required' }, { status: 400 });
        }

        const facesTable = reportType === 'missing' ? 'missing_report_faces' : 'sighting_report_faces';
        const deleteFunction = reportType === 'missing' ? deleteMissingPersonFace : deleteSightingFace;

        // Get face records to delete from Rekognition
        const { data: faces, error: fetchError } = await supabaseAdmin
            .from(facesTable)
            .select('aws_face_id')
            .eq('report_id', reportId);

        if (fetchError) {
            return NextResponse.json({ error: 'Failed to fetch face records' }, { status: 500 });
        }

        // Delete from Rekognition
        for (const face of faces || []) {
            try {
                await deleteFunction(face.aws_face_id);
            } catch (err) {
                console.error(`[Face Recognition API] Error deleting face from Rekognition:`, err);
            }
        }

        // Database records will be deleted automatically via CASCADE

        return NextResponse.json({
            success: true,
            deleted: faces?.length || 0
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Recognition API] DELETE Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
