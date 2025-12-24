import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyReportAccepted, notifyReportRejected } from '@/lib/notifications';

// Detail table names mapping
const DETAIL_TABLE_MAP = {
    'person': 'report_details_person',
    'pet': 'report_details_pet',
    'document': 'report_details_document',
    'electronics': 'report_details_electronics',
    'vehicle': 'report_details_vehicle',
    'other': 'report_details_other'
};

// Helper to verify admin status
async function verifyAdmin(userId) {
    if (!userId) {
        console.log('[Admin Reports] verifyAdmin: No userId provided');
        return false;
    }
    
    console.log('[Admin Reports] verifyAdmin: Checking userId:', userId);
    
    if (!supabaseAdmin) {
        console.error('[Admin Reports] verifyAdmin: supabaseAdmin is not configured!');
        return false;
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, auth_user_id, is_active, role')
            .eq('auth_user_id', userId)
            .eq('is_active', true)
            .maybeSingle();
        
        console.log('[Admin Reports] verifyAdmin query result:', { 
            data: data, 
            error: error?.message,
            errorCode: error?.code
        });
        
        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.log('[Admin Reports] verifyAdmin: admin_users table does not exist');
                return true; // Allow legacy behavior
            }
            console.error('[Admin Reports] verifyAdmin error:', error);
            return false;
        }
        
        const isAdmin = !!data;
        console.log('[Admin Reports] verifyAdmin returning:', isAdmin);
        
        return isAdmin;
    } catch (err) {
        console.error('[Admin Reports] verifyAdmin exception:', err);
        return false;
    }
}

// Helper to get report details based on type
async function getReportDetails(reportId, reportType) {
    const tableName = DETAIL_TABLE_MAP[reportType];
    if (!tableName) return null;
    
    try {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('report_id', reportId)
            .maybeSingle();
        
        if (error) {
            console.error(`[Admin Reports] Error fetching details from ${tableName}:`, error);
            return null;
        }
        
        return data;
    } catch (err) {
        console.error(`[Admin Reports] Exception fetching details:`, err);
        return null;
    }
}

