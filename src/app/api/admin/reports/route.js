import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to verify admin status
async function verifyAdmin(userId) {
    if (!userId) {
        console.log('[Admin Reports] verifyAdmin: No userId provided');
        return false;
    }
    
    console.log('[Admin Reports] verifyAdmin: Checking userId:', userId);
    console.log('[Admin Reports] verifyAdmin: supabaseAdmin exists:', !!supabaseAdmin);
    
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

export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error - supabaseAdmin not configured' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const type = searchParams.get('type') || 'missing'; // 'missing' or 'sighting'
        const status = searchParams.get('status') || 'all'; // 'pending', 'approved', 'rejected', 'all'
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        console.log('[API Admin Reports] Request params:', { userId, type, status, page, limit });

        // Verify admin status
        let isAdmin = false;
        try {
            isAdmin = await verifyAdmin(userId);
        } catch (adminErr) {
            console.error('[API Admin Reports] Error verifying admin:', adminErr);
            // If admin_users table doesn't exist, return helpful error
            if (adminErr.message?.includes('does not exist')) {
                return NextResponse.json({ 
                    error: 'Database tables not set up. Please run the migration SQL in Supabase.',
                    details: 'admin_users table not found'
                }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
        }

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const offset = (page - 1) * limit;
        const tableName = type === 'sighting' ? 'sightings' : 'missing_persons';

        console.log('[API Admin Reports] Querying table:', tableName);

        // Build query
        let query = supabaseAdmin
            .from(tableName)
            .select('*', { count: 'exact' });

        // Filter by status if not 'all'
        if (status !== 'all') {
            query = query.eq('status', status);
        }

        // Order by created_at descending (newest first) and paginate
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[API Admin Reports] Error fetching reports:', error);
            // Check if table doesn't exist
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                return NextResponse.json({ 
                    error: `Database table "${tableName}" not found. Please run the migration SQL in Supabase.`,
                    details: error.message
                }, { status: 500 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[API Admin Reports] Found', count, 'reports');

        return NextResponse.json({
            reports: data || [],
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

export async function PATCH(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const { userId, reportId, type, action, rejectionReason } = body;

        // Validate required fields
        if (!userId || !reportId || !type || !action) {
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

        const tableName = type === 'sighting' ? 'sightings' : 'missing_persons';
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
            .from(tableName)
            .update(updateData)
            .eq('id', reportId)
            .select()
            .single();

        if (error) {
            console.error('[API Admin Reports] Error updating report:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Report ${newStatus} successfully`,
            report: data
        });
    } catch (err) {
        console.error('[API Admin Reports] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Admin Reports] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const reportId = searchParams.get('reportId');
        const type = searchParams.get('type') || 'missing';

        // Validate required fields
        if (!userId || !reportId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('[API Admin Reports DELETE] Params:', { userId, reportId, type });

        // Verify admin status
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const tableName = type === 'sighting' ? 'sightings' : 'missing_persons';

        // Delete the report
        const { error } = await supabaseAdmin
            .from(tableName)
            .delete()
            .eq('id', reportId);

        if (error) {
            console.error('[API Admin Reports DELETE] Error deleting report:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[API Admin Reports DELETE] Report deleted successfully:', reportId);

        return NextResponse.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (err) {
        console.error('[API Admin Reports DELETE] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
