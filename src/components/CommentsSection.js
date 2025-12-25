"use client";

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

// Confirmation Dialog Component
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false, locale }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Dialog */}
            <div 
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                </div>
                
                {/* Content */}
                <div className="px-6 pb-4">
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {message}
                    </p>
                </div>
                
                {/* Actions */}
                <div className={`px-6 pb-6 flex gap-3 ${locale === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                            isDestructive 
                                ? 'bg-red-500 hover:bg-red-600' 
                                : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

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

// Single Comment Component - Facebook Style
function Comment({ comment, reportId, source, onReply, onDelete, onLike, depth = 0, locale, replyingToId, parentUserName = null, isAdmin = false }) {
    const t = useTranslations('reports');
    const { user } = useAuth();
    const [showReplies, setShowReplies] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const maxDepth = 5; // Allow up to 5 levels of nesting for replies
    const maxVisualDepth = 2; // Only indent visually up to 2 levels to prevent layout breaking
    const isOwner = user?.id === comment.user_id;
    const canDelete = isOwner || isAdmin; // Owner or admin can delete
    const canReply = depth < maxDepth && user; // Can reply if within depth limit and logged in
    const isReplyingToThis = replyingToId === comment.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isAdminDelete = isAdmin && !isOwner;
    
    // Limit visual indentation to prevent layout breaking
    const visualDepth = Math.min(depth, maxVisualDepth);
    const shouldIndent = depth > 0 && depth <= maxVisualDepth;

    const handleLike = () => {
        onLike(comment.id, comment.is_liked);
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        onDelete(comment.id, isAdminDelete);
    };

    // Facebook-style: replies get progressively smaller, capped at visual depth 2
    const isReply = depth > 0;
    const avatarSize = visualDepth === 0 ? 'w-8 h-8' : visualDepth === 1 ? 'w-7 h-7' : 'w-6 h-6';

    return (
        <div className="py-0.5">
            <div className="flex gap-2 items-start">
                {/* Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                    {comment.user?.avatar_url ? (
                        <img
                            src={comment.user.avatar_url}
                            alt={comment.user.full_name}
                            className={`${avatarSize} rounded-full object-cover`}
                        />
                    ) : (
                        <div className={`${avatarSize} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs`}>
                            {comment.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {/* Comment bubble */}
                    <div className={`bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-1.5 ${isReplyingToThis ? 'ring-2 ring-blue-500' : ''}`}>
                        {/* Username */}
                        <span className="font-semibold text-gray-900 dark:text-white text-[13px] block">
                            {comment.user?.full_name || 'Anonymous'}
                        </span>
                        {/* Comment text with @mention */}
                        <span className="text-gray-800 dark:text-gray-200 text-[14px]">
                            {parentUserName && (
                                <span dir="ltr" className="text-blue-500 dark:text-blue-400 font-medium inline-block">@{parentUserName}</span>
                            )}
                            {parentUserName && ' '}
                            {comment.content}
                        </span>
                    </div>

                    {/* Like count badge - positioned next to bubble */}
                    {comment.likes_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 bg-white dark:bg-gray-600 rounded-full px-1 py-0.5 shadow-sm border border-gray-200 dark:border-gray-500 ml-1 align-top">
                            <span className="text-[10px]">👍</span>
                            <span className="text-gray-600 dark:text-gray-300 text-[11px]">{comment.likes_count}</span>
                        </span>
                    )}

                    {/* Actions row - Facebook style: time · Like · Reply */}
                    <div className="flex items-center gap-1 mt-0.5 ml-3 text-[12px]">
                        {/* Time */}
                        <span className="text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(comment.created_at, locale)}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">·</span>

                        {/* Like */}
                        <button
                            onClick={handleLike}
                            disabled={!user}
                            className={`font-semibold transition-colors ${
                                comment.is_liked 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-gray-500 dark:text-gray-400 hover:underline'
                            } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {locale === 'ar' ? 'إعجاب' : 'Like'}
                        </button>
                        <span className="text-gray-400 dark:text-gray-500">·</span>

                        {/* Reply */}
                        {canReply && user && (
                            <>
                                <button
                                    onClick={() => onReply(comment.id, comment.user?.full_name)}
                                    className={`font-semibold transition-colors ${
                                        isReplyingToThis 
                                            ? 'text-blue-600 dark:text-blue-400' 
                                            : 'text-gray-500 dark:text-gray-400 hover:underline'
                                    }`}
                                >
                                    {locale === 'ar' ? 'رد' : 'Reply'}
                                </button>
                                <span className="text-gray-400 dark:text-gray-500">·</span>
                            </>
                        )}

                        {/* Delete (for owner or admin) */}
                        {canDelete && (
                            <button
                                onClick={handleDeleteClick}
                                className={`font-semibold transition-colors ${
                                    isAdminDelete 
                                        ? 'text-red-500 dark:text-red-400 hover:text-red-600 hover:underline' 
                                        : 'text-gray-500 dark:text-gray-400 hover:text-red-500 hover:underline'
                                }`}
                            >
                                {isAdminDelete 
                                    ? (locale === 'ar' ? 'حذف (مشرف)' : 'Delete (Admin)')
                                    : (locale === 'ar' ? 'حذف' : 'Delete')
                                }
                            </button>
                        )}
                    </div>

                    {/* Delete Confirmation Dialog */}
                    <ConfirmDialog
                        isOpen={showDeleteConfirm}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={handleDeleteConfirm}
                        title={locale === 'ar' ? 'حذف التعليق' : 'Delete Comment'}
                        message={
                            isAdminDelete
                                ? (locale === 'ar' ? 'هل أنت متأكد من حذف هذا التعليق كمشرف؟ سيتم حذف التعليق وجميع الردود عليه نهائياً.' : 'Are you sure you want to delete this comment as admin? The comment and all replies will be permanently removed.')
                                : (locale === 'ar' ? 'هل أنت متأكد من حذف هذا التعليق؟ سيتم حذف التعليق وجميع الردود عليه نهائياً.' : 'Are you sure you want to delete this comment? The comment and all replies will be permanently removed.')
                        }
                        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
                        cancelText={locale === 'ar' ? 'إلغاء' : 'Cancel'}
                        isDestructive={true}
                        locale={locale}
                    />

                    {/* Replies - Only indent first level, then flatten */}
                    {hasReplies && (
                        <div className="mt-1 relative">
                            {!showReplies ? (
                                <button
                                    onClick={() => setShowReplies(true)}
                                    className={`flex items-center gap-1 text-[13px] font-semibold text-gray-500 dark:text-gray-400 hover:underline ${depth === 0 ? (locale === 'ar' ? 'mr-6' : 'ml-6') : ''}`}
                                >
                                    <svg className={`w-3 h-3 ${locale === 'ar' ? '-rotate-180 scale-x-[-1]' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    {locale === 'ar' 
                                        ? `${comment.replies.length} ${comment.replies.length === 1 ? 'رد' : 'ردود'}`
                                        : `${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                                    }
                                </button>
                            ) : (
                                <>
                                    {comment.replies.length > 1 && (
                                        <button
                                            onClick={() => setShowReplies(false)}
                                            className={`flex items-center gap-1 text-[13px] font-semibold text-gray-500 dark:text-gray-400 hover:underline mb-1 ${depth === 0 ? (locale === 'ar' ? 'mr-6' : 'ml-6') : ''}`}
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                            </svg>
                                            {locale === 'ar' ? 'إخفاء الردود' : 'Hide replies'}
                                        </button>
                                    )}
                                    <div className="relative">
                                        {/* Only show connection line for first level */}
                                        {depth === 0 && (
                                            <div 
                                                className={`absolute top-0 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-600 ${locale === 'ar' ? 'right-2' : 'left-2'}`}
                                                style={{ height: 'calc(100% - 16px)' }}
                                            />
                                        )}
                                        {comment.replies.map((reply, index) => (
                                            <div 
                                                key={reply.id} 
                                                className={`relative ${depth === 0 ? (locale === 'ar' ? 'mr-6' : 'ml-6') : ''}`}
                                            >
                                                {/* Only show curved connector for first level */}
                                                {depth === 0 && (
                                                    <div className={`absolute top-4 w-3 h-3 border-gray-200 dark:border-gray-600 ${
                                                        locale === 'ar' 
                                                            ? '-right-4 border-r-2 border-b-2 rounded-br-lg' 
                                                            : '-left-4 border-l-2 border-b-2 rounded-bl-lg'
                                                    }`} />
                                                )}
                                                <Comment
                                                    comment={reply}
                                                    reportId={reportId}
                                                    source={source}
                                                    onReply={onReply}
                                                    onDelete={onDelete}
                                                    onLike={onLike}
                                                    depth={depth + 1}
                                                    locale={locale}
                                                    replyingToId={replyingToId}
                                                    parentUserName={comment.user?.full_name}
                                                    isAdmin={isAdmin}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main Comments Section Component
export default function CommentsSection({ reportId, source = 'missing', hideHeader = false }) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const { user, getAccessToken, isAdmin } = useAuth();
    const inputRef = useRef(null);
    
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [replyingTo, setReplyingTo] = useState(null); // { id, name }
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

    // Add a new comment or reply
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
                    source,
                    ...(replyingTo?.id ? { parent_comment_id: replyingTo.id } : {})
                })
            });

            if (!response.ok) throw new Error('Failed to add comment');

            const data = await response.json();
            
            if (replyingTo?.id) {
                // Helper function to recursively add reply at any depth
                const addReplyToComment = (comments) => {
                    return comments.map(comment => {
                        if (comment.id === replyingTo.id) {
                            return {
                                ...comment,
                                replies: [...(comment.replies || []), data.comment]
                            };
                        }
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: addReplyToComment(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                
                setComments(prev => addReplyToComment(prev));
            } else {
                // Add new top-level comment
                setComments(prev => [data.comment, ...prev]);
                setTotal(prev => prev + 1);
            }
            
            setNewComment('');
            setReplyingTo(null);
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Set reply target and focus input
    const handleSetReplyTo = (commentId, userName) => {
        if (replyingTo?.id === commentId) {
            // Toggle off if clicking same comment
            setReplyingTo(null);
        } else {
            setReplyingTo({ id: commentId, name: userName });
            // Focus the input and scroll to it
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    };

    // Cancel reply
    const handleCancelReply = () => {
        setReplyingTo(null);
        setNewComment('');
    };

    // Helper function to recursively delete a comment at any depth
    const deleteCommentRecursive = (comments, commentId) => {
        return comments
            .filter(c => c.id !== commentId)
            .map(comment => ({
                ...comment,
                replies: comment.replies ? deleteCommentRecursive(comment.replies, commentId) : []
            }));
    };

    // Delete a comment (supports admin deletion)
    const handleDelete = async (commentId, isAdminDelete = false) => {
        const authHeaders = await getAuthHeaders();
        const url = `/api/reports/${reportId}/comments?comment_id=${commentId}${isAdminDelete ? '&admin=true' : ''}`;
        const response = await fetch(url, { method: 'DELETE', headers: authHeaders });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete comment');
        }

        // Remove from UI at any nesting level
        setComments(prev => deleteCommentRecursive(prev, commentId));
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

        // Update UI recursively at any depth
        const updateLikeRecursive = (comments) => {
            return comments.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        is_liked: !isCurrentlyLiked,
                        likes_count: (comment.likes_count || 0) + (isCurrentlyLiked ? -1 : 1)
                    };
                }
                if (comment.replies && comment.replies.length > 0) {
                    return {
                        ...comment,
                        replies: updateLikeRecursive(comment.replies)
                    };
                }
                return comment;
            });
        };

        setComments(prev => updateLikeRecursive(prev));
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        );
    }

    return (
        <div id="comments" className={`bg-white dark:bg-gray-800 ${hideHeader ? 'flex flex-col h-full min-h-0' : 'overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700'}`}>
            {/* Header - Facebook style (hidden when in dialog) */}
            {!hideHeader && (
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">
                        {t('comments.title')}
                        {total > 0 && (
                            <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                                ({total})
                            </span>
                        )}
                    </h3>
                </div>
            )}

            {/* Comments List - Tighter spacing like Facebook */}
            <div className={hideHeader ? 'flex-1 min-h-0 overflow-auto' : ''}>
                {comments.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('comments.noComments')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('comments.beFirst')}</p>
                    </div>
                ) : (
                    <div className="py-2 px-4">
                        {comments.map(comment => (
                            <Comment
                                key={comment.id}
                                comment={comment}
                                reportId={reportId}
                                source={source}
                                onReply={handleSetReplyTo}
                                onDelete={handleDelete}
                                onLike={handleLike}
                                locale={locale}
                                replyingToId={replyingTo?.id}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                )}

                {/* Load More - Facebook style */}
                {hasMore && (
                    <div className="px-4 pb-2">
                        <button
                            onClick={() => fetchComments()}
                            className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            {locale === 'ar' ? 'عرض المزيد من التعليقات...' : 'View more comments...'}
                        </button>
                    </div>
                )}
            </div>

            {/* Add Comment Form - Facebook style - Fixed at bottom when in dialog */}
            <div className={`px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${hideHeader ? 'flex-shrink-0' : ''}`}>
                {user ? (
                    <div>
                        {/* Reply indicator - minimal style */}
                        {replyingTo && (
                            <div className="flex items-center gap-2 mb-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">
                                    {locale === 'ar' ? 'الرد على' : 'Replying to'}
                                </span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {replyingTo.name}
                                </span>
                                <button
                                    onClick={handleCancelReply}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-auto"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                {user.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="You"
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                                        {user.email?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            {/* Input - Facebook bubble style */}
                            <div className="flex-1 relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={replyingTo 
                                        ? (locale === 'ar' ? `اكتب ردًا...` : `Write a reply...`)
                                        : (locale === 'ar' ? 'اكتب تعليقًا...' : 'Write a comment...')
                                    }
                                    className={`w-full py-2 text-[15px] bg-gray-100 dark:bg-gray-700 border-0 rounded-full focus:ring-0 outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${locale === 'ar' ? 'pr-4 pl-10' : 'pl-4 pr-10'}`}
                                    disabled={isSubmitting}
                                />
                                {/* Send button inside input */}
                                {newComment.trim() && (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`absolute top-1/2 -translate-y-1/2 p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50 ${locale === 'ar' ? 'left-2' : 'right-2'}`}
                                    >
                                        <svg className={`w-5 h-5 ${locale === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-1">
                        {t('comments.loginToComment')}
                    </p>
                )}
            </div>
        </div>
    );
}
