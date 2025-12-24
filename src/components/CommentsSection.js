"use client";

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

// Format relative time
function formatRelativeTime(dateString, locale) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} د` : `${diffMins}m`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} س` : `${diffHours}h`;
    if (diffDays < 30) return locale === 'ar' ? `منذ ${diffDays} ي` : `${diffDays}d`;
    
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Single Comment Component
function Comment({ comment, reportId, source, onReply, onDelete, onLike, depth = 0, locale }) {
    const t = useTranslations('reports');
    const { user } = useAuth();
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReplies, setShowReplies] = useState(depth === 0);

    const maxDepth = 2; // Maximum nesting level
    const canReply = depth < maxDepth;
    const isOwner = user?.id === comment.user_id;

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onReply(replyContent, comment.id);
            setReplyContent('');
            setIsReplying(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = () => {
        onLike(comment.id, comment.is_liked);
    };

    return (
        <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-100 dark:border-gray-700' : ''}`}>
            <div className="flex gap-3 py-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {comment.user?.avatar_url ? (
                        <img
                            src={comment.user.avatar_url}
                            alt={comment.user.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {comment.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl px-4 py-3">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                {comment.user?.full_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {formatRelativeTime(comment.created_at, locale)}
                            </span>
                            {comment.is_edited && (
                                <span className="text-xs text-gray-400 italic">
                                    ({t('comments.edited')})
                                </span>
                            )}
                        </div>

                        {/* Comment text */}
                        <p className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
                            {comment.content}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-2 px-2">
                        {/* Like */}
                        <button
                            onClick={handleLike}
                            disabled={!user}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                comment.is_liked 
                                    ? 'text-red-500' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                            } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="w-4 h-4" fill={comment.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                        </button>

                        {/* Reply */}
                        {canReply && user && (
                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                            >
                                {t('comments.reply')}
                            </button>
                        )}

                        {/* Delete (for owner) */}
                        {isOwner && (
                            <button
                                onClick={() => {
                                    if (confirm(t('comments.deleteConfirm'))) {
                                        onDelete(comment.id);
                                    }
                                }}
                                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
                            >
                                {t('comments.delete')}
                            </button>
                        )}
                    </div>

                    {/* Reply Form */}
                    {isReplying && (
                        <form onSubmit={handleSubmitReply} className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={t('comments.placeholder')}
                                className="flex-1 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
                                disabled={isSubmitting}
                            />
                            <button
                                type="submit"
                                disabled={!replyContent.trim() || isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? '...' : t('comments.submit')}
                            </button>
                        </form>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-2">
                            {!showReplies && (
                                <button
                                    onClick={() => setShowReplies(true)}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </button>
                            )}
                            {showReplies && (
                                <div className="space-y-1">
                                    {comment.replies.map(reply => (
                                        <Comment
                                            key={reply.id}
                                            comment={reply}
                                            reportId={reportId}
                                            source={source}
                                            onReply={onReply}
                                            onDelete={onDelete}
                                            onLike={onLike}
                                            depth={depth + 1}
                                            locale={locale}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main Comments Section Component
export default function CommentsSection({ reportId, source = 'missing' }) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const { user, getAccessToken } = useAuth();
    
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const limit = 10;

    // Helper to get auth headers
    const getAuthHeaders = async () => {
        const token = await getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Fetch comments
    const fetchComments = async (reset = false) => {
        try {
            const currentOffset = reset ? 0 : offset;
            const authHeaders = await getAuthHeaders();
            const response = await fetch(
                `/api/reports/${reportId}/comments?source=${source}&limit=${limit}&offset=${currentOffset}`,
                { headers: authHeaders }
            );
            
            if (!response.ok) throw new Error('Failed to fetch comments');
            
            const data = await response.json();
            
            if (reset) {
                setComments(data.comments);
            } else {
                setComments(prev => [...prev, ...data.comments]);
            }
            
            setTotal(data.total);
            setHasMore(data.hasMore);
            setOffset(currentOffset + data.comments.length);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments(true);
    }, [reportId, source]);

    // Add a new comment
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting || !user) return;

        setIsSubmitting(true);
        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`/api/reports/${reportId}/comments`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({
                    content: newComment,
                    source
                })
            });

            if (!response.ok) throw new Error('Failed to add comment');

            const data = await response.json();
            setComments(prev => [data.comment, ...prev]);
            setTotal(prev => prev + 1);
            setNewComment('');
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add a reply
    const handleReply = async (content, parentId) => {
        if (!user) return;

        const authHeaders = await getAuthHeaders();
        const response = await fetch(`/api/reports/${reportId}/comments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                content,
                parent_comment_id: parentId,
                source
            })
        });

        if (!response.ok) throw new Error('Failed to add reply');

        const data = await response.json();
        
        // Add reply to the parent comment
        setComments(prev => prev.map(comment => {
            if (comment.id === parentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), data.comment]
                };
            }
            return comment;
        }));
    };

    // Delete a comment
    const handleDelete = async (commentId) => {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(
            `/api/reports/${reportId}/comments?comment_id=${commentId}`,
            { method: 'DELETE', headers: authHeaders }
        );

        if (!response.ok) throw new Error('Failed to delete comment');

        // Remove from UI
        setComments(prev => prev.filter(c => c.id !== commentId).map(comment => ({
            ...comment,
            replies: comment.replies?.filter(r => r.id !== commentId)
        })));
        setTotal(prev => prev - 1);
    };

    // Like/unlike a comment
    const handleLike = async (commentId, isCurrentlyLiked) => {
        if (!user) return;

        const authHeaders = await getAuthHeaders();
        const method = isCurrentlyLiked ? 'DELETE' : 'POST';
        const url = isCurrentlyLiked 
            ? `/api/reports/${reportId}/comments/likes?comment_id=${commentId}`
            : `/api/reports/${reportId}/comments/likes`;

        const options = {
            method,
            headers: {
                ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
                ...authHeaders
            },
            ...(method === 'POST' ? {
                body: JSON.stringify({ comment_id: commentId })
            } : {})
        };

        const response = await fetch(url, options);
        if (!response.ok) return;

        // Update UI
        const updateLike = (comment) => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    is_liked: !isCurrentlyLiked,
                    likes_count: comment.likes_count + (isCurrentlyLiked ? -1 : 1)
                };
            }
            if (comment.replies) {
                return {
                    ...comment,
                    replies: comment.replies.map(updateLike)
                };
            }
            return comment;
        };

        setComments(prev => prev.map(updateLike));
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        );
    }

    return (
        <div id="comments" className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t('comments.title')}
                    {total > 0 && (
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({total})
                        </span>
                    )}
                </h3>
            </div>

            {/* Add Comment Form */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                {user ? (
                    <form onSubmit={handleAddComment} className="flex gap-3">
                        <div className="flex-shrink-0">
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="You"
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                    {user.email?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={t('comments.placeholder')}
                                className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
                                disabled={isSubmitting}
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                {isSubmitting ? t('comments.submitting') : t('comments.submit')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-2">
                        {t('comments.loginToComment')}
                    </p>
                )}
            </div>

            {/* Comments List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {comments.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">{t('comments.noComments')}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('comments.beFirst')}</p>
                    </div>
                ) : (
                    <div className="px-4 py-2">
                        {comments.map(comment => (
                            <Comment
                                key={comment.id}
                                comment={comment}
                                reportId={reportId}
                                source={source}
                                onReply={handleReply}
                                onDelete={handleDelete}
                                onLike={handleLike}
                                locale={locale}
                            />
                        ))}
                    </div>
                )}

                {/* Load More */}
                {hasMore && (
                    <div className="p-4 text-center">
                        <button
                            onClick={() => fetchComments()}
                            className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                        >
                            {t('loading.more')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
