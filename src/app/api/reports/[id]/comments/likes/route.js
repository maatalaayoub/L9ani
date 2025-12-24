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

// POST - Like a comment
export async function POST(request, { params }) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { comment_id } = body;

        if (!comment_id) {
            return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('comment_likes')
            .insert({
                comment_id,
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Already liked' }, { status: 409 });
            }
            console.error('Error liking comment:', error);
            return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
        }

        // Get comment author to send notification
        const { data: comment } = await supabaseAdmin
            .from('report_comments')
            .select('user_id')
            .eq('id', comment_id)
            .single();

        if (comment && comment.user_id !== user.id) {
            // Get liker's profile
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: comment.user_id,
                    type: 'like',
                    title: 'Comment Liked',
                    message: `${profile?.full_name || 'Someone'} liked your comment`,
                    data: {
                        comment_id,
                        actor_id: user.id
                    }
                });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in likes POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Unlike a comment
export async function DELETE(request, { params }) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const comment_id = searchParams.get('comment_id');

        if (!comment_id) {
            return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('comment_likes')
            .delete()
            .eq('comment_id', comment_id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error unliking comment:', error);
            return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in likes DELETE:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
