import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyReportAccepted, notifyReportRejected } from '@/lib/notifications';

// Detail table names mapping for sighting reports
const SIGHTING_DETAIL_TABLE_MAP = {
    'person': 'sighting_details_person',
    'pet': 'sighting_details_pet',
    'document': 'sighting_details_document',
    'electronics': 'sighting_details_electronics',
    'vehicle': 'sighting_details_vehicle',
    'other': 'sighting_details_other'
};

// Helper to verify admin status
async function verifyAdmin(userId) {
    if (!userId) {
        console.log('[Admin Sighting Reports] verifyAdmin: No userId provided');
        return false;
    }
    
    console.log('[Admin Sighting Reports] verifyAdmin: Checking userId:', userId);
    
    if (!supabaseAdmin) {
        console.error('[Admin Sighting Reports] verifyAdmin: supabaseAdmin is not configured!');
        return false;
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, auth_user_id, is_active, role')
            .eq('auth_user_id', userId)
            .eq('is_active', true)
            .maybeSingle();
        
        console.log('[Admin Sighting Reports] verifyAdmin query result:', { 
            data: data, 
            error: error?.message,
            errorCode: error?.code
        });
        
        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.log('[Admin Sighting Reports] verifyAdmin: admin_users table does not exist');
                return true; // Allow legacy behavior
            }
            console.error('[Admin Sighting Reports] verifyAdmin error:', error);
            return false;
        }
        
        const isAdmin = !!data;
        console.log('[Admin Sighting Reports] verifyAdmin returning:', isAdmin);
        
        return isAdmin;
    } catch (err) {
        console.error('[Admin Sighting Reports] verifyAdmin exception:', err);
        return false;
    }
}

// Helper to get sighting report details based on type
async function getSightingReportDetails(reportId, reportType) {
    const tableName = SIGHTING_DETAIL_TABLE_MAP[reportType];
    if (!tableName) return null;
    
    try {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('report_id', reportId)
            .maybeSingle();
        
        if (error) {
            console.error(`[Admin Sighting Reports] Error fetching details from ${tableName}:`, error);
            return null;
        }
        
        return data;
    } catch (err) {
        console.error(`[Admin Sighting Reports] Exception fetching details:`, err);
        return null;
    }
}

// Helper to get a display title for a sighting report based on its type and details
function getSightingReportTitle(reportType, details) {
    if (!details) return null;
    
    switch (reportType) {
        case 'person':
            return [details.first_name, details.last_name].filter(Boolean).join(' ') || null;
        case 'pet':
            return details.pet_name || null;
        case 'document':
            return details.document_type || null;
        case 'electronics':
            return [details.brand, details.model].filter(Boolean).join(' ') || null;
        case 'vehicle':
            return [details.brand, details.model].filter(Boolean).join(' ') || null;
        case 'other':
            return details.item_name || null;
        default:
            return null;
    }
}

