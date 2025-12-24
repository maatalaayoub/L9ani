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

// Helper to get user profile
async function getUserProfile(userId) {
    const { data } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('auth_user_id', userId)
        .single();
    
    if (data) {
        // Construct full_name from first_name and last_name
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
        return {
            full_name: fullName || 'Anonymous',
            avatar_url: data.avatar_url
        };
    }
    return data;
}

// GET - Get comments for a report with nested replies
export async function GET(request, { params }) {
    try {
        // Check if supabaseAdmin is available
        if (!supabaseAdmin) {
            console.error('Error: supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
        }

        const { id: reportId } = await params;
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || 'missing';
        const isSighting = source === 'sighting';
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        const column = isSighting ? 'sighting_report_id' : 'report_id';

        // Get top-level comments first
        const { data: comments, error, count } = await supabaseAdmin
            .from('report_comments')
            .select(`
                id,
                content,
                user_id,
                parent_comment_id,
                is_deleted,
                is_edited,
                created_at,
                updated_at
            `, { count: 'exact' })
            .eq(column, reportId)
            .is('parent_comment_id', null) // Only top-level comments
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching comments:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            return NextResponse.json({ 
                error: 'Failed to fetch comments',
                details: error.message,
                code: error.code
            }, { status: 500 });
        }

        // Get replies for all top-level comments
        const commentIds = comments?.map(c => c.id) || [];
        let replies = [];
        
        if (commentIds.length > 0) {
            const { data: replyData } = await supabaseAdmin
                .from('report_comments')
                .select(`
                    id,
                    content,
                    user_id,
                    parent_comment_id,
                    is_deleted,
                    is_edited,
                    created_at,
                    updated_at
                `)
                .in('parent_comment_id', commentIds)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });
            
            replies = replyData || [];
        }

        // Get likes count for all comments
        const allCommentIds = [...commentIds, ...replies.map(r => r.id)];
        let likesMap = {};
        
        if (allCommentIds.length > 0) {
            const { data: likes } = await supabaseAdmin
                .from('comment_likes')
                .select('comment_id')
                .in('comment_id', allCommentIds);
            
            likes?.forEach(like => {
                likesMap[like.comment_id] = (likesMap[like.comment_id] || 0) + 1;
            });
        }

        // Get current user's likes
        const user = await getAuthUser(request);
        let userLikes = [];
        
        if (user && allCommentIds.length > 0) {
            const { data: userLikesData } = await supabaseAdmin
                .from('comment_likes')
                .select('comment_id')
                .eq('user_id', user.id)
                .in('comment_id', allCommentIds);
            
            userLikes = userLikesData?.map(l => l.comment_id) || [];
        }

        // Get user profiles for all commenters
        const userIds = [...new Set([
            ...comments?.map(c => c.user_id) || [],
            ...replies.map(r => r.user_id)
        ])];
        
        let profilesMap = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('auth_user_id, first_name, last_name, avatar_url')
                .in('auth_user_id', userIds);
            
            profiles?.forEach(p => {
                const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
                profilesMap[p.auth_user_id] = {
                    full_name: fullName || 'Anonymous',
                    avatar_url: p.avatar_url
                };
            });
        }

        // Build nested structure
        const enrichedComments = comments?.map(comment => ({
            ...comment,
            user: profilesMap[comment.user_id] || { full_name: 'Anonymous', avatar_url: null },
            likes_count: likesMap[comment.id] || 0,
            is_liked: userLikes.includes(comment.id),
            replies: replies
                .filter(r => r.parent_comment_id === comment.id)
                .map(reply => ({
                    ...reply,
                    user: profilesMap[reply.user_id] || { full_name: 'Anonymous', avatar_url: null },
                    likes_count: likesMap[reply.id] || 0,
                    is_liked: userLikes.includes(reply.id)
                }))
        })) || [];

        return NextResponse.json({
            comments: enrichedComments,
            total: count || 0,
            limit,
            offset,
            hasMore: offset + limit < (count || 0)
        });
    } catch (error) {
        console.error('Error in comments GET:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

// POST - Add a new comment or reply
export async function POST(request, { params }) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id: reportId } = await params;
        const body = await request.json();
        const { content, parent_comment_id, source = 'missing' } = body;

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
        }

        if (content.length > 2000) {
            return NextResponse.json({ error: 'Comment is too long (max 2000 characters)' }, { status: 400 });
        }

        const isSighting = source === 'sighting';
        const insertData = {
            content: content.trim(),
            user_id: user.id,
            parent_comment_id: parent_comment_id || null,
            ...(isSighting ? { sighting_report_id: reportId } : { report_id: reportId })
        };

        const { data: comment, error } = await supabaseAdmin
            .from('report_comments')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error adding comment:', error);
            return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
        }

        // Get user profile
        const profile = await getUserProfile(user.id);

        // Send notifications
        const reportTable = isSighting ? 'sighting_reports' : 'reports';
        const { data: report } = await supabaseAdmin
            .from(reportTable)
            .select('user_id')
            .eq('id', reportId)
            .single();

        // Notify report owner (if not self)
        if (report && report.user_id !== user.id) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: report.user_id,
                    type: 'comment',
                    title: 'New Comment',
                    message: `${profile?.full_name || 'Someone'} commented on your report`,
                    data: {
                        report_id: reportId,
                        source,
                        comment_id: comment.id,
                        actor_id: user.id
                    }
                });
        }

        // If this is a reply, notify the parent comment author
        if (parent_comment_id) {
            const { data: parentComment } = await supabaseAdmin
                .from('report_comments')
                .select('user_id')
                .eq('id', parent_comment_id)
                .single();

            if (parentComment && parentComment.user_id !== user.id) {
                await supabaseAdmin
                    .from('notifications')
                    .insert({
                        user_id: parentComment.user_id,
                        type: 'reply',
                        title: 'New Reply',
                        message: `${profile?.full_name || 'Someone'} replied to your comment`,
                        data: {
                            report_id: reportId,
                            source,
                            comment_id: comment.id,
                            parent_comment_id,
                            actor_id: user.id
                        }
                    });
            }
        }

        return NextResponse.json({
            success: true,
            comment: {
                ...comment,
                user: profile || { full_name: 'Anonymous', avatar_url: null },
                likes_count: 0,
                is_liked: false,
                replies: []
            }
        });
    } catch (error) {
        console.error('Error in comments POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update a comment
export async function PUT(request, { params }) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { comment_id, content } = body;

        if (!comment_id) {
            return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
        }

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
        }

        // Check ownership
        const { data: existingComment } = await supabaseAdmin
            .from('report_comments')
            .select('user_id')
            .eq('id', comment_id)
            .single();

        if (!existingComment || existingComment.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to edit this comment' }, { status: 403 });
        }

        const { data: comment, error } = await supabaseAdmin
            .from('report_comments')
            .update({ content: content.trim() })
            .eq('id', comment_id)
            .select()
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
        }

        return NextResponse.json({ success: true, comment });
    } catch (error) {
        console.error('Error in comments PUT:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Soft delete a comment
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

        // Check ownership
        const { data: existingComment } = await supabaseAdmin
            .from('report_comments')
            .select('user_id')
            .eq('id', comment_id)
            .single();

        if (!existingComment || existingComment.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
        }

        // Soft delete
        const { error } = await supabaseAdmin
            .from('report_comments')
            .update({ 
                is_deleted: true,
                deleted_at: new Date().toISOString()
            })
            .eq('id', comment_id);

        if (error) {
            console.error('Error deleting comment:', error);
            return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in comments DELETE:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
