import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Validate match access token
 * Returns { valid: boolean, userId?: string, matchId?: string }
 */
async function validateMatchAccessToken(token, reportId, reportType) {
    if (!token || !supabaseAdmin) {
        return { valid: false };
    }

    try {
        const { data: tokenData, error } = await supabaseAdmin
            .from('match_access_tokens')
            .select('id, user_id, match_id, expires_at, use_count')
            .eq('token', token)
            .eq('target_report_id', reportId)
            .eq('target_report_type', reportType)
            .maybeSingle();

        if (error || !tokenData) {
            return { valid: false };
        }

        // Check expiration
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            return { valid: false };
        }

        // Update usage tracking (don't await, fire and forget)
        supabaseAdmin
            .from('match_access_tokens')
            .update({
                last_used_at: new Date().toISOString(),
                use_count: (tokenData.use_count || 0) + 1
            })
            .eq('id', tokenData.id)
            .then(() => {})
            .catch(err => console.error('[Report API] Error updating token usage:', err));

        return {
            valid: true,
            userId: tokenData.user_id,
            matchId: tokenData.match_id
        };
    } catch (err) {
        console.error('[Report API] Error validating token:', err);
        return { valid: false };
    }
}

/**
 * Check if user owns one of the matched reports and can access the other
 */
async function checkMatchAccess(userId, reportId, reportType) {
    if (!userId || !supabaseAdmin) {
        return { hasAccess: false };
    }

    try {
        // Find face matches involving this report
        if (reportType === 'missing') {
            const { data: matches, error } = await supabaseAdmin
                .from('face_matches')
                .select(`
                    id,
                    similarity_score,
                    missing_report_faces!inner (
                        report_id,
                        reports!inner (
                            id,
                            user_id
                        )
                    ),
                    sighting_report_faces!inner (
                        report_id,
                        sighting_reports!inner (
                            id,
                            user_id
                        )
                    )
                `)
                .not('missing_report_faces', 'is', null)
                .not('sighting_report_faces', 'is', null);

            if (error || !matches) {
                return { hasAccess: false };
            }

            // Check if user owns a sighting report that matches this missing report
            for (const match of matches) {
                const missingReport = match.missing_report_faces?.reports;
                const sightingReport = match.sighting_report_faces?.sighting_reports;
                
                if (missingReport?.id === reportId && sightingReport?.user_id === userId) {
                    return { hasAccess: true, matchId: match.id };
                }
            }
        } else {
            const { data: matches, error } = await supabaseAdmin
                .from('face_matches')
                .select(`
                    id,
                    similarity_score,
                    missing_report_faces!inner (
                        report_id,
                        reports!inner (
                            id,
                            user_id
                        )
                    ),
                    sighting_report_faces!inner (
                        report_id,
                        sighting_reports!inner (
                            id,
                            user_id
                        )
                    )
                `)
                .not('missing_report_faces', 'is', null)
                .not('sighting_report_faces', 'is', null);

            if (error || !matches) {
                return { hasAccess: false };
            }

            // Check if user owns a missing report that matches this sighting report
            for (const match of matches) {
                const missingReport = match.missing_report_faces?.reports;
                const sightingReport = match.sighting_report_faces?.sighting_reports;
                
                if (sightingReport?.id === reportId && missingReport?.user_id === userId) {
                    return { hasAccess: true, matchId: match.id };
                }
            }
        }

        return { hasAccess: false };
    } catch (err) {
        console.error('[Report API] Error checking match access:', err);
        return { hasAccess: false };
    }
}

/**
 * GET /api/reports/[id]?source=missing|sighting&match_token=xxx
 * Fetches a single report by ID - optimized to avoid fetching all reports
 * 
 * Query params:
 *   - source: 'missing' or 'sighting' (default: 'missing')
 *   - match_token: Optional secure token for accessing unapproved matched reports
 */
