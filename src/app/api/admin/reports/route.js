import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to verify admin status
async function verifyAdmin(userId) {
    if (!userId) return false;
    
    const { data } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('is_active', true)
        .single();
    
    return !!data;
}

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

        // Verify admin status
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const offset = (page - 1) * limit;
        const tableName = type === 'sighting' ? 'sightings' : 'missing_persons';

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
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

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
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
