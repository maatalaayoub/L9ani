import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Detail table names mapping
const DETAIL_TABLES = {
    person: 'report_details_person',
    pet: 'report_details_pet',
    document: 'report_details_document',
    electronics: 'report_details_electronics',
    vehicle: 'report_details_vehicle',
    other: 'report_details_other'
};

// POST - Create a new report
export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Reports POST] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[API Reports POST] No authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token using admin client
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            console.error('[API Reports POST] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[API Reports POST] Creating report for user:', user.id);

        // Parse form data
        const formData = await request.formData();
        
        // Get report type (required)
        const reportType = formData.get('reportType');
        if (!reportType || !DETAIL_TABLES[reportType]) {
            return NextResponse.json({ 
                error: 'Invalid or missing report type. Must be: person, pet, document, electronics, vehicle, or other' 
            }, { status: 400 });
        }

        // Get common fields
        const city = formData.get('city');
        const lastKnownLocation = formData.get('lastKnownLocation');
        const coordinatesStr = formData.get('coordinates');
        const additionalInfo = formData.get('additionalInfo') || null;

        // Validate common required fields
        if (!city || !lastKnownLocation) {
            return NextResponse.json({ 
                error: 'Missing required fields: city, lastKnownLocation' 
            }, { status: 400 });
        }

        // Parse coordinates
        let coordinates = null;
        if (coordinatesStr) {
            try {
                coordinates = JSON.parse(coordinatesStr);
            } catch (e) {
                console.error('[API Reports] Error parsing coordinates:', e);
            }
        }

        // Handle photo uploads - organized by report type
        const photoUrls = [];
        const photoFiles = formData.getAll('photos');
        const STORAGE_BUCKET = 'reports-photos';
        
        if (photoFiles && photoFiles.length > 0) {
            console.log('[API Reports] Processing', photoFiles.length, 'photos for type:', reportType);
            
            for (const file of photoFiles) {
                if (file && file.size > 0) {
                    try {
                        const fileExt = file.name.split('.').pop() || 'jpg';
                        // Organize by: reportType/userId/timestamp-random.ext
                        const fileName = `${reportType}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                        
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        
                        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                            .from(STORAGE_BUCKET)
                            .upload(fileName, buffer, {
                                contentType: file.type || 'image/jpeg',
                                upsert: false
                            });
                        
                        if (uploadError) {
                            console.error('[API Reports] Photo upload error:', uploadError.message);
                        } else {
                            const { data: urlData } = supabaseAdmin.storage
                                .from(STORAGE_BUCKET)
                                .getPublicUrl(fileName);
                            
                            if (urlData?.publicUrl) {
                                photoUrls.push(urlData.publicUrl);
                                console.log('[API Reports] Photo uploaded:', fileName);
                            }
                        }
                    } catch (photoErr) {
                        console.error('[API Reports] Photo processing error:', photoErr);
                    }
                }
            }
        }

        // STEP 1: Insert the main report record
        // Get reporter contact information
        const reporterFirstName = formData.get('reporterFirstName') || null;
        const reporterLastName = formData.get('reporterLastName') || null;
        const reporterPhone = formData.get('reporterPhone') || null;
        const reporterEmail = formData.get('reporterEmail') || null;

        const reportData = {
            user_id: user.id,
            report_type: reportType,
            city: city,
            last_known_location: lastKnownLocation,
            coordinates: coordinates,
            additional_info: additionalInfo,
            photos: photoUrls.length > 0 ? photoUrls : null,
            status: 'pending',
            reporter_first_name: reporterFirstName,
            reporter_last_name: reporterLastName,
            reporter_phone: reporterPhone,
            reporter_email: reporterEmail
        };

        console.log('[API Reports] Inserting main report:', { ...reportData, photos: photoUrls.length + ' photos' });

        const { data: report, error: insertError } = await supabaseAdmin
            .from('reports')
            .insert(reportData)
            .select()
            .single();

        if (insertError) {
            console.error('[API Reports] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create report: ' + insertError.message }, { status: 500 });
        }

        // STEP 2: Insert type-specific details
        let detailData = null;
        let detailError = null;

        switch (reportType) {
            case 'person':
                const firstName = formData.get('firstName');
                const lastName = formData.get('lastName');
                
                if (!firstName || !lastName) {
                    // Rollback: delete the main report
                    await supabaseAdmin.from('reports').delete().eq('id', report.id);
                    return NextResponse.json({ 
                        error: 'Missing required fields for person report: firstName, lastName' 
                    }, { status: 400 });
                }

                ({ data: detailData, error: detailError } = await supabaseAdmin
                    .from('report_details_person')
                    .insert({
                        report_id: report.id,
                        first_name: firstName,
                        last_name: lastName,
                        date_of_birth: formData.get('dateOfBirth') || null,
                        gender: formData.get('gender') || null,
                        health_status: formData.get('healthStatus') || null,
                        health_details: formData.get('healthDetails') || null
                    })
                    .select()
                    .single());
                break;

            case 'pet':
                const petName = formData.get('petName');
                const petType = formData.get('petType');
                
                if (!petName || !petType) {
                    await supabaseAdmin.from('reports').delete().eq('id', report.id);
                    return NextResponse.json({ 
                        error: 'Missing required fields for pet report: petName, petType' 
                    }, { status: 400 });
                }

                ({ data: detailData, error: detailError } = await supabaseAdmin
                    .from('report_details_pet')
                    .insert({
                        report_id: report.id,
                        pet_name: petName,
                        pet_type: petType,
                        breed: formData.get('petBreed') || null,
                        color: formData.get('petColor') || null,
                        size: formData.get('petSize') || null
                    })
                    .select()
                    .single());
                break;

            case 'document':
                const documentType = formData.get('documentType');
                
                if (!documentType) {
                    await supabaseAdmin.from('reports').delete().eq('id', report.id);
                    return NextResponse.json({ 
                        error: 'Missing required field for document report: documentType' 
                    }, { status: 400 });
                }

                ({ data: detailData, error: detailError } = await supabaseAdmin
                    .from('report_details_document')
                    .insert({
                        report_id: report.id,
                        document_type: documentType,
                        document_number: formData.get('documentNumber') || null,
                        issuing_authority: formData.get('documentIssuer') || null,
                        owner_name: formData.get('ownerName') || null
                    })
                    .select()
                    .single());
                break;

            case 'electronics':
                const deviceType = formData.get('deviceType');
                const deviceBrand = formData.get('deviceBrand');
                
                if (!deviceType || !deviceBrand) {
                    await supabaseAdmin.from('reports').delete().eq('id', report.id);
                    return NextResponse.json({ 
                        error: 'Missing required fields for electronics report: deviceType, deviceBrand' 
                    }, { status: 400 });
                }

                ({ data: detailData, error: detailError } = await supabaseAdmin
                    .from('report_details_electronics')
                    .insert({
                        report_id: report.id,
                        device_type: deviceType,
                        brand: deviceBrand,
                        model: formData.get('deviceModel') || null,
                        color: formData.get('deviceColor') || null,
                        serial_number: formData.get('serialNumber') || null
                    })
                    .select()
                    .single());
                break;

            case 'vehicle':
                const vehicleType = formData.get('vehicleType');
                const vehicleBrand = formData.get('vehicleBrand');
                
                if (!vehicleType || !vehicleBrand) {
                    await supabaseAdmin.from('reports').delete().eq('id', report.id);
                    return NextResponse.json({ 
                        error: 'Missing required fields for vehicle report: vehicleType, vehicleBrand' 
                    }, { status: 400 });
                }

                ({ data: detailData, error: detailError } = await supabaseAdmin
                    .from('report_details_vehicle')
                    .insert({
                        report_id: report.id,
                        vehicle_type: vehicleType,
                        brand: vehicleBrand,
                        model: formData.get('vehicleModel') || null,
                        color: formData.get('vehicleColor') || null,
                        year: formData.get('vehicleYear') || null,
                        license_plate: formData.get('licensePlate') || null
                    })
                    .select()
                    .single());
                break;

            case 'other':
                const itemName = formData.get('itemName');
                
                if (!itemName) {
                    await supabaseAdmin.from('reports').delete().eq('id', report.id);
                    return NextResponse.json({ 
                        error: 'Missing required field for other report: itemName' 
                    }, { status: 400 });
                }

                ({ data: detailData, error: detailError } = await supabaseAdmin
                    .from('report_details_other')
                    .insert({
                        report_id: report.id,
                        item_name: itemName,
                        item_description: formData.get('itemDescription') || null
                    })
                    .select()
                    .single());
                break;
        }

        if (detailError) {
            console.error('[API Reports] Detail insert error:', detailError);
            // Rollback: delete the main report
            await supabaseAdmin.from('reports').delete().eq('id', report.id);
            return NextResponse.json({ error: 'Failed to create report details: ' + detailError.message }, { status: 500 });
        }

        console.log('[API Reports] Report created successfully:', report.id);

        return NextResponse.json({ 
            success: true, 
            report: {
                ...report,
                details: detailData
            }
        }, { status: 201 });

    } catch (err) {
        console.error('[API Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - Get user's reports
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Reports GET] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[API Reports GET] No authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token
        const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !data?.user) {
            console.error('[API Reports GET] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = data.user;
        console.log('[API Reports GET] Fetching reports for user:', user.id);

        // Fetch user's reports using the view that joins all details
        const { data: reports, error: fetchError } = await supabaseAdmin
            .from('reports_with_details')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('[API Reports GET] Fetch error:', fetchError);
            // If view doesn't exist yet, fall back to just the reports table
            const { data: fallbackReports, error: fallbackError } = await supabaseAdmin
                .from('reports')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (fallbackError) {
                return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
            }
            return NextResponse.json({ reports: fallbackReports || [] });
        }

        console.log('[API Reports GET] Found', reports?.length || 0, 'reports');

        return NextResponse.json({ reports: reports || [] });

    } catch (err) {
        console.error('[API Reports GET] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Delete a report
export async function DELETE(request) {
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

        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('reportId');

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        // Verify ownership
        const { data: existingReport, error: fetchError } = await supabaseAdmin
            .from('reports')
            .select('id, user_id, photos')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existingReport) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Delete photos from storage
        if (existingReport.photos && existingReport.photos.length > 0) {
            for (const photoUrl of existingReport.photos) {
                try {
                    const urlParts = photoUrl.split('/reports-photos/');
                    if (urlParts.length > 1) {
                        await supabaseAdmin.storage
                            .from('reports-photos')
                            .remove([urlParts[1]]);
                    }
                } catch (photoErr) {
                    console.error('[API Reports DELETE] Error deleting photo:', photoErr);
                }
            }
        }

        // Delete the report (cascade will delete detail record)
        const { error: deleteError } = await supabaseAdmin
            .from('reports')
            .delete()
            .eq('id', reportId)
            .eq('user_id', user.id);

        if (deleteError) {
            return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Report deleted successfully' });

    } catch (err) {
        console.error('[API Reports DELETE] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