// GET - Fetch all sighting reports for admin
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Sighting Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';

        console.log('[API Admin Sighting Reports] Request params:', { userId, status, page, limit, search });

        // Verify admin status
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const offset = (page - 1) * limit;

        // If search is provided, we need to search across reports and profiles
        let reportIds = null;
        if (search.trim()) {
            const searchTerm = search.trim().toLowerCase();
            console.log('[API Admin Sighting Reports] Searching for:', searchTerm);
            
            // First, get all profiles to search through
            const { data: allProfiles, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('auth_user_id, user_id, username, first_name, last_name');
            
            if (profileError) {
                console.error('[API Admin Sighting Reports] Profile fetch error:', profileError);
            }
            
            // Filter profiles that match the search term
            const matchingProfiles = (allProfiles || []).filter(profile => {
                const usernameMatch = profile.username && profile.username.toLowerCase().includes(searchTerm);
                const firstNameMatch = profile.first_name && profile.first_name.toLowerCase().includes(searchTerm);
                const lastNameMatch = profile.last_name && profile.last_name.toLowerCase().includes(searchTerm);
                const userIdMatch = profile.user_id && String(profile.user_id).includes(searchTerm);
                
                return usernameMatch || firstNameMatch || lastNameMatch || userIdMatch;
            });
            
            const matchingAuthUserIds = matchingProfiles.map(p => p.auth_user_id).filter(Boolean);

            // Get all sighting reports first, then filter
            const { data: allReports, error: allReportsError } = await supabaseAdmin
                .from('sighting_reports')
                .select('id, user_id');
            
            if (allReportsError) {
                console.error('[API Admin Sighting Reports] Reports fetch error:', allReportsError);
            }

            // Filter reports that match by report ID, auth user_id, or belong to matching profiles
            reportIds = (allReports || []).filter(report => {
                const normalizedSearchTerm = searchTerm.replace(/-/g, '');
                const normalizedReportId = report.id ? report.id.toLowerCase().replace(/-/g, '') : '';
                const normalizedUserId = report.user_id ? report.user_id.toLowerCase().replace(/-/g, '') : '';
                
                const idMatch = normalizedReportId.includes(normalizedSearchTerm) || 
                               (report.id && report.id.toLowerCase().includes(searchTerm));
                const authUserIdMatch = normalizedUserId.includes(normalizedSearchTerm) ||
                                   (report.user_id && report.user_id.toLowerCase().includes(searchTerm));
                const profileMatch = matchingAuthUserIds.includes(report.user_id);
                
                return idMatch || authUserIdMatch || profileMatch;
            }).map(r => r.id);
            
            // If no matching reports found, return empty
            if (reportIds.length === 0) {
                return NextResponse.json({
                    reports: [],
                    pagination: {
                        total: 0,
                        page,
                        limit,
                        totalPages: 0
                    }
                });
            }
        }

        // Build query
        let query = supabaseAdmin
            .from('sighting_reports')
            .select('*', { count: 'exact' });

        // Filter by matching report IDs if search was performed
        if (reportIds) {
            query = query.in('id', reportIds);
        }

        // Filter by status if not 'all'
        if (status !== 'all') {
            query = query.eq('status', status);
        }

        // Order by updated_at descending
        const { data: reportsData, error: reportsError, count } = await query
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (reportsError) {
            console.error('[API Admin Sighting Reports] Error fetching reports:', reportsError);
            return NextResponse.json({ error: reportsError.message }, { status: 500 });
        }

        // Fetch details for each report based on its type, and include user profile
        const reportsWithDetails = await Promise.all(
            (reportsData || []).map(async (report) => {
                const details = await getSightingReportDetails(report.id, report.report_type);
                
                // Fetch user profile for the reporter
                let userProfile = null;
                if (report.user_id) {
                    const { data: profileData, error: profileError } = await supabaseAdmin
                        .from('profiles')
                        .select('user_id, auth_user_id, username, first_name, last_name, avatar_url, email, phone, created_at, email_verified')
                        .eq('auth_user_id', report.user_id)
                        .maybeSingle();
                    
                    if (!profileError && profileData) {
                        userProfile = profileData;
                    }
                }
                
                return {
                    ...report,
                    details: details || {},
                    // Flatten common fields for display compatibility
                    first_name: details?.first_name || details?.pet_name || details?.item_name || details?.brand || null,
                    last_name: details?.last_name || details?.model || null,
                    // Include reporter info
                    reporter: {
                        auth_id: report.user_id,
                        user_id: userProfile?.user_id || null,
                        username: userProfile?.username || null,
                        name: userProfile ? ([userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || userProfile.username) : null,
                        first_name: userProfile?.first_name || null,
                        last_name: userProfile?.last_name || null,
                        profile_picture: userProfile?.avatar_url || null,
                        email: userProfile?.email || null,
                        phone: userProfile?.phone || null,
                        created_at: userProfile?.created_at || null,
                        email_verified: userProfile?.email_verified || false
                    }
                };
            })
        );

        console.log('[API Admin Sighting Reports] Found', count, 'sighting reports');

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
        console.error('[API Admin Sighting Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 });
    }
}

// PATCH - Update sighting report status (approve/reject)
export async function PATCH(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Sighting Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const { userId, reportId, action, rejectionReason } = body;

        console.log('[API Admin Sighting Reports PATCH] Request body:', { userId, reportId, action, rejectionReason: !!rejectionReason });

        // Validate required fields
        if (!userId || !reportId || !action) {
            console.log('[API Admin Sighting Reports PATCH] Missing required fields');
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify admin status
        console.log('[API Admin Sighting Reports PATCH] Verifying admin status for userId:', userId);
        const isAdmin = await verifyAdmin(userId);
        console.log('[API Admin Sighting Reports PATCH] Admin verification result:', isAdmin);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Validate action
        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update the sighting report status
        const updateData = {
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: userId
        };

        // Add rejection reason if rejecting
        if (action === 'reject' && rejectionReason) {
            updateData.rejection_reason = rejectionReason;
        }

        const { data, error } = await supabaseAdmin
            .from('sighting_reports')
            .update(updateData)
            .eq('id', reportId)
            .select();

        if (error) {
            console.error('[API Admin Sighting Reports PATCH] Error updating report:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Sighting report not found' }, { status: 404 });
        }

        const updatedReport = data[0];
        console.log('[API Admin Sighting Reports PATCH] Updated report:', reportId, 'to status:', newStatus);

        // Send notification to the report owner
        if (updatedReport.user_id) {
            try {
                // Get report details for the notification title
                const reportDetails = await getSightingReportDetails(reportId, updatedReport.report_type);
                const reportTitle = getSightingReportTitle(updatedReport.report_type, reportDetails) || `Sighting Report #${reportId.slice(0, 8)}`;

                if (action === 'approve') {
                    await notifyReportAccepted(updatedReport.user_id, reportId, reportTitle);
                    console.log('[API Admin Sighting Reports PATCH] Sent approval notification to user:', updatedReport.user_id);
                } else if (action === 'reject') {
                    await notifyReportRejected(updatedReport.user_id, reportId, reportTitle, { reason: rejectionReason });
                    console.log('[API Admin Sighting Reports PATCH] Sent rejection notification to user:', updatedReport.user_id);
                }
            } catch (notifyErr) {
                // Don't fail the request if notification fails
                console.error('[API Admin Sighting Reports PATCH] Error sending notification:', notifyErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sighting report ${newStatus} successfully`,
            report: updatedReport
        });
    } catch (err) {
        console.error('[API Admin Sighting Reports PATCH] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 });
    }
}

// DELETE - Delete a sighting report
export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Sighting Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const reportId = searchParams.get('reportId');

        // Validate required fields
        if (!userId || !reportId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('[API Admin Sighting Reports DELETE] Params:', { userId, reportId });

        // Verify admin status
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // First get the report to know its type
        const { data: report, error: fetchError } = await supabaseAdmin
            .from('sighting_reports')
            .select('id, report_type, photos')
            .eq('id', reportId)
            .maybeSingle();

        if (fetchError || !report) {
            console.error('[API Admin Sighting Reports DELETE] Report not found');
            return NextResponse.json({ error: 'Sighting report not found' }, { status: 404 });
        }

        // Delete associated photos from storage
        const STORAGE_BUCKET = 'sighting-reports-photos';
        if (report.photos && report.photos.length > 0) {
            console.log('[API Admin Sighting Reports DELETE] Deleting', report.photos.length, 'photos');
            for (const photoUrl of report.photos) {
                try {
                    if (photoUrl.includes('/sighting-reports-photos/')) {
                        const filePath = photoUrl.split('/sighting-reports-photos/')[1];
                        if (filePath) {
                            await supabaseAdmin.storage
                                .from(STORAGE_BUCKET)
                                .remove([filePath]);
                        }
                    }
                } catch (photoErr) {
                    console.error('[API Admin Sighting Reports DELETE] Error deleting photo:', photoErr);
                }
            }
        }

        // Delete from detail table first (due to foreign key constraint)
        const detailTable = SIGHTING_DETAIL_TABLE_MAP[report.report_type];
        if (detailTable) {
            await supabaseAdmin
                .from(detailTable)
                .delete()
                .eq('report_id', reportId);
            console.log('[API Admin Sighting Reports DELETE] Deleted details from', detailTable);
        }

        // Delete the main sighting report
        const { error: deleteError } = await supabaseAdmin
            .from('sighting_reports')
            .delete()
            .eq('id', reportId);

        if (deleteError) {
            console.error('[API Admin Sighting Reports DELETE] Error deleting report:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        console.log('[API Admin Sighting Reports DELETE] Report deleted:', reportId);

        return NextResponse.json({
            success: true,
            message: 'Sighting report deleted successfully'
        });
    } catch (err) {
        console.error('[API Admin Sighting Reports DELETE] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
