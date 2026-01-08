import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { clearAllCollections, listFacesInCollection, COLLECTIONS } from '@/lib/rekognition';

/**
 * POST /api/admin/face-recognition/clear
 * 
 * Clears all faces from AWS Rekognition collections and syncs with database.
 * This is useful when the AWS collections get out of sync with the database.
 * 
 * Admin only endpoint.
 */
export async function POST(request) {
    try {
        // Get auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Verify user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: adminRole, error: roleError } = await supabaseAdmin
            .from('admin_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (roleError || !adminRole || !['admin', 'super_admin'].includes(adminRole.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log('[Admin Face Recognition] Clearing collections, requested by:', user.id);

        // Clear AWS Rekognition collections
        const awsResult = await clearAllCollections();
        console.log('[Admin Face Recognition] AWS collections cleared:', awsResult);

        // Also clear database tables to ensure sync
        const { error: missingFacesError } = await supabaseAdmin
            .from('missing_report_faces')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        const { error: sightingFacesError } = await supabaseAdmin
            .from('sighting_report_faces')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        const { error: matchesError } = await supabaseAdmin
            .from('face_matches')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (missingFacesError || sightingFacesError || matchesError) {
            console.error('[Admin Face Recognition] Database cleanup errors:', {
                missingFacesError,
                sightingFacesError,
                matchesError
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Face recognition data cleared successfully',
            awsDeleted: awsResult,
            databaseCleared: {
                missingFaces: !missingFacesError,
                sightingFaces: !sightingFacesError,
                matches: !matchesError,
            }
        });

    } catch (error) {
        console.error('[Admin Face Recognition] Error:', error);
        return NextResponse.json({ 
            error: 'Failed to clear face recognition data',
            details: error.message 
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/face-recognition/clear
 * 
 * Gets the current status of face recognition collections.
 */
export async function GET(request) {
    try {
        // Get auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Verify user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: adminRole, error: roleError } = await supabaseAdmin
            .from('admin_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (roleError || !adminRole || !['admin', 'super_admin'].includes(adminRole.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get AWS collection counts
        const missingFaces = await listFacesInCollection(COLLECTIONS.MISSING_PERSONS);
        const sightingFaces = await listFacesInCollection(COLLECTIONS.SIGHTINGS);

        // Get database counts
        const { count: dbMissingCount } = await supabaseAdmin
            .from('missing_report_faces')
            .select('*', { count: 'exact', head: true });

        const { count: dbSightingCount } = await supabaseAdmin
            .from('sighting_report_faces')
            .select('*', { count: 'exact', head: true });

        const { count: matchesCount } = await supabaseAdmin
            .from('face_matches')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            aws: {
                missingPersons: missingFaces.length,
                sightings: sightingFaces.length,
            },
            database: {
                missingFaces: dbMissingCount || 0,
                sightingFaces: dbSightingCount || 0,
                matches: matchesCount || 0,
            },
            inSync: missingFaces.length === (dbMissingCount || 0) && 
                    sightingFaces.length === (dbSightingCount || 0),
        });

    } catch (error) {
        console.error('[Admin Face Recognition Status] Error:', error);
        return NextResponse.json({ 
            error: 'Failed to get face recognition status',
            details: error.message 
        }, { status: 500 });
    }
}
