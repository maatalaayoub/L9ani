import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to get report details based on type
async function getReportDetails(reportId, reportType) {
    const detailTableMap = {
        'person': 'report_details_person',
        'pet': 'report_details_pet',
        'document': 'report_details_document',
        'electronics': 'report_details_electronics',
        'vehicle': 'report_details_vehicle',
        'other': 'report_details_other'
    };
    
    const tableName = detailTableMap[reportType];
    if (!tableName) return null;
    
    try {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('report_id', reportId)
            .maybeSingle();
        
        if (error) {
            console.log(`[API Reports] Error fetching details from ${tableName}:`, error.message);
            return null;
        }
        
        return data;
    } catch (err) {
        console.log(`[API Reports] Exception fetching details:`, err.message);
        return null;
    }
}

// POST - Create a new person report (legacy endpoint - for backward compatibility)
// Note: New reports should use /api/reports with report_type specified
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

        console.log('[API Reports POST] Creating person report for user:', user.id);

        // Parse form data
        const formData = await request.formData();
        
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const dateOfBirth = formData.get('dateOfBirth') || null;
        const gender = formData.get('gender') || null;
        const healthStatus = formData.get('healthStatus') || null;
        const healthDetails = formData.get('healthDetails') || null;
        const city = formData.get('city');
        const lastKnownLocation = formData.get('lastKnownLocation');
        const coordinatesStr = formData.get('coordinates');
        const additionalInfo = formData.get('additionalInfo') || null;

        // Validate required fields
        if (!firstName || !lastName || !city || !lastKnownLocation) {
            return NextResponse.json({ 
                error: 'Missing required fields: firstName, lastName, city, lastKnownLocation' 
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

        // Handle photo uploads - using new unified bucket
        const photoUrls = [];
        const photoFiles = formData.getAll('photos');
        const STORAGE_BUCKET = 'reports-photos';
        
        if (photoFiles && photoFiles.length > 0) {
            console.log('[API Reports] Processing', photoFiles.length, 'photos');
            
            for (const file of photoFiles) {
                if (file && file.size > 0) {
                    try {
                        const fileExt = file.name.split('.').pop() || 'jpg';
                        // Organize by: person/userId/timestamp-random.ext
                        const fileName = `person/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                        
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

        // Insert into modular reports table
        const reportData = {
            user_id: user.id,
            report_type: 'person',
            city: city,
            last_known_location: lastKnownLocation,
            coordinates: coordinates,
            additional_info: additionalInfo || null,
            photos: photoUrls.length > 0 ? photoUrls : null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('[API Reports] Inserting report into reports table');

        const { data: report, error: insertError } = await supabaseAdmin
            .from('reports')
            .insert(reportData)
            .select()
            .single();

        if (insertError) {
            console.error('[API Reports] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create report: ' + insertError.message }, { status: 500 });
        }

        // Insert person details
        const personDetails = {
            report_id: report.id,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            health_status: healthStatus || null,
            health_details: healthDetails || null
        };

        const { error: detailsError } = await supabaseAdmin
            .from('report_details_person')
            .insert(personDetails);

        if (detailsError) {
            console.error('[API Reports] Person details insert error:', detailsError);
            // Delete the main report since details failed
            await supabaseAdmin.from('reports').delete().eq('id', report.id);
            return NextResponse.json({ error: 'Failed to create report details' }, { status: 500 });
        }

        console.log('[API Reports] Report created successfully:', report.id);

        return NextResponse.json({ 
            success: true, 
            report: { ...report, first_name: firstName, last_name: lastName }
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
        console.log('[API Reports GET] Auth header exists:', !!authHeader);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[API Reports GET] No authorization header or wrong format');
            return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify user token using admin client
        const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !data?.user) {
            console.error('[API Reports GET] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
        }

        const user = data.user;
        console.log('[API Reports GET] Fetching reports for user:', user.id);

        // Fetch from reports table
        const { data: reports, error: reportsError } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (reportsError) {
            console.error('[API Reports GET] Error fetching reports:', reportsError.message);
            return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
        }

        // Fetch details for each report based on type
        const reportsWithDetails = await Promise.all(
            (reports || []).map(async (report) => {
                const details = await getReportDetails(report.id, report.report_type);
                return {
                    ...report,
                    details: details || {},
                    // Flatten for backward compatibility with my-report page
                    first_name: details?.first_name || details?.pet_name || details?.item_name || details?.brand || null,
                    last_name: details?.last_name || details?.model || null,
                    date_of_birth: details?.date_of_birth || null,
                    gender: details?.gender || null,
                    health_status: details?.health_status || null,
                    health_details: details?.health_details || null,
                };
            })
        );

        console.log('[API Reports GET] Total reports:', reportsWithDetails.length);

        return NextResponse.json({ reports: reportsWithDetails });

    } catch (err) {
        console.error('[API Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - Update an existing report
export async function PUT(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Reports PUT] supabaseAdmin is not configured');
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
            console.error('[API Reports PUT] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();
        const { 
            reportId, 
            reportType,
            // Common fields
            city, 
            lastKnownLocation, 
            coordinates, 
            additionalInfo, 
            resubmit,
            // Person fields
            firstName, 
            lastName, 
            dateOfBirth, 
            gender, 
            healthStatus, 
            healthDetails,
            // Pet fields
            petName,
            petType,
            petBreed,
            petColor,
            petSize,
            // Document fields
            documentType,
            documentNumber,
            documentIssuer,
            ownerName,
            // Electronics fields
            deviceType,
            deviceBrand,
            deviceModel,
            deviceColor,
            serialNumber,
            // Vehicle fields
            vehicleType,
            vehicleBrand,
            vehicleModel,
            vehicleColor,
            vehicleYear,
            licensePlate,
            // Other fields
            itemName,
            itemDescription
        } = body;

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        console.log('[API Reports PUT] Updating report:', reportId, 'for user:', user.id);

        // Find the report
        const { data: existingReport, error: fetchError } = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError || !existingReport) {
            console.error('[API Reports PUT] Report not found or not owned by user');
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Only allow editing pending or rejected reports
        if (existingReport.status === 'approved') {
            return NextResponse.json({ error: 'Cannot edit approved reports' }, { status: 403 });
        }

        // Update main report table
        const updateData = {
            city: city || existingReport.city,
            last_known_location: lastKnownLocation || existingReport.last_known_location,
            coordinates: coordinates || existingReport.coordinates,
            additional_info: additionalInfo || existingReport.additional_info,
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
            .from('reports')
            .update(updateData)
            .eq('id', reportId)
            .select()
            .single();

        if (updateError) {
            console.error('[API Reports PUT] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
        }

        // Update the detail table based on report type
        const detailTableMap = {
            'person': 'report_details_person',
            'pet': 'report_details_pet',
            'document': 'report_details_document',
            'electronics': 'report_details_electronics',
            'vehicle': 'report_details_vehicle',
            'other': 'report_details_other'
        };

        const detailTable = detailTableMap[existingReport.report_type];
        
        if (detailTable) {
            let detailUpdateData = {};
            
            switch (existingReport.report_type) {
                case 'person':
                    detailUpdateData = {
                        first_name: firstName,
                        last_name: lastName,
                        date_of_birth: dateOfBirth || null,
                        gender: gender || null,
                        health_status: healthStatus || null,
                        health_details: healthDetails || null
                    };
                    break;
                case 'pet':
                    detailUpdateData = {
                        pet_name: petName,
                        pet_type: petType,
                        breed: petBreed || null,
                        color: petColor || null,
                        size: petSize || null
                    };
                    break;
                case 'document':
                    detailUpdateData = {
                        document_type: documentType,
                        document_number: documentNumber || null,
                        issuing_authority: documentIssuer || null,
                        owner_name: ownerName || null
                    };
                    break;
                case 'electronics':
                    detailUpdateData = {
                        device_type: deviceType,
                        brand: deviceBrand,
                        model: deviceModel || null,
                        color: deviceColor || null,
                        serial_number: serialNumber || null
                    };
                    break;
                case 'vehicle':
                    detailUpdateData = {
                        vehicle_type: vehicleType,
                        brand: vehicleBrand,
                        model: vehicleModel || null,
                        color: vehicleColor || null,
                        year: vehicleYear || null,
                        plate_number: licensePlate || null
                    };
                    break;
                case 'other':
                    detailUpdateData = {
                        item_name: itemName,
                        description: itemDescription || null
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

        console.log('[API Reports PUT] Report updated successfully');
        return NextResponse.json({ success: true, report: updatedReport });

    } catch (err) {
        console.error('[API Reports PUT] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Delete a report
export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Reports DELETE] supabaseAdmin is not configured');
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
            console.error('[API Reports DELETE] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get report ID from query params
        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('reportId');

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        console.log('[API Reports DELETE] Deleting report:', reportId, 'for user:', user.id);

        // Find the report
        const { data: existingReport, error: fetchError } = await supabaseAdmin
            .from('reports')
            .select('id, user_id, photos, report_type')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError || !existingReport) {
            console.error('[API Reports DELETE] Report not found or not owned by user');
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Delete associated photos from storage if they exist
        const STORAGE_BUCKET = 'reports-photos';
        if (existingReport.photos && existingReport.photos.length > 0) {
            console.log('[API Reports DELETE] Deleting', existingReport.photos.length, 'photos');
            for (const photoUrl of existingReport.photos) {
                try {
                    // Extract file path from URL (handles both old and new bucket names)
                    let filePath = null;
                    if (photoUrl.includes('/reports-photos/')) {
                        filePath = photoUrl.split('/reports-photos/')[1];
                    } else if (photoUrl.includes('/missing-persons-photos/')) {
                        // Handle old bucket format for backward compatibility
                        filePath = photoUrl.split('/missing-persons-photos/')[1];
                    }
                    if (filePath) {
                        await supabaseAdmin.storage
                            .from(STORAGE_BUCKET)
                            .remove([filePath]);
                        console.log('[API Reports DELETE] Deleted photo:', filePath);
                    }
                } catch (photoErr) {
                    console.error('[API Reports DELETE] Error deleting photo:', photoErr);
                }
            }
        }

        // Delete from detail table first (due to foreign key constraint)
        const detailTableMap = {
            'person': 'report_details_person',
            'pet': 'report_details_pet',
            'document': 'report_details_document',
            'electronics': 'report_details_electronics',
            'vehicle': 'report_details_vehicle',
            'other': 'report_details_other'
        };
        
        const detailTable = detailTableMap[existingReport.report_type];
        if (detailTable) {
            await supabaseAdmin
                .from(detailTable)
                .delete()
                .eq('report_id', reportId);
            console.log('[API Reports DELETE] Deleted details from', detailTable);
        }

        // Delete the main report
        const { error: deleteError } = await supabaseAdmin
            .from('reports')
            .delete()
            .eq('id', reportId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[API Reports DELETE] Delete error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
        }

        console.log('[API Reports DELETE] Report deleted successfully');

        return NextResponse.json({ 
            success: true, 
            message: 'Report deleted successfully' 
        });

    } catch (err) {
        console.error('[API Reports DELETE] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
