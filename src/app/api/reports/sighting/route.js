import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Detail table names mapping for sighting reports
const SIGHTING_DETAIL_TABLES = {
    person: 'sighting_details_person',
    pet: 'sighting_details_pet',
    document: 'sighting_details_document',
    electronics: 'sighting_details_electronics',
    vehicle: 'sighting_details_vehicle',
    other: 'sighting_details_other'
};

// POST - Create a new sighting report
export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Sighting Reports POST] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[API Sighting Reports POST] No authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token using admin client
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            console.error('[API Sighting Reports POST] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[API Sighting Reports POST] Creating sighting report for user:', user.id);

        // Parse form data
        const formData = await request.formData();
        
        // Get report type (required)
        const reportType = formData.get('reportType');
        if (!reportType || !SIGHTING_DETAIL_TABLES[reportType]) {
            return NextResponse.json({ 
                error: 'Invalid or missing report type. Must be: person, pet, document, electronics, vehicle, or other' 
            }, { status: 400 });
        }

        // Get common fields
        const city = formData.get('city');
        const locationDescription = formData.get('locationDescription');
        const coordinatesStr = formData.get('coordinates');
        const additionalInfo = formData.get('additionalInfo') || null;

        // Reporter contact info
        const reporterFirstName = formData.get('reporterFirstName') || null;
        const reporterLastName = formData.get('reporterLastName') || null;
        const reporterPhone = formData.get('phone');
        const reporterEmail = formData.get('email') || null;

        // Validate common required fields
        if (!city || !locationDescription) {
            return NextResponse.json({ 
                error: 'Missing required fields: city, locationDescription' 
            }, { status: 400 });
        }

        if (!reporterPhone) {
            return NextResponse.json({ 
                error: 'Missing required field: phone' 
            }, { status: 400 });
        }

        // Parse coordinates
        let coordinates = null;
        if (coordinatesStr) {
            try {
                coordinates = JSON.parse(coordinatesStr);
            } catch (e) {
                console.error('[API Sighting Reports] Error parsing coordinates:', e);
            }
        }

        // Handle photo uploads - organized by report type
        const photoUrls = [];
        const photoFiles = formData.getAll('photos');
        const STORAGE_BUCKET = 'sighting-reports-photos';
        
        if (photoFiles && photoFiles.length > 0) {
            console.log('[API Sighting Reports] Processing', photoFiles.length, 'photos for type:', reportType);
            
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
                            console.error('[API Sighting Reports] Photo upload error:', uploadError.message);
                        } else {
                            const { data: urlData } = supabaseAdmin.storage
                                .from(STORAGE_BUCKET)
                                .getPublicUrl(fileName);
                            
                            if (urlData?.publicUrl) {
                                photoUrls.push(urlData.publicUrl);
                                console.log('[API Sighting Reports] Photo uploaded:', fileName);
                            }
                        }
                    } catch (photoErr) {
                        console.error('[API Sighting Reports] Photo processing error:', photoErr);
                    }
                }
            }
        }

        // STEP 1: Insert the main sighting report record
        const reportData = {
            user_id: user.id,
            report_type: reportType,
            city: city,
            location_description: locationDescription,
            coordinates: coordinates,
            additional_info: additionalInfo,
            photos: photoUrls.length > 0 ? photoUrls : null,
            reporter_first_name: reporterFirstName,
            reporter_last_name: reporterLastName,
            reporter_phone: reporterPhone,
            reporter_email: reporterEmail,
            status: 'pending'
        };

        console.log('[API Sighting Reports] Inserting main sighting report:', { ...reportData, photos: photoUrls.length + ' photos' });

        const { data: report, error: insertError } = await supabaseAdmin
            .from('sighting_reports')
            .insert(reportData)
            .select()
            .single();

        if (insertError) {
            console.error('[API Sighting Reports] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create sighting report: ' + insertError.message }, { status: 500 });
        }

        // STEP 2: Insert type-specific details
        let detailData = null;
        let detailError = null;

        switch (reportType) {
            case 'person':
                const firstName = formData.get('firstName') || null;
                const lastName = formData.get('lastName') || null;
                const approximateAge = formData.get('approximateAge') || null;
                const gender = formData.get('gender') || null;
                const physicalDescription = formData.get('physicalDescription') || null;
                const clothingDescription = formData.get('clothingDescription') || null;

                const personResult = await supabaseAdmin
                    .from('sighting_details_person')
                    .insert({
                        report_id: report.id,
                        first_name: firstName,
                        last_name: lastName,
                        approximate_age: approximateAge,
                        gender: gender,
                        physical_description: physicalDescription,
                        clothing_description: clothingDescription
                    })
                    .select()
                    .single();
                
                detailData = personResult.data;
                detailError = personResult.error;
                break;

            case 'pet':
                const petType = formData.get('petType');
                const petBreed = formData.get('petBreed') || null;
                const petColor = formData.get('petColor') || null;
                const petSize = formData.get('petSize') || null;
                const hasCollar = formData.get('hasCollar') === 'true';
                const collarDescription = formData.get('collarDescription') || null;
                const petCondition = formData.get('condition') || null;

                if (!petType) {
                    // Rollback: delete the main report
                    await supabaseAdmin.from('sighting_reports').delete().eq('id', report.id);
                    return NextResponse.json({ error: 'Missing required field: petType' }, { status: 400 });
                }

                const petResult = await supabaseAdmin
                    .from('sighting_details_pet')
                    .insert({
                        report_id: report.id,
                        pet_type: petType,
                        breed: petBreed,
                        color: petColor,
                        size: petSize,
                        has_collar: hasCollar,
                        collar_description: collarDescription,
                        condition: petCondition
                    })
                    .select()
                    .single();
                
                detailData = petResult.data;
                detailError = petResult.error;
                break;

            case 'document':
                const documentType = formData.get('documentType');
                const documentNumber = formData.get('documentNumber') || null;
                const ownerName = formData.get('ownerName') || null;
                const documentCondition = formData.get('condition') || null;

                if (!documentType) {
                    await supabaseAdmin.from('sighting_reports').delete().eq('id', report.id);
                    return NextResponse.json({ error: 'Missing required field: documentType' }, { status: 400 });
                }

                const docResult = await supabaseAdmin
                    .from('sighting_details_document')
                    .insert({
                        report_id: report.id,
                        document_type: documentType,
                        document_number: documentNumber,
                        owner_name: ownerName,
                        condition: documentCondition
                    })
                    .select()
                    .single();
                
                detailData = docResult.data;
                detailError = docResult.error;
                break;

            case 'electronics':
                const deviceType = formData.get('deviceType');
                const deviceBrand = formData.get('deviceBrand') || null;
                const deviceModel = formData.get('deviceModel') || null;
                const deviceColor = formData.get('deviceColor') || null;
                const electronicsCondition = formData.get('condition') || null;

                if (!deviceType) {
                    await supabaseAdmin.from('sighting_reports').delete().eq('id', report.id);
                    return NextResponse.json({ error: 'Missing required field: deviceType' }, { status: 400 });
                }

                const elecResult = await supabaseAdmin
                    .from('sighting_details_electronics')
                    .insert({
                        report_id: report.id,
                        device_type: deviceType,
                        brand: deviceBrand,
                        model: deviceModel,
                        color: deviceColor,
                        condition: electronicsCondition
                    })
                    .select()
                    .single();
                
                detailData = elecResult.data;
                detailError = elecResult.error;
                break;

            case 'vehicle':
                const vehicleType = formData.get('vehicleType');
                const vehicleBrand = formData.get('vehicleBrand') || null;
                const vehicleModel = formData.get('vehicleModel') || null;
                const vehicleColor = formData.get('vehicleColor') || null;
                const licensePlate = formData.get('licensePlate') || null;
                const vehicleCondition = formData.get('condition') || null;

                if (!vehicleType) {
                    await supabaseAdmin.from('sighting_reports').delete().eq('id', report.id);
                    return NextResponse.json({ error: 'Missing required field: vehicleType' }, { status: 400 });
                }

                const vehResult = await supabaseAdmin
                    .from('sighting_details_vehicle')
                    .insert({
                        report_id: report.id,
                        vehicle_type: vehicleType,
                        brand: vehicleBrand,
                        model: vehicleModel,
                        color: vehicleColor,
                        license_plate: licensePlate,
                        condition: vehicleCondition
                    })
                    .select()
                    .single();
                
                detailData = vehResult.data;
                detailError = vehResult.error;
                break;

            case 'other':
                const itemName = formData.get('itemName');
                const itemDescription = formData.get('itemDescription') || null;
                const otherCondition = formData.get('condition') || null;

                if (!itemName) {
                    await supabaseAdmin.from('sighting_reports').delete().eq('id', report.id);
                    return NextResponse.json({ error: 'Missing required field: itemName' }, { status: 400 });
                }

                const otherResult = await supabaseAdmin
                    .from('sighting_details_other')
                    .insert({
                        report_id: report.id,
                        item_name: itemName,
                        item_description: itemDescription,
                        condition: otherCondition
                    })
                    .select()
                    .single();
                
                detailData = otherResult.data;
                detailError = otherResult.error;
                break;
        }

        if (detailError) {
            console.error('[API Sighting Reports] Detail insert error:', detailError);
            // Attempt to rollback the main report
            await supabaseAdmin.from('sighting_reports').delete().eq('id', report.id);
            return NextResponse.json({ error: 'Failed to save sighting details: ' + detailError.message }, { status: 500 });
        }

        console.log('[API Sighting Reports] Sighting report created successfully:', report.id);

        return NextResponse.json({ 
            success: true, 
            report: {
                ...report,
                details: detailData
            }
        }, { status: 201 });

    } catch (err) {
        console.error('[API Sighting Reports POST] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Get user's sighting reports
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Sighting Reports GET] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[API Sighting Reports GET] No authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            console.error('[API Sighting Reports GET] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Build query
        let query = supabaseAdmin
            .from('sighting_reports')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: reports, error, count } = await query;

        if (error) {
            console.error('[API Sighting Reports GET] Error:', error);
            return NextResponse.json({ error: 'Failed to fetch sighting reports' }, { status: 500 });
        }

        // Fetch details for each report
        const reportsWithDetails = await Promise.all(
            (reports || []).map(async (report) => {
                const tableName = SIGHTING_DETAIL_TABLES[report.report_type];
                if (!tableName) return { ...report, details: null };

                const { data: details } = await supabaseAdmin
                    .from(tableName)
                    .select('*')
                    .eq('report_id', report.id)
                    .maybeSingle();

                return { ...report, details };
            })
        );

        return NextResponse.json({
            reports: reportsWithDetails,
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (err) {
        console.error('[API Sighting Reports GET] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update a sighting report
export async function PUT(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Sighting Reports PUT] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            console.error('[API Sighting Reports PUT] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            reportId,
            reportType,
            // Common fields
            city, 
            locationDescription, 
            additionalInfo, 
            resubmit,
            // Reporter info
            reporterFirstName,
            reporterLastName,
            phone,
            email,
            // Person fields
            firstName, 
            lastName, 
            approximateAge,
            gender, 
            physicalDescription,
            clothingDescription,
            // Pet fields
            petType,
            petBreed,
            petColor,
            petSize,
            hasCollar,
            collarDescription,
            condition,
            // Document fields
            documentType,
            documentNumber,
            ownerName,
            // Electronics fields
            deviceType,
            deviceBrand,
            deviceModel,
            deviceColor,
            // Vehicle fields
            vehicleType,
            vehicleBrand,
            vehicleModel,
            vehicleColor,
            licensePlate,
            // Other fields
            itemName,
            itemDescription
        } = body;

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        console.log('[API Sighting Reports PUT] Updating report:', reportId, 'for user:', user.id);

        // Find the report
        const { data: existingReport, error: fetchError } = await supabaseAdmin
            .from('sighting_reports')
            .select('*')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError || !existingReport) {
            console.error('[API Sighting Reports PUT] Report not found or not owned by user');
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Only allow editing pending or rejected reports
        if (existingReport.status === 'approved') {
            return NextResponse.json({ error: 'Cannot edit approved reports' }, { status: 403 });
        }

        // Update main report table
        const updateData = {
            city: city || existingReport.city,
            location_description: locationDescription || existingReport.location_description,
            additional_info: additionalInfo || existingReport.additional_info,
            reporter_first_name: reporterFirstName || existingReport.reporter_first_name,
            reporter_last_name: reporterLastName || existingReport.reporter_last_name,
            reporter_phone: phone || existingReport.reporter_phone,
            reporter_email: email || existingReport.reporter_email,
            updated_at: new Date().toISOString()
        };

        // If resubmitting a rejected report, change status back to pending
        if (resubmit && existingReport.status === 'rejected') {
            updateData.status = 'pending';
            updateData.rejection_reason = null;
            updateData.reviewed_at = null;
            updateData.reviewed_by = null;
        }

        const { data: updatedReport, error: updateError } = await supabaseAdmin
            .from('sighting_reports')
            .update(updateData)
            .eq('id', reportId)
            .select()
            .single();

        if (updateError) {
            console.error('[API Sighting Reports PUT] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
        }

        // Update the detail table based on report type
        const detailTable = SIGHTING_DETAIL_TABLES[existingReport.report_type];
        
        if (detailTable) {
            let detailUpdateData = {};
            
            switch (existingReport.report_type) {
                case 'person':
                    detailUpdateData = {
                        first_name: firstName,
                        last_name: lastName,
                        approximate_age: approximateAge || null,
                        gender: gender || null,
                        physical_description: physicalDescription || null,
                        clothing_description: clothingDescription || null
                    };
                    break;
                case 'pet':
                    detailUpdateData = {
                        pet_type: petType,
                        breed: petBreed || null,
                        color: petColor || null,
                        size: petSize || null,
                        has_collar: hasCollar === 'true' || hasCollar === true,
                        collar_description: collarDescription || null,
                        condition: condition || null
                    };
                    break;
                case 'document':
                    detailUpdateData = {
                        document_type: documentType,
                        document_number: documentNumber || null,
                        owner_name: ownerName || null,
                        condition: condition || null
                    };
                    break;
                case 'electronics':
                    detailUpdateData = {
                        device_type: deviceType,
                        brand: deviceBrand || null,
                        model: deviceModel || null,
                        color: deviceColor || null,
                        condition: condition || null
                    };
                    break;
                case 'vehicle':
                    detailUpdateData = {
                        vehicle_type: vehicleType,
                        brand: vehicleBrand || null,
                        model: vehicleModel || null,
                        color: vehicleColor || null,
                        license_plate: licensePlate || null,
                        condition: condition || null
                    };
                    break;
                case 'other':
                    detailUpdateData = {
                        item_name: itemName,
                        item_description: itemDescription || null,
                        condition: condition || null
                    };
                    break;
            }
            
            if (Object.keys(detailUpdateData).length > 0) {
                await supabaseAdmin
                    .from(detailTable)
                    .update(detailUpdateData)
                    .eq('report_id', reportId);
            }
        }

        console.log('[API Sighting Reports PUT] Report updated successfully');
        return NextResponse.json({ success: true, report: updatedReport });

    } catch (err) {
        console.error('[API Sighting Reports PUT] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Delete a sighting report
export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Sighting Reports DELETE] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            console.error('[API Sighting Reports DELETE] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get report ID from query params
        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('reportId');

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        console.log('[API Sighting Reports DELETE] Deleting report:', reportId, 'for user:', user.id);

        // Find the report
        const { data: existingReport, error: fetchError } = await supabaseAdmin
            .from('sighting_reports')
            .select('id, user_id, photos, report_type')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError || !existingReport) {
            console.error('[API Sighting Reports DELETE] Report not found or not owned by user');
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Delete associated photos from storage
        const STORAGE_BUCKET = 'sighting-reports-photos';
        if (existingReport.photos && existingReport.photos.length > 0) {
            console.log('[API Sighting Reports DELETE] Deleting', existingReport.photos.length, 'photos');
            for (const photoUrl of existingReport.photos) {
                try {
                    if (photoUrl.includes('/sighting-reports-photos/')) {
                        const filePath = photoUrl.split('/sighting-reports-photos/')[1];
                        if (filePath) {
                            await supabaseAdmin.storage
                                .from(STORAGE_BUCKET)
                                .remove([filePath]);
                            console.log('[API Sighting Reports DELETE] Deleted photo:', filePath);
                        }
                    }
                } catch (photoErr) {
                    console.error('[API Sighting Reports DELETE] Error deleting photo:', photoErr);
                }
            }
        }

        // Delete from detail table first (due to foreign key constraint)
        const detailTable = SIGHTING_DETAIL_TABLES[existingReport.report_type];
        if (detailTable) {
            await supabaseAdmin
                .from(detailTable)
                .delete()
                .eq('report_id', reportId);
            console.log('[API Sighting Reports DELETE] Deleted details from', detailTable);
        }

        // Delete the main report
        const { error: deleteError } = await supabaseAdmin
            .from('sighting_reports')
            .delete()
            .eq('id', reportId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[API Sighting Reports DELETE] Delete error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
        }

        console.log('[API Sighting Reports DELETE] Report deleted successfully');

        return NextResponse.json({ 
            success: true, 
            message: 'Report deleted successfully' 
        });

    } catch (err) {
        console.error('[API Sighting Reports DELETE] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
