import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * GET /api/reports/[id]?source=missing|sighting
 * Fetches a single report by ID - optimized to avoid fetching all reports
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

        if (!id) {
            return NextResponse.json(
                { error: 'Report ID is required' },
                { status: 400 }
            );
        }

        let report = null;

        if (source === 'missing') {
            // Fetch from reports table (missing reports)
            const { data, error } = await supabaseAdmin
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
                .eq('id', id)
                .eq('status', 'approved')
                .maybeSingle();

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
            const { data, error } = await supabaseAdmin
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
                .eq('id', id)
                .eq('status', 'approved')
                .maybeSingle();

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

        return NextResponse.json({ report });

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
