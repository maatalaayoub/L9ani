import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        // Check if supabase admin is available
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: 'Database connection not available' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || 'all'; // 'all', 'missing', 'sighting'
        const type = searchParams.get('type') || 'all';
        const city = searchParams.get('city') || 'all';
        const sort = searchParams.get('sort') || 'newest';
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        let allReports = [];

        // Fetch from reports table (missing reports)
        if (source === 'all' || source === 'missing') {
            // Full query with relations
            let missingQuery = supabaseAdmin
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
                .eq('status', 'approved');

            // Apply type filter
            if (type !== 'all') {
                missingQuery = missingQuery.eq('report_type', type);
            }

            const { data: missingReports, error: missingError } = await missingQuery;

            if (missingError) {
                console.error('Error fetching missing reports:', missingError);
            } else if (missingReports && missingReports.length > 0) {
                // Transform missing reports
                const transformedMissing = missingReports.map(report => {
                    // Relations return objects (not arrays) for one-to-one relationships
                    const details = report.report_details_person ||
                        report.report_details_pet ||
                        report.report_details_document ||
                        report.report_details_electronics ||
                        report.report_details_vehicle ||
                        report.report_details_other || {};

                    // Get the first photo from the photos array
                    const photoUrl = report.photos && report.photos.length > 0 
                        ? report.photos[0] 
                        : null;

                    return {
                        id: report.id,
                        user_id: report.user_id,
                        source: 'missing',
                        type: report.report_type,
                        report_type: report.report_type,
                        status: report.status,
                        coordinates: report.coordinates,
                        created_at: report.created_at,
                        updated_at: report.updated_at,
                        photos: report.photos || [],
                        photo_url: photoUrl,
                        city: report.city,
                        last_known_location: report.last_known_location,
                        title: getReportTitle(report.report_type, details),
                        description: report.additional_info,
                        details: details,
                        owner: report.profiles || null
                    };
                });

                allReports = [...allReports, ...transformedMissing];
            }
        }

        // Fetch from sighting_reports table
        if (source === 'all' || source === 'sighting') {
            let sightingQuery = supabaseAdmin
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
                .eq('status', 'approved');

            // Apply type filter
            if (type !== 'all') {
                sightingQuery = sightingQuery.eq('report_type', type);
            }

            const { data: sightingReports, error: sightingError } = await sightingQuery;

            if (sightingError) {
                console.error('Error fetching sighting reports:', sightingError);
            } else if (sightingReports) {
                // Transform sighting reports
                const transformedSighting = sightingReports.map(report => {
                    // Get type-specific details
                    const typeDetails = 
                        report.sighting_details_person ||
                        report.sighting_details_pet ||
                        report.sighting_details_vehicle ||
                        report.sighting_details_electronics ||
                        report.sighting_details_document ||
                        report.sighting_details_other || {};

                    // Generate title based on available data
                    let title = getSightingTitle(report.report_type, report);
                    if (report.report_type === 'person' && typeDetails.first_name) {
                        title = `${typeDetails.first_name} ${typeDetails.last_name || ''}`.trim();
                    } else if (report.report_type === 'pet' && typeDetails.breed) {
                        title = `${typeDetails.breed} ${typeDetails.pet_type || ''}`.trim();
                    } else if ((report.report_type === 'vehicle' || report.report_type === 'electronics') && typeDetails.brand) {
                        title = `${typeDetails.brand} ${typeDetails.model || ''}`.trim();
                    } else if (report.report_type === 'document' && typeDetails.document_type) {
                        title = typeDetails.document_type;
                    } else if (report.report_type === 'other' && typeDetails.item_name) {
                        title = typeDetails.item_name;
                    }

                    return {
                        id: report.id,
                        user_id: report.user_id,
                        source: 'sighting',
                        type: report.report_type,
                        report_type: report.report_type,
                        status: report.status,
                        coordinates: report.coordinates,
                        created_at: report.created_at,
                        updated_at: report.updated_at,
                        photo_url: report.photos && report.photos.length > 0 ? report.photos[0] : null,
                        photos: report.photos || [],
                        city: report.city || report.location_description,
                        last_known_location: report.location_description,
                        title: title,
                        description: report.additional_info,
                        details: {
                            ...typeDetails,
                            location_description: report.location_description,
                            sighting_date: report.created_at,
                            contact_info: report.reporter_phone
                        },
                        owner: report.profiles || null
                    };
                });

                allReports = [...allReports, ...transformedSighting];
            }
        }

        // Fetch user profiles for all reports
        if (allReports.length > 0) {
            const userIds = [...new Set(allReports.map(r => r.user_id).filter(Boolean))];
            if (userIds.length > 0) {
                // Fetch profiles using auth_user_id
                const { data: profiles, error: profilesError } = await supabaseAdmin
                    .from('profiles')
                    .select('auth_user_id, first_name, last_name, username, avatar_url')
                    .in('auth_user_id', userIds);

                if (profiles && profiles.length > 0) {
                    const profilesMap = {};
                    profiles.forEach(p => {
                        // Construct full_name from first_name and last_name
                        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
                        profilesMap[p.auth_user_id] = {
                            full_name: fullName || p.username || null,
                            username: p.username,
                            avatar_url: p.avatar_url
                        };
                    });

                    // Attach owner info to each report
                    allReports = allReports.map(report => ({
                        ...report,
                        owner: report.owner || profilesMap[report.user_id] || null
                    }));
                }
            }
        }

        // Filter by city if specified
        if (city !== 'all') {
            allReports = allReports.filter(report => 
                report.city && report.city.toLowerCase().includes(city.toLowerCase())
            );
        }

        // Sort reports
        if (sort === 'newest') {
            allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sort === 'oldest') {
            allReports.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        // Get total count before pagination
        const total = allReports.length;

        // Apply pagination
        const paginatedReports = allReports.slice(offset, offset + limit);

        return NextResponse.json({
            reports: paginatedReports,
            total,
            limit,
            offset,
            hasMore: offset + limit < total
        });

    } catch (error) {
        console.error('Error in public reports API:', error);
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
