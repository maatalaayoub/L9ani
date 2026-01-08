/**
 * Face Recognition Setup/Initialize API
 * 
 * Initializes AWS Rekognition collections and verifies configuration
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { initializeCollections, COLLECTIONS } from '@/lib/rekognition';

/**
 * POST /api/face-recognition/setup
 * 
 * Initialize Rekognition collections (admin only)
 */
export async function POST(request) {
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

        // Check admin role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('[Face Recognition Setup] Initializing collections...');

        // Initialize collections
        await initializeCollections();

        console.log('[Face Recognition Setup] Collections initialized successfully');

        return NextResponse.json({
            success: true,
            message: 'Face recognition collections initialized',
            collections: {
                missingPersons: COLLECTIONS.MISSING_PERSONS,
                sightings: COLLECTIONS.SIGHTINGS
            }
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Recognition Setup] Exception:', err);
        return NextResponse.json({ 
            error: 'Failed to initialize collections',
            details: err.message 
        }, { status: 500 });
    }
}

/**
 * GET /api/face-recognition/setup
 * 
 * Check configuration status
 */
export async function GET(request) {
    try {
        // Check if AWS credentials are configured
        const hasAwsCredentials = !!(
            process.env.AWS_ACCESS_KEY_ID && 
            process.env.AWS_SECRET_ACCESS_KEY
        );

        const region = process.env.AWS_REGION || 'eu-west-1';

        return NextResponse.json({
            success: true,
            configured: hasAwsCredentials,
            region,
            collections: {
                missingPersons: COLLECTIONS.MISSING_PERSONS,
                sightings: COLLECTIONS.SIGHTINGS
            }
        }, { status: 200 });

    } catch (err) {
        console.error('[Face Recognition Setup] GET Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
