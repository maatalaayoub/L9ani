/**
 * Face Recognition Helper
 * 
 * Shared helper functions for face recognition processing
 * Used by both missing reports and sighting reports APIs
 */

import { supabaseAdmin } from '@/lib/supabase';
import { notifyFaceMatch } from '@/lib/notifications';
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

        // Create notification for both parties
        await createMatchNotification(savedMatch, savedFace, matchedFace, reportType);

    } catch (err) {
        console.error('[Face Recognition Helper] Error processing match:', err);
    }
}

/**
 * Create a notification for a face match - notifies both parties
 */
async function createMatchNotification(match, sourceFace, matchedFace, reportType) {
    try {
        // Determine which report is missing and which is sighting
        const missingTable = 'reports';
        const sightingTable = 'sighting_reports';
        
        let missingReportId, sightingReportId;
        
        if (reportType === 'missing') {
            // Source is missing report, matched is sighting
            missingReportId = sourceFace.report_id;
            sightingReportId = matchedFace.report_id;
        } else {
            // Source is sighting, matched is missing
            sightingReportId = sourceFace.report_id;
            missingReportId = matchedFace.report_id;
        }

        // Get the user IDs for both reports
        const { data: missingReport } = await supabaseAdmin
            .from(missingTable)
            .select('user_id')
            .eq('id', missingReportId)
            .single();

        const { data: sightingReport } = await supabaseAdmin
            .from(sightingTable)
            .select('user_id')
            .eq('id', sightingReportId)
            .single();

        // Use the centralized notification function to notify both parties
        const result = await notifyFaceMatch({
            matchId: match.id,
            similarity: match.similarity_score,
            missingReportUserId: missingReport?.user_id,
            sightingReportUserId: sightingReport?.user_id,
            missingReportId,
            sightingReportId,
        });

        if (result.notifications?.length > 0) {
            console.log(`[Face Recognition Helper] Created ${result.notifications.length} notification(s) for match`);
        }
        if (result.errors?.length > 0) {
            console.error('[Face Recognition Helper] Notification errors:', result.errors);
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

/**
 * Clean up face data when a report is deleted
 * Deletes faces from AWS Rekognition and the database
 * 
 * @param {string} reportId - The report ID being deleted
 * @param {string} reportType - 'missing' or 'sighting'
 * @returns {Object} Results of cleanup { deletedFromAWS: number, deletedFromDB: number, errors: string[] }
 */
export async function cleanupFacesOnReportDelete(reportId, reportType) {
    const results = { deletedFromAWS: 0, deletedFromDB: 0, errors: [] };
    
    try {
        const facesTable = reportType === 'missing' ? 'missing_report_faces' : 'sighting_report_faces';
        const deleteFaceFromAWS = reportType === 'missing' ? deleteMissingPersonFace : deleteSightingFace;
        
        // Get all face records for this report
        const { data: faces, error: fetchError } = await supabaseAdmin
            .from(facesTable)
            .select('id, aws_face_id')
            .eq('report_id', reportId);
        
        if (fetchError) {
            console.error(`[Face Recognition Helper] Error fetching faces for cleanup:`, fetchError);
            results.errors.push(`Failed to fetch face records: ${fetchError.message}`);
            return results;
        }
        
        if (!faces || faces.length === 0) {
            console.log(`[Face Recognition Helper] No faces to clean up for ${reportType} report:`, reportId);
            return results;
        }
        
        console.log(`[Face Recognition Helper] Cleaning up ${faces.length} faces for ${reportType} report:`, reportId);
        
        // Delete each face from AWS Rekognition
        for (const face of faces) {
            if (face.aws_face_id) {
                try {
                    await deleteFaceFromAWS(face.aws_face_id);
                    results.deletedFromAWS++;
                    console.log(`[Face Recognition Helper] Deleted AWS face: ${face.aws_face_id}`);
                } catch (awsError) {
                    console.error(`[Face Recognition Helper] Error deleting AWS face ${face.aws_face_id}:`, awsError);
                    results.errors.push(`Failed to delete AWS face ${face.aws_face_id}: ${awsError.message}`);
                }
            }
        }
        
        // Delete face records from database
        // Note: This may already be handled by CASCADE on foreign key, but we do it explicitly just in case
        const { error: deleteError, count } = await supabaseAdmin
            .from(facesTable)
            .delete()
            .eq('report_id', reportId)
            .select();
        
        if (deleteError) {
            console.error(`[Face Recognition Helper] Error deleting face records:`, deleteError);
            results.errors.push(`Failed to delete face records: ${deleteError.message}`);
        } else {
            results.deletedFromDB = faces.length;
            console.log(`[Face Recognition Helper] Deleted ${results.deletedFromDB} face records from database`);
        }
        
        // Also delete any face matches associated with these faces
        if (reportType === 'missing') {
            const faceIds = faces.map(f => f.id);
            const { error: matchError } = await supabaseAdmin
                .from('face_matches')
                .delete()
                .in('missing_face_id', faceIds);
            
            if (matchError) {
                console.error(`[Face Recognition Helper] Error deleting face matches:`, matchError);
                results.errors.push(`Failed to delete face matches: ${matchError.message}`);
            } else {
                console.log(`[Face Recognition Helper] Deleted face matches for missing faces`);
            }
        } else {
            const faceIds = faces.map(f => f.id);
            const { error: matchError } = await supabaseAdmin
                .from('face_matches')
                .delete()
                .in('sighting_face_id', faceIds);
            
            if (matchError) {
                console.error(`[Face Recognition Helper] Error deleting face matches:`, matchError);
                results.errors.push(`Failed to delete face matches: ${matchError.message}`);
            } else {
                console.log(`[Face Recognition Helper] Deleted face matches for sighting faces`);
            }
        }
        
        console.log(`[Face Recognition Helper] Cleanup complete:`, results);
        return results;
        
    } catch (err) {
        console.error(`[Face Recognition Helper] Unexpected error during cleanup:`, err);
        results.errors.push(`Unexpected error: ${err.message}`);
        return results;
    }
}
