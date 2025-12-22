/**
 * Notification Service
 * 
 * Centralized service for creating and managing notifications.
 * Uses Supabase service role for server-side operations.
 * 
 * @module lib/notifications
 */

import { supabaseAdmin } from './supabase';

// =====================================================
// NOTIFICATION TYPES (Constants)
// =====================================================

export const NotificationType = {
    // Report-related notifications
    REPORT_ACCEPTED: 'REPORT_ACCEPTED',
    REPORT_REJECTED: 'REPORT_REJECTED',
    
    // Account-related notifications
    EMAIL_CHANGED: 'EMAIL_CHANGED',
    EMAIL_VERIFICATION_SENT: 'EMAIL_VERIFICATION_SENT',
    EMAIL_VERIFICATION_FAILED: 'EMAIL_VERIFICATION_FAILED',
    EMAIL_VERIFIED: 'EMAIL_VERIFIED',
    
    // Future notification types (add here as needed)
    // REPORT_COMMENT: 'REPORT_COMMENT',
    // REPORT_MATCH_FOUND: 'REPORT_MATCH_FOUND',
    // SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
};

// =====================================================
// NOTIFICATION SERVICE
// =====================================================

/**
 * Creates a notification for a user
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - The user ID to notify
 * @param {string} params.type - Notification type (use NotificationType constants)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {Object} [params.data={}] - Additional data payload (e.g., reportId, reason)
 * @returns {Promise<{success: boolean, notification?: Object, error?: string}>}
 */
