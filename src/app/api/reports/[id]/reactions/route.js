import { supabaseAdmin, supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Helper to get authenticated user from Authorization header
async function getAuthUser(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return null;
        
        const token = authHeader.split(' ')[1];
        if (!token) return null;
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        
        return user;
    } catch {
        return null;
    }
}

// GET - Get reactions for a report
export async function GET(request, { params }) {
    try {
        const { id: reportId } = params;
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || 'missing';
        const isSighting = source === 'sighting';

        // Get reaction counts
        const column = isSighting ? 'sighting_report_id' : 'report_id';
        
        const { data: reactions, error } = await supabaseAdmin
            .from('report_reactions')
            .select('reaction_type, user_id')
            .eq(column, reportId);

        if (error) {
            console.error('Error fetching reactions:', error);
            return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
        }

        // Group by reaction type
        const counts = {};
        reactions?.forEach(r => {
            counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        });

        // Get current user's reactions
        const user = await getAuthUser(request);
        let userReactions = [];
        
        if (user) {
            userReactions = reactions
                ?.filter(r => r.user_id === user.id)
                .map(r => r.reaction_type) || [];
        }

        return NextResponse.json({
            counts,
            total: reactions?.length || 0,
            userReactions
        });
    } catch (error) {
        console.error('Error in reactions GET:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add a reaction
export async function POST(request, { params }) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id: reportId } = params;
        const body = await request.json();
        const { reaction_type, source = 'missing' } = body;

        if (!reaction_type) {
            return NextResponse.json({ error: 'Reaction type is required' }, { status: 400 });
        }

        const validTypes = ['support', 'prayer', 'hope', 'share', 'seen'];
        if (!validTypes.includes(reaction_type)) {
            return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
        }

        const isSighting = source === 'sighting';
        const insertData = {
            user_id: user.id,
            reaction_type,
            ...(isSighting ? { sighting_report_id: reportId } : { report_id: reportId })
        };

        const { data, error } = await supabaseAdmin
            .from('report_reactions')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            // Check if it's a duplicate constraint violation
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Already reacted with this type' }, { status: 409 });
            }
            console.error('Error adding reaction:', error);
            return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
        }

        // Get report owner to send notification
        const reportTable = isSighting ? 'sighting_reports' : 'reports';
        const { data: report } = await supabaseAdmin
            .from(reportTable)
            .select('user_id')
            .eq('id', reportId)
            .single();

        // Send notification to report owner (if not self)
        if (report && report.user_id !== user.id) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: report.user_id,
                    type: 'reaction',
                    title: reaction_type === 'support' ? 'New Support' : 'New Reaction',
                    message: `Someone showed ${reaction_type} for your report`,
                    data: {
                        report_id: reportId,
                        source,
                        reaction_type,
                        actor_id: user.id
                    }
                });
        }

        return NextResponse.json({ success: true, reaction: data });
    } catch (error) {
        console.error('Error in reactions POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove a reaction
export async function DELETE(request, { params }) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id: reportId } = params;
        const body = await request.json();
        const { reaction_type, source = 'missing' } = body;

        if (!reaction_type) {
            return NextResponse.json({ error: 'Reaction type is required' }, { status: 400 });
        }

        const isSighting = source === 'sighting';
        const column = isSighting ? 'sighting_report_id' : 'report_id';

        const { error } = await supabaseAdmin
            .from('report_reactions')
            .delete()
            .eq(column, reportId)
            .eq('user_id', user.id)
            .eq('reaction_type', reaction_type);

        if (error) {
            console.error('Error removing reaction:', error);
            return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in reactions DELETE:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