export async function GET(request, { params }) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: 'Database connection not available' },
                { status: 500 }
            );
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || 'missing';
        const matchToken = searchParams.get('match_token');

        if (!id) {
            return NextResponse.json(
                { error: 'Report ID is required' },
                { status: 400 }
            );
        }

        // Check if user is authenticated
        let authenticatedUserId = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                authenticatedUserId = user.id;
            }
        }

        // Determine access level
        let allowUnapproved = false;
        let matchAccessInfo = null;

        // Check match token if provided
        if (matchToken) {
            const tokenValidation = await validateMatchAccessToken(matchToken, id, source);
            if (tokenValidation.valid) {
                allowUnapproved = true;
                matchAccessInfo = {
                    via: 'token',
                    matchId: tokenValidation.matchId
                };
            }
        }

        // Check if authenticated user has match access (without token)
        if (!allowUnapproved && authenticatedUserId) {
            const matchAccess = await checkMatchAccess(authenticatedUserId, id, source);
            if (matchAccess.hasAccess) {
                allowUnapproved = true;
                matchAccessInfo = {
                    via: 'ownership',
                    matchId: matchAccess.matchId
                };
            }
        }

        let report = null;

        if (source === 'missing') {
            // Fetch from reports table (missing reports)
            let query = supabaseAdmin
                .from('reports')
                .select(`
                    id,
                    user_id,
                    report_type,
                    status,
                    city,
                    last_known_location,
                    coordinates,
                    photos,
                    additional_info,
                    created_at,
                    updated_at,
                    reporter_first_name,
                    reporter_last_name,
                    reporter_phone,
                    reporter_email,
                    report_details_person (
                        first_name,
                        last_name,
                        date_of_birth,
                        gender,
                        health_status,
                        health_details
                    ),
                    report_details_pet (
                        pet_name,
                        pet_type,
                        breed,
                        color,
                        size
                    ),
                    report_details_document (
                        document_type,
                        document_number,
                        issuing_authority,
                        owner_name
                    ),
                    report_details_electronics (
                        device_type,
                        brand,
                        model,
                        color,
                        serial_number
                    ),
                    report_details_vehicle (
                        vehicle_type,
                        brand,
                        model,
                        year,
                        color,
                        license_plate
                    ),
                    report_details_other (
                        item_name,
                        item_description
                    )
                `)
                .eq('id', id);

            // Only filter by approved status if user doesn't have match access
            if (!allowUnapproved) {
                query = query.eq('status', 'approved');
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                console.error('[API Report Detail] Error fetching missing report:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (data) {
                const details = data.report_details_person ||
                    data.report_details_pet ||
                    data.report_details_document ||
                    data.report_details_electronics ||
                    data.report_details_vehicle ||
                    data.report_details_other || {};

                const photoUrl = data.photos && data.photos.length > 0 ? data.photos[0] : null;

                report = {
                    id: data.id,
                    user_id: data.user_id,
                    source: 'missing',
                    type: data.report_type,
                    report_type: data.report_type,
                    status: data.status,
                    coordinates: data.coordinates,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    photos: data.photos || [],
                    photo_url: photoUrl,
                    city: data.city,
                    last_known_location: data.last_known_location,
                    title: getReportTitle(data.report_type, details),
                    description: data.additional_info,
                    details: details,
                    reporter: {
                        first_name: data.reporter_first_name,
                        last_name: data.reporter_last_name,
                        phone: data.reporter_phone,
                        email: data.reporter_email
                    }
                };
            }
        } else if (source === 'sighting') {
            // Fetch from sighting_reports table
            let query = supabaseAdmin
                .from('sighting_reports')
                .select(`
                    *,
                    sighting_details_person (
                        first_name,
                        last_name,
                        approximate_age,
                        gender,
                        physical_description,
                        clothing_description
                    ),
                    sighting_details_pet (
                        pet_type,
                        breed,
                        color,
                        size,
                        has_collar,
                        collar_description,
                        condition
                    ),
                    sighting_details_vehicle (
                        vehicle_type,
                        brand,
                        model,
                        color,
                        license_plate
                    ),
                    sighting_details_electronics (
                        device_type,
                        brand,
                        model,
                        color
                    ),
                    sighting_details_document (
                        document_type,
                        owner_name
                    ),
                    sighting_details_other (
                        item_name,
                        item_description,
                        condition
                    )
                `)
                .eq('id', id);

            // Only filter by approved status if user doesn't have match access
            if (!allowUnapproved) {
                query = query.eq('status', 'approved');
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                console.error('[API Report Detail] Error fetching sighting report:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (data) {
                const typeDetails = 
                    data.sighting_details_person ||
                    data.sighting_details_pet ||
                    data.sighting_details_vehicle ||
                    data.sighting_details_electronics ||
                    data.sighting_details_document ||
                    data.sighting_details_other || {};

                let title = getSightingTitle(data.report_type, data);
                if (data.report_type === 'person' && typeDetails.first_name) {
                    title = `${typeDetails.first_name} ${typeDetails.last_name || ''}`.trim();
                } else if (data.report_type === 'pet' && typeDetails.breed) {
                    title = `${typeDetails.breed} ${typeDetails.pet_type || ''}`.trim();
                } else if ((data.report_type === 'vehicle' || data.report_type === 'electronics') && typeDetails.brand) {
                    title = `${typeDetails.brand} ${typeDetails.model || ''}`.trim();
                } else if (data.report_type === 'document' && typeDetails.document_type) {
                    title = typeDetails.document_type;
                } else if (data.report_type === 'other' && typeDetails.item_name) {
                    title = typeDetails.item_name;
                }

                report = {
                    id: data.id,
                    user_id: data.user_id,
                    source: 'sighting',
                    type: data.report_type,
                    report_type: data.report_type,
                    status: data.status,
                    coordinates: data.coordinates,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    photo_url: data.photos && data.photos.length > 0 ? data.photos[0] : null,
                    photos: data.photos || [],
                    city: data.city || data.location_description,
                    last_known_location: data.location_description,
                    title: title,
                    description: data.additional_info,
                    details: {
                        ...typeDetails,
                        location_description: data.location_description,
                        sighting_date: data.created_at,
                        contact_info: data.reporter_phone
                    },
                    reporter: {
                        phone: data.reporter_phone
                    }
                };
            }
        }

        // Fetch owner profile if report exists
        if (report && report.user_id) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('auth_user_id, first_name, last_name, username, avatar_url')
                .eq('auth_user_id', report.user_id)
                .maybeSingle();

            if (profile) {
                const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
                report.owner = {
                    full_name: fullName || profile.username || null,
                    username: profile.username,
                    avatar_url: profile.avatar_url
                };
            }
        }

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Add match access info to response if user accessed via match
        const response = { report };
        if (matchAccessInfo) {
            response.matchAccess = matchAccessInfo;
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('[API Report Detail] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Helper function to generate title for missing reports
function getReportTitle(type, details) {
    switch (type) {
        case 'person':
            const personName = [details.first_name, details.last_name].filter(Boolean).join(' ');
            return personName || 'Missing Person';
        case 'pet':
            return details.pet_name || `Missing ${details.pet_type || 'Pet'}`;
        case 'document':
            return details.document_type || 'Missing Document';
        case 'electronics':
            return [details.brand, details.model].filter(Boolean).join(' ') || 'Missing Electronics';
        case 'vehicle':
            return [details.brand, details.model, details.year].filter(Boolean).join(' ') || 'Missing Vehicle';
        case 'other':
            return details.item_name || 'Missing Item';
        default:
            return 'Missing Report';
    }
}

// Helper function to generate title for sighting reports
function getSightingTitle(type, report) {
    switch (type) {
        case 'person':
            return 'Person Sighting';
        case 'pet':
            return 'Pet Sighting';
        case 'document':
            return 'Document Found';
        case 'electronics':
            return 'Electronics Found';
        case 'vehicle':
            return 'Vehicle Sighting';
        case 'other':
            return 'Item Found';
        default:
            return 'Sighting Report';
    }
}