export async function createNotification({ userId, type, title, message, data = {} }) {
    if (!supabaseAdmin) {
        console.error('[NotificationService] supabaseAdmin not configured');
        return { success: false, error: 'Service not configured' };
    }

    if (!userId || !type || !title || !message) {
        return { success: false, error: 'Missing required fields: userId, type, title, message' };
    }

    try {
        const { data: notification, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                data,
            })
            .select()
            .single();

        if (error) {
            console.error('[NotificationService] Error creating notification:', error);
            return { success: false, error: error.message };
        }

        console.log('[NotificationService] Notification created:', notification.id);
        return { success: true, notification };
    } catch (err) {
        console.error('[NotificationService] Unexpected error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Creates a "Report Accepted" notification
 * 
 * @param {string} userId - User ID to notify
 * @param {string} reportId - The report ID that was accepted
 * @param {string} reportTitle - The report title for display
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.locale='en'] - Locale for message translation
 * @returns {Promise<{success: boolean, notification?: Object, error?: string}>}
 */
export async function notifyReportAccepted(userId, reportId, reportTitle, options = {}) {
    const { locale = 'en' } = options;
    
    // Localized messages
    const messages = {
        en: {
            title: 'Report Accepted',
            message: `Your report "${reportTitle}" has been reviewed and accepted.`,
        },
        ar: {
            title: 'تم قبول البلاغ',
            message: `تمت مراجعة بلاغك "${reportTitle}" وقبوله.`,
        },
    };

    const msg = messages[locale] || messages.en;

    return createNotification({
        userId,
        type: NotificationType.REPORT_ACCEPTED,
        title: msg.title,
        message: msg.message,
        data: {
            reportId,
            reportTitle,
            status: 'accepted',
        },
    });
}

/**
 * Creates a "Report Rejected" notification
 * 
 * @param {string} userId - User ID to notify
 * @param {string} reportId - The report ID that was rejected
 * @param {string} reportTitle - The report title for display
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.reason] - Reason for rejection
 * @param {string} [options.locale='en'] - Locale for message translation
 * @returns {Promise<{success: boolean, notification?: Object, error?: string}>}
 */
export async function notifyReportRejected(userId, reportId, reportTitle, options = {}) {
    const { reason, locale = 'en' } = options;
    
    // Localized messages (reason is stored in data, not in message to avoid duplication)
    const messages = {
        en: {
            title: 'Report Rejected',
            message: `Your report "${reportTitle}" has been rejected.`,
        },
        ar: {
            title: 'تم رفض البلاغ',
            message: `تم رفض بلاغك "${reportTitle}".`,
        },
    };

    const msg = messages[locale] || messages.en;

    return createNotification({
        userId,
        type: NotificationType.REPORT_REJECTED,
        title: msg.title,
        message: msg.message,
        data: {
            reportId,
            reportTitle,
            status: 'rejected',
            reason: reason || null,
        },
    });
}

/**
 * Creates an "Email Verification Sent" notification
 * 
 * @param {string} userId - User ID to notify
 * @param {string} email - The email address verification was sent to
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.locale='en'] - Locale for message translation
 * @returns {Promise<{success: boolean, notification?: Object, error?: string}>}
 */
export async function notifyEmailVerificationSent(userId, email, options = {}) {
    const { locale = 'en' } = options;
    
    const messages = {
        en: {
            title: 'Verification Email Sent',
            message: `A verification link has been sent to ${email}. Please check your inbox and click the link to verify your account.`,
        },
        ar: {
            title: 'تم إرسال بريد التحقق',
            message: `تم إرسال رابط التحقق إلى ${email}. يرجى التحقق من صندوق الوارد والنقر على الرابط لتفعيل حسابك.`,
        },
    };

    const msg = messages[locale] || messages.en;

    return createNotification({
        userId,
        type: NotificationType.EMAIL_VERIFICATION_SENT,
        title: msg.title,
        message: msg.message,
        data: {
            email,
        },
    });
}

/**
 * Creates an "Email Verification Failed" notification
 * 
 * @param {string} userId - User ID to notify
 * @param {string} email - The email address that failed to receive verification
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.locale='en'] - Locale for message translation
 * @param {string} [options.reason] - Optional reason for the failure
 * @returns {Promise<{success: boolean, notification?: Object, error?: string}>}
 */
export async function notifyEmailVerificationFailed(userId, email, options = {}) {
    const { locale = 'en', reason } = options;
    
    const messages = {
        en: {
            title: 'Verification Email Failed',
            message: `We couldn't send a verification email to ${email}. Please check that your email address is correct and try again from your profile page.`,
        },
        ar: {
            title: 'فشل إرسال بريد التحقق',
            message: `تعذر إرسال رسالة التحقق إلى ${email}. يرجى التأكد من صحة بريدك الإلكتروني والمحاولة مرة أخرى من صفحة الملف الشخصي.`,
        },
    };

    const msg = messages[locale] || messages.en;

    return createNotification({
        userId,
        type: NotificationType.EMAIL_VERIFICATION_FAILED,
        title: msg.title,
        message: msg.message,
        data: {
            email,
            reason: reason || 'unknown',
        },
    });
}

/**
 * Creates an "Email Verified" notification
 * 
 * @param {string} userId - User ID to notify
 * @param {string} email - The email address that was verified
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.locale='en'] - Locale for message translation
 * @returns {Promise<{success: boolean, notification?: Object, error?: string}>}
 */
export async function notifyEmailVerified(userId, email, options = {}) {
    const { locale = 'en' } = options;
    
    const messages = {
        en: {
            title: 'Email Verified Successfully',
            message: `Your email address ${email} has been verified. Your account is now fully active!`,
        },
        ar: {
            title: 'تم التحقق من البريد الإلكتروني بنجاح',
            message: `تم التحقق من بريدك الإلكتروني ${email}. حسابك نشط بالكامل الآن!`,
        },
    };

    const msg = messages[locale] || messages.en;

    return createNotification({
        userId,
        type: NotificationType.EMAIL_VERIFIED,
        title: msg.title,
        message: msg.message,
        data: {
            email,
        },
    });
}

/**
 * Fetches notifications for a user (server-side with admin client)
 * 
 * @param {string} userId - User ID
 * @param {Object} [options={}] - Query options
 * @param {number} [options.limit=50] - Maximum notifications to fetch
 * @param {number} [options.offset=0] - Pagination offset
 * @param {boolean} [options.unreadOnly=false] - Fetch only unread notifications
 * @returns {Promise<{success: boolean, notifications?: Array, count?: number, error?: string}>}
 */
export async function getNotificationsForUser(userId, options = {}) {
    if (!supabaseAdmin) {
        return { success: false, error: 'Service not configured' };
    }

    const { limit = 50, offset = 0, unreadOnly = false } = options;

    try {
        let query = supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            console.error('[NotificationService] Error fetching notifications:', error);
            return { success: false, error: error.message };
        }

        return { success: true, notifications, count };
    } catch (err) {
        console.error('[NotificationService] Unexpected error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Gets unread notification count for a user (server-side)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function getUnreadCount(userId) {
    if (!supabaseAdmin) {
        return { success: false, error: 'Service not configured' };
    }

    try {
        const { count, error } = await supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('[NotificationService] Error getting unread count:', error);
            return { success: false, error: error.message };
        }

        return { success: true, count: count || 0 };
    } catch (err) {
        console.error('[NotificationService] Unexpected error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Marks a notification as read (server-side)
 * 
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markAsRead(notificationId, userId) {
    if (!supabaseAdmin) {
        return { success: false, error: 'Service not configured' };
    }

    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) {
            console.error('[NotificationService] Error marking as read:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[NotificationService] Unexpected error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Marks all notifications as read for a user (server-side)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
 */
export async function markAllAsRead(userId) {
    if (!supabaseAdmin) {
        return { success: false, error: 'Service not configured' };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)
            .select();

        if (error) {
            console.error('[NotificationService] Error marking all as read:', error);
            return { success: false, error: error.message };
        }

        return { success: true, updatedCount: data?.length || 0 };
    } catch (err) {
        console.error('[NotificationService] Unexpected error:', err);
        return { success: false, error: err.message };
    }
}

// =====================================================
// CLIENT-SIDE HELPERS (for use with user's supabase client)
// =====================================================

/**
 * Fetches notifications for the current authenticated user
 * Use this on the client-side with the user's supabase instance
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {Object} [options={}] - Query options
 * @returns {Promise<{success: boolean, notifications?: Array, count?: number, error?: string}>}
 */
export async function fetchMyNotifications(supabase, options = {}) {
    if (!supabase) {
        return { success: false, error: 'Supabase client not provided' };
    }

    const { limit = 50, offset = 0, unreadOnly = false } = options;

    try {
        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, notifications, count };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Marks a notification as read (client-side)
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} notificationId - Notification ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markNotificationRead(supabase, notificationId) {
    if (!supabase) {
        return { success: false, error: 'Supabase client not provided' };
    }

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Marks all notifications as read (client-side)
 * 
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
 */
export async function markAllNotificationsRead(supabase) {
    if (!supabase) {
        return { success: false, error: 'Supabase client not provided' };
    }

    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false)
            .select();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, updatedCount: data?.length || 0 };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Subscribes to realtime notification inserts for the current user
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to filter notifications
 * @param {Function} callback - Callback function when new notification arrives
 * @returns {Object} Subscription object (call .unsubscribe() to stop)
 */
export function subscribeToNotifications(supabase, userId, callback) {
    if (!supabase || !userId) {
        console.error('[NotificationService] Cannot subscribe: missing supabase or userId');
        return null;
    }

    const subscription = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                console.log('[NotificationService] New notification received:', payload.new);
                callback(payload.new);
            }
        )
        .subscribe();

    return subscription;
}