// Helper to get a display title for a report based on its type and details
function getReportTitle(reportType, details) {
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

// GET - Fetch all reports for admin
export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const type = searchParams.get('type') || 'missing'; // 'missing' or 'sighting'
        const status = searchParams.get('status') || 'all'; // 'pending', 'approved', 'rejected', 'all'
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';

        console.log('[API Admin Reports] Request params:', { userId, type, status, page, limit, search });

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
            console.log('[API Admin Reports] Searching for:', searchTerm);
            
            // First, get all profiles to search through
            const { data: allProfiles, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('auth_user_id, user_id, username, first_name, last_name');
            
            if (profileError) {
                console.error('[API Admin Reports] Profile fetch error:', profileError);
            }
            
            console.log('[API Admin Reports] Total profiles:', allProfiles?.length || 0);
            if (allProfiles && allProfiles.length > 0) {
                console.log('[API Admin Reports] Sample profile:', allProfiles[0]);
            }
            
            // Filter profiles that match the search term
            const matchingProfiles = (allProfiles || []).filter(profile => {
                // Check username
                const usernameMatch = profile.username && profile.username.toLowerCase().includes(searchTerm);
                // Check first_name
                const firstNameMatch = profile.first_name && profile.first_name.toLowerCase().includes(searchTerm);
                // Check last_name
                const lastNameMatch = profile.last_name && profile.last_name.toLowerCase().includes(searchTerm);
                // Check numeric user_id (convert to string for comparison)
                const userIdMatch = profile.user_id && String(profile.user_id).includes(searchTerm);
                
                return usernameMatch || firstNameMatch || lastNameMatch || userIdMatch;
            });
            
            console.log('[API Admin Reports] Matching profiles:', matchingProfiles.length);
            
            const matchingAuthUserIds = matchingProfiles.map(p => p.auth_user_id).filter(Boolean);
            console.log('[API Admin Reports] Matching auth_user_ids from profiles:', matchingAuthUserIds);

            // Get all reports first, then filter by ID or user_id match
            const { data: allReports, error: allReportsError } = await supabaseAdmin
                .from('reports')
                .select('id, user_id');
            
            if (allReportsError) {
                console.error('[API Admin Reports] Reports fetch error:', allReportsError);
            }
            
            console.log('[API Admin Reports] Total reports found:', allReports?.length || 0);

            // Filter reports that match by report ID, auth user_id, or belong to matching profiles
            reportIds = (allReports || []).filter(report => {
                // Normalize IDs by removing dashes for comparison
                const normalizedSearchTerm = searchTerm.replace(/-/g, '');
                const normalizedReportId = report.id ? report.id.toLowerCase().replace(/-/g, '') : '';
                const normalizedUserId = report.user_id ? report.user_id.toLowerCase().replace(/-/g, '') : '';
                
                // Check if report ID contains the search term (with or without dashes)
                const idMatch = normalizedReportId.includes(normalizedSearchTerm) || 
                               (report.id && report.id.toLowerCase().includes(searchTerm));
                // Check if report's user_id (auth UUID) contains the search term
                const authUserIdMatch = normalizedUserId.includes(normalizedSearchTerm) ||
                                   (report.user_id && report.user_id.toLowerCase().includes(searchTerm));
                // Check if the user_id is in the list of matching profile auth_user_ids (matched by username or numeric user_id)
                const profileMatch = matchingAuthUserIds.includes(report.user_id);
                
                return idMatch || authUserIdMatch || profileMatch;
            }).map(r => r.id);
            
            console.log('[API Admin Reports] Final matching report IDs count:', reportIds.length);
            
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
            .from('reports')
            .select('*', { count: 'exact' });

        // Filter by matching report IDs if search was performed
        if (reportIds) {
            query = query.in('id', reportIds);
        }

        // Filter by status if not 'all'
        if (status !== 'all') {
            query = query.eq('status', status);
        }

        // Order by updated_at descending so resubmitted reports appear at the top
        // This ensures when a rejected report is edited and resubmitted, it shows at the top like a new report
        const { data: reportsData, error: reportsError, count } = await query
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (reportsError) {
            console.error('[API Admin Reports] Error fetching reports:', reportsError);
            return NextResponse.json({ error: reportsError.message }, { status: 500 });
        }

        // Fetch details for each report based on its type, and include user profile
        const reportsWithDetails = await Promise.all(
            (reportsData || []).map(async (report) => {
                const details = await getReportDetails(report.id, report.report_type);
                
                // Fetch user profile for the reporter from 'profiles' table
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
                    // Include reporter info - always include auth user_id as fallback
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

        console.log('[API Admin Reports] Found', count, 'reports');

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
        console.error('[API Admin Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 });
    }
}

// PATCH - Update report status (approve/reject)
export async function PATCH(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const { userId, reportId, action, rejectionReason } = body;

        // Validate required fields
        if (!userId || !reportId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify admin status
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Validate action
        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update the report status
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
            .from('reports')
            .update(updateData)
            .eq('id', reportId)
            .select();

        if (error) {
            console.error('[API Admin Reports PATCH] Error updating report:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const updatedReport = data[0];
        console.log('[API Admin Reports PATCH] Updated report:', reportId, 'to status:', newStatus);

        // Send notification to the report owner
        if (updatedReport.user_id) {
            try {
                // Get report details for the notification title
                const reportDetails = await getReportDetails(reportId, updatedReport.report_type);
                const reportTitle = getReportTitle(updatedReport.report_type, reportDetails) || `Report #${reportId.slice(0, 8)}`;

                if (action === 'approve') {
                    await notifyReportAccepted(updatedReport.user_id, reportId, reportTitle);
                    console.log('[API Admin Reports PATCH] Sent approval notification to user:', updatedReport.user_id);
                } else if (action === 'reject') {
                    await notifyReportRejected(updatedReport.user_id, reportId, reportTitle, { reason: rejectionReason });
                    console.log('[API Admin Reports PATCH] Sent rejection notification to user:', updatedReport.user_id);
                }
            } catch (notifyErr) {
                // Don't fail the request if notification fails
                console.error('[API Admin Reports PATCH] Error sending notification:', notifyErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Report ${newStatus} successfully`,
            report: updatedReport
        });
    } catch (err) {
        console.error('[API Admin Reports PATCH] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 });
    }
}

// DELETE - Delete a report
export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const reportId = searchParams.get('reportId');

        // Validate required fields
        if (!userId || !reportId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('[API Admin Reports DELETE] Params:', { userId, reportId });

        // Verify admin status
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // First get the report to know its type (for deleting from detail table)
        const { data: report, error: fetchError } = await supabaseAdmin
            .from('reports')
            .select('id, report_type, photos')
            .eq('id', reportId)
            .maybeSingle();

        if (fetchError || !report) {
            console.error('[API Admin Reports DELETE] Report not found');
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Delete associated photos from storage if they exist
        const STORAGE_BUCKET = 'reports-photos';
        if (report.photos && report.photos.length > 0) {
            console.log('[API Admin Reports DELETE] Deleting', report.photos.length, 'photos');
            for (const photoUrl of report.photos) {
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
                    }
                } catch (photoErr) {
                    console.error('[API Admin Reports DELETE] Error deleting photo:', photoErr);
                }
            }
        }

        // Delete associated comments
        const { error: commentsError } = await supabaseAdmin
            .from('report_comments')
            .delete()
            .eq('report_id', reportId);
        if (commentsError) {
            console.error('[API Admin Reports DELETE] Error deleting comments:', commentsError);
        } else {
            console.log('[API Admin Reports DELETE] Deleted associated comments');
        }

        // Delete associated reactions
        const { error: reactionsError } = await supabaseAdmin
            .from('report_reactions')
            .delete()
            .eq('report_id', reportId);
        if (reactionsError) {
            console.error('[API Admin Reports DELETE] Error deleting reactions:', reactionsError);
        } else {
            console.log('[API Admin Reports DELETE] Deleted associated reactions');
        }

        // Delete associated notifications
        const { error: notificationsError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .filter('data->>reportId', 'eq', reportId);
        if (notificationsError) {
            console.error('[API Admin Reports DELETE] Error deleting notifications:', notificationsError);
        } else {
            console.log('[API Admin Reports DELETE] Deleted associated notifications');
        }

        // Delete from detail table first (due to foreign key constraint)
        const detailTable = DETAIL_TABLE_MAP[report.report_type];
        if (detailTable) {
            await supabaseAdmin
                .from(detailTable)
                .delete()
                .eq('report_id', reportId);
            console.log('[API Admin Reports DELETE] Deleted details from', detailTable);
        }

        // Delete the main report
        const { error: deleteError } = await supabaseAdmin
            .from('reports')
            .delete()
            .eq('id', reportId);

        if (deleteError) {
            console.error('[API Admin Reports DELETE] Error deleting report:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        console.log('[API Admin Reports DELETE] Report deleted:', reportId);

        return NextResponse.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (err) {
        console.error('[API Admin Reports DELETE] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
