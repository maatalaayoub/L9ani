/**
 * Match Access Token API
 * 
 * Provides secure tokens for matched report access
 * This allows users who have a face match to view each other's reports
 * even if one report is not yet approved.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

/**
 * GET /api/face-recognition/matches/access-token
 * 
 * Get or generate an access token for a matched report
 * 
 * Query params:
 *   - matchId: The face match ID
 *   - targetReportId: The report ID the user wants to access
 *   - targetReportType: 'missing' or 'sighting'
 */
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Authenticate user
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
        const matchId = searchParams.get('matchId');
        const targetReportId = searchParams.get('targetReportId');
        const targetReportType = searchParams.get('targetReportType');

        if (!matchId || !targetReportId || !targetReportType) {
            return NextResponse.json({ 
                error: 'Missing required parameters: matchId, targetReportId, targetReportType' 
            }, { status: 400 });
        }

        if (!['missing', 'sighting'].includes(targetReportType)) {
            return NextResponse.json({ 
                error: 'Invalid targetReportType. Must be "missing" or "sighting"' 
            }, { status: 400 });
        }

        // Verify that the user has a valid face match for this report
        const { data: matchData, error: matchError } = await supabaseAdmin
            .from('face_matches')
            .select(`
                id,
                missing_face_id,
                sighting_face_id,
                similarity_score,
                missing_report_faces!inner (
                    report_id,
                    reports!inner (
                        id,
                        user_id,
                        status
                    )
                ),
                sighting_report_faces!inner (
                    report_id,
                    sighting_reports!inner (
                        id,
                        user_id,
                        status
                    )
                )
            `)
            .eq('id', matchId)
            .single();

        if (matchError || !matchData) {
            console.error('[Match Access API] Match not found:', matchError);
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        const missingReport = matchData.missing_report_faces?.reports;
        const sightingReport = matchData.sighting_report_faces?.sighting_reports;

        if (!missingReport || !sightingReport) {
            return NextResponse.json({ error: 'Associated reports not found' }, { status: 404 });
        }

        // Check if user owns one of the matched reports
        const userOwnsMissing = missingReport.user_id === user.id;
        const userOwnsSighting = sightingReport.user_id === user.id;

        if (!userOwnsMissing && !userOwnsSighting) {
            return NextResponse.json({ 
                error: 'Access denied. You do not own any of the matched reports.' 
            }, { status: 403 });
        }

        // Verify the target report is the OTHER report in the match (not the user's own)
        let targetReport;
        if (targetReportType === 'missing') {
            if (targetReportId !== missingReport.id) {
                return NextResponse.json({ 
                    error: 'Target report does not match the face match record' 
                }, { status: 400 });
            }
            // User must own the sighting report to access the missing report
            if (!userOwnsSighting) {
                return NextResponse.json({ 
                    error: 'You can only get access to the matched report, not your own' 
                }, { status: 403 });
            }
            targetReport = missingReport;
        } else {
            if (targetReportId !== sightingReport.id) {
                return NextResponse.json({ 
                    error: 'Target report does not match the face match record' 
                }, { status: 400 });
            }
            // User must own the missing report to access the sighting report
            if (!userOwnsMissing) {
                return NextResponse.json({ 
                    error: 'You can only get access to the matched report, not your own' 
                }, { status: 403 });
            }
            targetReport = sightingReport;
        }

        // Check if target report is already approved - if so, no token needed
        if (targetReport.status === 'approved') {
            return NextResponse.json({
                success: true,
                accessRequired: false,
                message: 'Report is already approved and publicly accessible',
                reportStatus: 'approved'
            }, { status: 200 });
        }

        // Check for existing valid token
        const { data: existingToken, error: tokenQueryError } = await supabaseAdmin
            .from('match_access_tokens')
            .select('token, expires_at, created_at')
            .eq('user_id', user.id)
            .eq('match_id', matchId)
            .eq('target_report_id', targetReportId)
            .maybeSingle();

        if (tokenQueryError) {
            console.error('[Match Access API] Error checking existing token:', tokenQueryError);
        }

        // If valid token exists, return it
        if (existingToken && (!existingToken.expires_at || new Date(existingToken.expires_at) > new Date())) {
            return NextResponse.json({
                success: true,
                accessRequired: true,
                token: existingToken.token,
                expiresAt: existingToken.expires_at,
                reportStatus: targetReport.status
            }, { status: 200 });
        }

        // Generate new secure token
        const newToken = crypto.randomBytes(32).toString('hex');

        // Insert new token (or update existing expired one)
        const { data: insertedToken, error: insertError } = await supabaseAdmin
            .from('match_access_tokens')
            .upsert({
                user_id: user.id,
                match_id: matchId,
                target_report_id: targetReportId,
                target_report_type: targetReportType,
                token: newToken,
                expires_at: null, // No expiration - token valid until report is approved or match deleted
                use_count: 0,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,match_id,target_report_id'
            })
            .select()
            .single();

        if (insertError) {
            console.error('[Match Access API] Error creating token:', insertError);
            return NextResponse.json({ error: 'Failed to generate access token' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            accessRequired: true,
            token: insertedToken.token,
            expiresAt: insertedToken.expires_at,
            reportStatus: targetReport.status
        }, { status: 200 });

    } catch (err) {
        console.error('[Match Access API] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/face-recognition/matches/access-token/validate
 * 
 * Validate an access token and return whether access is granted
 * Used by the report detail API to verify access
 * 
 * Body: {
 *   token: string,
 *   reportId: string,
 *   reportType: 'missing' | 'sighting'
 * }
 */
export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const { token, reportId, reportType } = body;

        if (!token || !reportId || !reportType) {
            return NextResponse.json({ 
                valid: false,
                error: 'Missing required parameters' 
            }, { status: 400 });
        }

        // Validate the token
        const { data: tokenData, error: tokenError } = await supabaseAdmin
            .from('match_access_tokens')
            .select('id, user_id, match_id, expires_at, use_count')
            .eq('token', token)
            .eq('target_report_id', reportId)
            .eq('target_report_type', reportType)
            .maybeSingle();

        if (tokenError || !tokenData) {
            return NextResponse.json({ 
                valid: false,
                error: 'Invalid or expired token' 
            }, { status: 200 });
        }

        // Check expiration
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ 
                valid: false,
                error: 'Token has expired' 
            }, { status: 200 });
        }

        // Update usage tracking
        await supabaseAdmin
            .from('match_access_tokens')
            .update({
                last_used_at: new Date().toISOString(),
                use_count: (tokenData.use_count || 0) + 1
            })
            .eq('id', tokenData.id);

        return NextResponse.json({
            valid: true,
            userId: tokenData.user_id,
            matchId: tokenData.match_id
        }, { status: 200 });

    } catch (err) {
        console.error('[Match Access Validate API] Exception:', err);
        return NextResponse.json({ 
            valid: false,
            error: 'Internal Server Error' 
        }, { status: 500 });
    }
}
