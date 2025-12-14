import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Create a new missing person report
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

        // Handle photo uploads (optional - report can be created without photos in storage)
        const photoUrls = [];
        const photoFiles = formData.getAll('photos');
        
        if (photoFiles && photoFiles.length > 0) {
            console.log('[API Reports] Processing', photoFiles.length, 'photos');
            
            for (const file of photoFiles) {
                if (file && file.size > 0) {
                    try {
                        // Generate unique filename
                        const fileExt = file.name.split('.').pop() || 'jpg';
                        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                        
                        // Convert file to buffer
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        
                        // Upload to Supabase Storage
                        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                            .from('missing-persons-photos')
                            .upload(fileName, buffer, {
                                contentType: file.type || 'image/jpeg',
                                upsert: false
                            });
                        
                        if (uploadError) {
                            console.error('[API Reports] Photo upload error:', uploadError.message);
                            // If bucket doesn't exist or other storage error, continue without photos
                            // The report will still be created, just without photos in storage
                        } else {
                            // Get public URL
                            const { data: urlData } = supabaseAdmin.storage
                                .from('missing-persons-photos')
                                .getPublicUrl(fileName);
                            
                            if (urlData?.publicUrl) {
                                photoUrls.push(urlData.publicUrl);
                                console.log('[API Reports] Photo uploaded:', fileName);
                            }
                        }
                    } catch (photoErr) {
                        console.error('[API Reports] Photo processing error:', photoErr);
                        // Continue with other photos
                    }
                }
            }
        }

        // Insert report into database
        const reportData = {
            user_id: user.id,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            health_status: healthStatus || null,
            health_details: healthDetails || null,
            city: city,
            last_known_location: lastKnownLocation,
            coordinates: coordinates,
            additional_info: additionalInfo || null,
            photos: photoUrls.length > 0 ? photoUrls : null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('[API Reports] Inserting report:', { ...reportData, photos: photoUrls.length + ' photos' });

        const { data: report, error: insertError } = await supabaseAdmin
            .from('missing_persons')
            .insert(reportData)
            .select()
            .single();

        if (insertError) {
            console.error('[API Reports] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create report: ' + insertError.message }, { status: 500 });
        }

        console.log('[API Reports] Report created successfully:', report.id);

        return NextResponse.json({ 
            success: true, 
            report: report 
        }, { status: 201 });

    } catch (err) {
        console.error('[API Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - Get user's missing person reports
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
        console.log('[API Reports GET] Token length:', token?.length);
        
        // Verify user token using admin client
        const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        console.log('[API Reports GET] Auth result:', { 
            hasUser: !!data?.user, 
            userId: data?.user?.id,
            error: authError?.message 
        });
        
        if (authError || !data?.user) {
            console.error('[API Reports GET] Auth error:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
        }

        const user = data.user;
        console.log('[API Reports GET] Fetching reports for user:', user.id);

        // Fetch user's reports
        const { data: reports, error: fetchError } = await supabaseAdmin
            .from('missing_persons')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('[API Reports GET] Fetch error:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
        }

        console.log('[API Reports GET] Found', reports?.length || 0, 'reports');

        return NextResponse.json({ reports: reports || [] });

    } catch (err) {
        console.error('[API Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - Update an existing missing person report
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
        const { reportId, firstName, lastName, dateOfBirth, gender, healthStatus, healthDetails, city, lastKnownLocation, coordinates, additionalInfo, resubmit } = body;

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        // Verify the report belongs to this user and is editable
        const { data: existingReport, error: fetchError } = await supabaseAdmin
            .from('missing_persons')
            .select('*')
            .eq('id', reportId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existingReport) {
            console.error('[API Reports PUT] Report not found or not owned by user');
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Only allow editing pending or rejected reports
        if (existingReport.status === 'approved') {
            return NextResponse.json({ error: 'Cannot edit approved reports' }, { status: 403 });
        }

        // Build update object
        const updateData = {
            first_name: firstName || existingReport.first_name,
            last_name: lastName || existingReport.last_name,
            date_of_birth: dateOfBirth || existingReport.date_of_birth,
            gender: gender || existingReport.gender,
            health_status: healthStatus || existingReport.health_status,
            health_details: healthDetails || existingReport.health_details,
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

        console.log('[API Reports PUT] Updating report:', reportId);

        const { data: updatedReport, error: updateError } = await supabaseAdmin
            .from('missing_persons')
            .update(updateData)
            .eq('id', reportId)
            .select()
            .single();

        if (updateError) {
            console.error('[API Reports PUT] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
        }

        console.log('[API Reports PUT] Report updated successfully');

        return NextResponse.json({ 
            success: true, 
            report: updatedReport 
        });

    } catch (err) {
        console.error('[API Reports PUT] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
