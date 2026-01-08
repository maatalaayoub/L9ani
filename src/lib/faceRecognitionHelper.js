/**
 * Face Recognition Helper
 * 
 * Shared helper functions for face recognition processing
 * Used by both missing reports and sighting reports APIs
 */

import { supabaseAdmin } from '@/lib/supabase';
import {
    indexMissingPersonFace,
    indexSightingFace,
    searchMissingPersonsForMatch,
    searchSightingsForMatch,
    fetchImageAsBuffer,
    initializeCollections,
    THRESHOLDS
} from '@/lib/rekognition';

/**
 * Process face recognition for a report
 * 
 * @param {string} reportId - The report ID
 * @param {string} reportType - 'missing' or 'sighting'
 * @param {string[]} photoUrls - Array of photo URLs to process
 * @returns {Object} Results of face processing
 */
export async function processFaceRecognition(reportId, reportType, photoUrls) {
    if (!photoUrls || photoUrls.length === 0) {
        return { indexed: [], failed: [], matches: [] };
    }

    console.log(`[Face Recognition Helper] Processing ${photoUrls.length} photos for ${reportType} report:`, reportId);

    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('[Face Recognition Helper] AWS credentials not configured');
        throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    }

    // Initialize Rekognition collections if needed
    try {
        console.log('[Face Recognition Helper] Initializing collections...');
        await initializeCollections();
        console.log('[Face Recognition Helper] Collections initialized successfully');
    } catch (initError) {
        console.error('[Face Recognition Helper] Failed to initialize collections:', initError);
        console.error('[Face Recognition Helper] Error name:', initError.name);
        console.error('[Face Recognition Helper] Error message:', initError.message);
        if (initError.$metadata) {
            console.error('[Face Recognition Helper] AWS Error metadata:', JSON.stringify(initError.$metadata));
        }
        throw new Error(`Failed to initialize AWS Rekognition collections: ${initError.message}`);
    }

    const results = {
        indexed: [],
        failed: [],
        matches: []
    };

    // Process each photo
    for (const photoUrl of photoUrls) {
        try {
            console.log(`[Face Recognition Helper] Processing photo: ${photoUrl}`);
            
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
                console.error('[Face Recognition Helper] Error saving face record:', saveError);
                results.failed.push({
                    photoUrl,
                    reason: 'Failed to save face record: ' + saveError.message
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
            console.log(`[Face Recognition Helper] Searching for matches...`);
            const matches = await searchFunction(imageBuffer, THRESHOLDS.MIN_SIMILARITY_THRESHOLD);

            if (matches && matches.length > 0) {
                for (const match of matches) {
                    await processMatch(
                        savedFace,
                        match,
                        reportType,
                        results
                    );
                }
            }

        } catch (photoError) {
            console.error('[Face Recognition Helper] Error processing photo:', photoError);
            results.failed.push({
                photoUrl,
                reason: photoError.message || 'Processing error'
            });
        }
    }

    console.log(`[Face Recognition Helper] Completed. Indexed: ${results.indexed.length}, Failed: ${results.failed.length}, Matches: ${results.matches.length}`);

    return results;
}

/**
 * Process a single face match
 */
async function processMatch(savedFace, match, reportType, results) {
    try {
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
            console.log('[Face Recognition Helper] Could not find matched face in database');
            return;
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
            console.log('[Face Recognition Helper] Match already exists, skipping');
            return;
        }

        const { data: savedMatch, error: saveMatchError } = await supabaseAdmin
            .from('face_matches')
            .insert(matchRecord)
            .select()
            .single();

        if (saveMatchError) {
            console.error('[Face Recognition Helper] Error saving match:', saveMatchError);
            return;
        }

        results.matches.push({
            matchId: savedMatch.id,
            similarity: match.Similarity,
            matchedReportId: matchedFace.report_id,
            matchedPhotoUrl: matchedFace.photo_url
        });

        console.log(`[Face Recognition Helper] Found match with ${match.Similarity}% similarity`);

        // Create notification for the match
        await createMatchNotification(savedMatch, matchedFace, reportType);

    } catch (err) {
        console.error('[Face Recognition Helper] Error processing match:', err);
    }
}

/**
 * Create a notification for a face match
 */
async function createMatchNotification(match, matchedFace, reportType) {
    try {
        // Get the report owner based on report type
        const reportTable = reportType === 'missing' ? 'reports' : 'sighting_reports';
        const oppositeTable = reportType === 'missing' ? 'sighting_reports' : 'reports';

        // Get both reports
        const { data: ownReport } = await supabaseAdmin
            .from(reportTable)
            .select('user_id')
            .eq('id', matchedFace.report_id)
            .single();

        const oppositeReportId = reportType === 'missing' 
            ? matchedFace.report_id 
            : matchedFace.report_id;

        if (ownReport?.user_id) {
            // Create notification
            const { error: notifError } = await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: ownReport.user_id,
                    type: 'face_match',
                    title: 'Potential Face Match Found',
                    message: `A potential match (${match.similarity_score.toFixed(1)}% similarity) has been found for your ${reportType === 'missing' ? 'missing person' : 'sighting'} report.`,
                    data: {
                        match_id: match.id,
                        similarity: match.similarity_score,
                        report_type: reportType
                    },
                    read: false
                });

            if (notifError) {
                console.error('[Face Recognition Helper] Error creating notification:', notifError);
            } else {
                console.log('[Face Recognition Helper] Notification created for user:', ownReport.user_id);
            }
        }
    } catch (err) {
        console.error('[Face Recognition Helper] Error creating match notification:', err);
    }
}

/**
 * Re-process face recognition for an existing report
 * Useful for reprocessing after photo updates
 */
export async function reprocessFaceRecognition(reportId, reportType) {
    // Get the report with photos
    const tableName = reportType === 'missing' ? 'reports' : 'sighting_reports';
    
    const { data: report, error } = await supabaseAdmin
        .from(tableName)
        .select('photos')
        .eq('id', reportId)
        .single();

    if (error || !report?.photos) {
        throw new Error('Report not found or has no photos');
    }

    // Delete existing face records (AWS faces will be deleted via API)
    const facesTable = reportType === 'missing' ? 'missing_report_faces' : 'sighting_report_faces';
    await supabaseAdmin
        .from(facesTable)
        .delete()
        .eq('report_id', reportId);

    // Process faces again
    return await processFaceRecognition(reportId, reportType, report.photos);
}
