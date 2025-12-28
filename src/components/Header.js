"use client"

import { Link, usePathname } from "@/i18n/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import LoginDialog from "./LoginDialog";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslations, useLanguage } from "../context/LanguageContext";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

// Helper to format relative time
function formatRelativeTime(dateString, locale = 'en') {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [initialTab, setInitialTab] = useState("login");
    const [isAdmin, setIsAdmin] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    
    // Notification state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    
    const pathname = usePathname();
    const { user, profile, logout, isAuthLoading } = useAuth();
    const t = useTranslations('header');
    const tNotif = useTranslations('notifications');
    const { locale } = useLanguage();
    const tCommon = useTranslations('common');
    const isRTL = locale === 'ar';

    const isActive = (path) => pathname === path;

    // Close all dialogs when navigating
    const closeDialogs = () => {
        setIsLoginDialogOpen(false);
        setIsMenuOpen(false);
        setIsNotificationsOpen(false);
        setSelectedNotification(null);
    };

    // Open notification detail
    const openNotificationDetail = (notification) => {
        if (!notification.is_read) markAsRead(notification.id);
        setSelectedNotification(notification);
    };

    // Close notification detail
    const closeNotificationDetail = () => {
        setSelectedNotification(null);
    };

    // Close login dialog when user logs in successfully
    useEffect(() => {
        if (user && isLoginDialogOpen) {
            setIsLoginDialogOpen(false);
        }
    }, [user]);

    // Check if user is admin
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            try {
                const response = await fetch(`/api/admin/check?userId=${user.id}`);
                const data = await response.json();
                setIsAdmin(data.isAdmin);
            } catch (err) {
                console.error('Error checking admin status:', err);
                setIsAdmin(false);
            }
        };
        checkAdminStatus();
    }, [user]);

    // Fetch notifications function
    const fetchNotifications = useCallback(async () => {
        if (!user || !supabase) return;
        
        setNotificationsLoading(true);
        try {
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.access_token) return;

            const response = await fetch('/api/notifications?limit=10', {
                headers: {
                    'Authorization': `Bearer ${session.session.access_token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.notifications?.filter(n => !n.is_read).length || 0);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setNotificationsLoading(false);
        }
    }, [user]);

    // Fetch notifications when user logs in or dropdown opens
    useEffect(() => {
        if (user) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, fetchNotifications]);

    // Subscribe to realtime notifications
    useEffect(() => {
        if (!user || !supabase) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Header] New notification received:', payload.new);
                    // Add new notification to the top
                    setNotifications(prev => [payload.new, ...prev].slice(0, 10));
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Mark single notification as read
    const markAsRead = async (notificationId) => {
        if (!supabase) return;
        
        try {
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.access_token) return;

            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.session.access_token}`
                }
            });
            
            if (response.ok) {
                setNotifications(prev => 
                    prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        if (!supabase) return;
        
        try {
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.access_token) return;

            const response = await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.session.access_token}`
                }
            });
            
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    // Delete a notification
    const deleteNotification = async (notificationId, e) => {
        if (e) {
            e.stopPropagation(); // Prevent triggering the parent onClick
        }
        if (!supabase) return;
        
        try {
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.access_token) return;

            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.session.access_token}`
                }
            });
            
            if (response.ok) {
                // Check if the notification was unread before removing
                const notification = notifications.find(n => n.id === notificationId);
                if (notification && !notification.is_read) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'REPORT_ACCEPTED':
                return (
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case 'REPORT_REJECTED':
                return (
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                );
        }
    };

    // Close notifications dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isNotificationsOpen && !event.target.closest('.notifications-container')) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotificationsOpen]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            {/* Sidebar Toggle Button (Mobile only - sm screens) */}
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="btn-icon p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-full hidden sm:block md:hidden"
                                aria-label="Open Menu"
                            >
                                <svg className={`w-6 h-6 ${isRTL ? 'scale-x-[-1]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
                                </svg>
                            </button>

                            {/* Logo */}
                            <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity">
                                <Image
                                    src="/icons/logo.svg"
                                    alt="Lqani.ma"
                                    width={140}
                                    height={40}
                                    className="h-8 sm:h-10 w-auto dark:brightness-0 dark:invert"
                                    style={{ width: 'auto', height: 'auto' }}
                                    priority
                                />
                            </Link>

                            {/* Desktop Navigation - Hidden on md+ where sidebar is visible */}
                            <div className="hidden sm:flex md:hidden items-center ml-6 gap-2">
                                <Link
                                    href="/"
                                    onClick={closeDialogs}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/')
                                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    {tCommon('navigation.home')}
                                </Link>
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Upload Photo Button - Report Missing Person - Hidden on mobile */}
                            <Link href="/report-missing" onClick={closeDialogs} className={`btn-gradient btn-ripple hidden md:inline-flex items-center justify-center gap-2 px-3 h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg hover:shadow-blue-500/40 whitespace-nowrap ${isActive('/report-missing') ? 'ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden lg:inline">{t('reportMissing')}</span>
                            </Link>

                            {/* Report Sighting Button - Hidden on mobile */}
                            <Link href="/report-sighting" onClick={closeDialogs} className={`btn-gradient btn-ripple hidden md:inline-flex items-center justify-center gap-2 px-3 h-9 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold shadow-lg hover:shadow-orange-500/40 whitespace-nowrap ${isActive('/report-sighting') ? 'ring-2 ring-orange-300 ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="hidden lg:inline">{t('sighting')}</span>
                            </Link>

                            {/* Notifications - Only visible when logged in */}
                            {user && (
                                <div className="relative notifications-container">
                                    <button 
                                        onClick={() => {
                                            setIsNotificationsOpen(!isNotificationsOpen);
                                            if (!isNotificationsOpen) fetchNotifications();
                                        }}
                                        className="btn-icon flex relative p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        {/* Notification badge */}
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    
                                    {/* Notifications Dropdown */}
                                    {isNotificationsOpen && (
                                        <div className={`fixed inset-x-4 top-16 sm:inset-x-auto sm:absolute sm:top-full sm:mt-2 w-auto sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 ${isRTL ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'}`}>
                                            {/* Header */}
                                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                    </svg>
                                                    {tNotif('title') || t('notifications') || 'Notifications'}
                                                    {unreadCount > 0 && (
                                                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        {tNotif('markAllAsRead') || 'Mark all as read'}
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Content */}
                                            {notificationsLoading ? (
                                                <div className="p-6 flex items-center justify-center">
                                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-6 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                        {tNotif('noNotifications') || t('noNotifications') || 'No notifications'}
                                                    </p>
                                                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                                                        {t('notificationsDescription') || "You're all caught up!"}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                                    {notifications.map((notification) => (
                                                        <div
                                                            key={notification.id}
                                                            onClick={() => openNotificationDetail(notification)}
                                                            className={`group px-4 py-3 flex gap-3 cursor-pointer transition-colors ${
                                                                notification.is_read 
                                                                    ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50' 
                                                                    : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                            }`}
                                                        >
                                                            {getNotificationIcon(notification.type)}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className={`text-sm font-medium truncate ${
                                                                        notification.is_read 
                                                                            ? 'text-gray-700 dark:text-gray-300' 
                                                                            : 'text-gray-900 dark:text-white'
                                                                    }`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        {!notification.is_read && (
                                                                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                                                                        )}
                                                                        {/* Delete button - always visible on mobile, hover on desktop */}
                                                                        <button
                                                                            onClick={(e) => deleteNotification(notification.id, e)}
                                                                            className="p-1.5 sm:p-1 rounded-full sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-90"
                                                                            title={tNotif('delete') || 'Delete'}
                                                                        >
                                                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                                    {formatRelativeTime(notification.created_at, locale)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Language Switcher - Hidden on large screens, shown on mobile */}
                            <div className="md:hidden">
                                <LanguageSwitcher />
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-gray-800"></div>

                            {/* Auth / Profile */}
                            <div className="hidden sm:flex items-center gap-3">
                                {isAuthLoading ? (
                                    <div className="flex gap-2">
                                        <div className="w-20 h-9 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"></div>
                                        <div className="w-20 h-9 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"></div>
                                    </div>
                                ) : user ? (
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href="/profile"
                                            onClick={closeDialogs}
                                            className={`btn-outline flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 overflow-visible ${
                                                isAdmin 
                                                    ? 'border-amber-400 dark:border-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.4)] hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] hover:border-amber-500 dark:hover:border-amber-400' 
                                                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0 w-7 h-7">
                                                {profile?.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt="Profile"
                                                        className={`w-7 h-7 rounded-full object-cover ${isAdmin ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}
                                                    />
                                                ) : (
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                                        isAdmin 
                                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-300 dark:ring-amber-500' 
                                                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                    }`}>
                                                        {profile?.first_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                {/* Admin Badge on Avatar */}
                                                {isAdmin && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-[1.5px] border-white dark:border-gray-800 shadow-lg">
                                                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`hidden lg:inline text-sm font-medium ${isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {profile?.first_name || profile?.username || 'User'}
                                            </span>
                                            {/* Admin Text Badge */}
                                            {isAdmin && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-sm uppercase tracking-wide">
                                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    {t('admin')}
                                                </span>
                                            )}
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setInitialTab("login");
                                                setIsLoginDialogOpen(true);
                                            }}
                                            className="btn-outline px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-full border border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        >
                                            {tCommon('buttons.login')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setInitialTab("signup");
                                                setIsLoginDialogOpen(true);
                                            }}
                                            className="btn-gradient btn-ripple px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold shadow-lg shadow-gray-900/20 hover:shadow-gray-900/40 dark:hover:shadow-white/30"
                                        >
                                            {tCommon('buttons.signup')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Notification Detail Modal - Rendered at root level for proper mobile display */}
            {selectedNotification && (
                <div 
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={closeNotificationDetail}
                >
                    <div 
                        className={`w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all sm:m-4 ${isRTL ? 'text-right' : 'text-left'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag indicator for mobile */}
                        <div className="flex justify-center pt-2 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        </div>

                        {/* Modal Header */}
                        <div className={`px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 ${
                            selectedNotification.type === 'REPORT_ACCEPTED' 
                                ? 'bg-green-50 dark:bg-green-900/20' 
                                : selectedNotification.type === 'REPORT_REJECTED'
                                ? 'bg-red-50 dark:bg-red-900/20'
                                : 'bg-gray-50 dark:bg-gray-800/50'
                        }`}>
                            {getNotificationIcon(selectedNotification.type)}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                                    {selectedNotification.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {formatRelativeTime(selectedNotification.created_at, locale)}
                                </p>
                            </div>
                            <button
                                onClick={closeNotificationDetail}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors sm:flex hidden"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-4 sm:px-5 py-3 sm:py-4">
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                {selectedNotification.message}
                            </p>

                            {/* Additional data display */}
                            {selectedNotification.data?.reason && (
                                <div className="mt-3 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">
                                        {tNotif('reason') || 'Reason:'}
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {selectedNotification.data.reason}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 sm:px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            {/* View Report button - only show if reportId exists */}
                            {selectedNotification.data?.reportId && (
                                <Link
                                    href="/my-report"
                                    onClick={() => {
                                        closeNotificationDetail();
                                        setIsNotificationsOpen(false);
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="hidden sm:inline">{tNotif('viewReport') || 'View Report'}</span>
                                    <span className="sm:hidden">{tNotif('viewReport') || 'View'}</span>
                                </Link>
                            )}
                            <button
                                onClick={() => {
                                    deleteNotification(selectedNotification.id);
                                    closeNotificationDetail();
                                }}
                                className={`${selectedNotification.data?.reportId ? '' : 'flex-1'} px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors`}
                            >
                                {tNotif('delete') || 'Delete'}
                            </button>
                            <button
                                onClick={closeNotificationDetail}
                                className={`${selectedNotification.data?.reportId ? '' : 'flex-1'} px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors`}
                            >
                                {tNotif('close') || 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Login Dialog Component */}
            <LoginDialog
                isOpen={isLoginDialogOpen}
                onClose={() => setIsLoginDialogOpen(false)}
                initialTab={initialTab}
            />

            {/* Desktop Persistent Sidebar - Supabase Style */}
            <div 
                className={`desktop-sidebar hidden md:flex fixed top-16 ${locale === 'ar' ? 'right-0' : 'left-0'} z-40 h-[calc(100vh-4rem)] flex-col bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-gray-200/50 dark:border-gray-800/50 ${locale === 'ar' ? 'border-l' : 'border-r'}`}
                onMouseLeave={(e) => {
                    // Scroll to top when sidebar collapses
                    const scrollContainer = e.currentTarget.querySelector('.sidebar-scroll-container');
                    if (scrollContainer) {
                        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }}
            >
                <div className="sidebar-scroll-container flex flex-col h-full py-4 px-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {/* Navigation Items */}
                    <nav className="flex-1 flex flex-col gap-1">
                        {/* Home */}
                        <Link href="/" onClick={closeDialogs} className={`desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive('/') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium">{tCommon('navigation.home')}</span>
                        </Link>

                        {/* My Report */}
                        <Link href="/my-report" onClick={closeDialogs} className={`desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive('/my-report') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium">{t('myReport')}</span>
                        </Link>

                        {/* Admin Dashboard - Only visible for admins */}
                        {isAdmin && (
                            <Link href="/admin" onClick={closeDialogs} className={`desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive('/admin') ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium flex items-center gap-2">
                                    {t('adminDashboard')}
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">
                                        {t('adminBadge')}
                                    </span>
                                </span>
                            </Link>
                        )}

                        {/* Spacer */}
                        <div className="flex-1"></div>

                        {/* Divider before bottom items */}
                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

                        {/* Settings */}
                        <Link href="/settings" onClick={closeDialogs} className={`desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive('/settings') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium">{tCommon('navigation.settings')}</span>
                        </Link>

                        {/* About */}
                        <Link href="/about" onClick={closeDialogs} className={`desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive('/about') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium">{tCommon('navigation.about')}</span>
                        </Link>

                        {/* Contact */}
                        <Link href="/contact" onClick={closeDialogs} className={`desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive('/contact') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium">{tCommon('navigation.contact')}</span>
                        </Link>

                        {/* Logout - Only visible when logged in */}
                        {user && (
                            <button
                                onClick={() => {
                                    logout();
                                }}
                                className="desktop-sidebar-item group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="desktop-sidebar-label whitespace-nowrap text-sm font-medium">{tCommon('buttons.logout')}</span>
                            </button>
                        )}
                    </nav>
                </div>
            </div>

            {/* Sidebar Overlay (Mobile only) */}
            <div
                className={`sidebar-overlay fixed inset-0 z-[60] bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm md:hidden ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMenuOpen(false)}
            />

            {/* Sidebar Slide-over (Mobile only) */}
            <div
                className={`sidebar-slide fixed inset-y-0 ${locale === 'ar' ? 'right-0 sidebar-slide-rtl' : 'left-0'} z-[70] w-[280px] bg-white dark:bg-[#0f172a] shadow-2xl shadow-black/20 dark:shadow-black/40 md:hidden ${isMenuOpen ? 'translate-x-0' : (locale === 'ar' ? 'translate-x-full' : '-translate-x-full')}`}
            >
                <div className="flex flex-col h-full bg-white dark:bg-[#0f172a] overflow-y-auto scrollbar-hide">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">Menu</span>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="btn-icon p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 hover:rotate-90"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Mobile User Profile Header */}
                        {user && (
                            <div className={`mb-8 p-4 rounded-2xl border transition-all duration-300 ${
                                isAdmin 
                                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.3)] dark:shadow-[0_0_20px_rgba(251,191,36,0.2)]' 
                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-700'
                            }`}>
                                <Link href="/profile" onClick={closeDialogs} className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className={`w-12 h-12 rounded-full object-cover border-2 ${
                                                isAdmin 
                                                    ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-300 dark:ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.5)]' 
                                                    : 'border-gray-300 dark:border-gray-600 ring-2 ring-white dark:ring-gray-800'
                                            }`} />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                                isAdmin 
                                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-300 dark:ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.5)]' 
                                                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                            }`}>
                                                {profile?.first_name?.[0] || profile?.username?.[0] || user?.email?.[0]}
                                            </div>
                                        )}
                                        {/* Admin Badge on Avatar */}
                                        {isAdmin && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-lg">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        {/* Name Row */}
                                        <p className={`font-semibold truncate leading-tight ${
                                            isAdmin ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'
                                        }`}>
                                            {profile?.first_name 
                                                ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                                                : profile?.username || 'User'}
                                        </p>
                                        {/* Admin Badge Row */}
                                        {isAdmin && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-sm uppercase tracking-wide">
                                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                {t('admin')}
                                            </span>
                                        )}
                                        {/* Email Row */}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
                                    </div>
                                </Link>
                            </div>
                        )}

                        <div className="space-y-2">
                            {/* Mobile Only: Home */}
                            <Link
                                href="/"
                                onClick={closeDialogs}
                                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 md:hidden ${isActive('/')
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                {tCommon('navigation.home')}
                            </Link>

                            {/* Action Buttons Section - Show on all screens */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('quickActions')}
                                </p>

                                {/* My Report */}
                                <Link
                                    href="/my-report"
                                    onClick={closeDialogs}
                                    className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/my-report')
                                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                        }`}
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="whitespace-nowrap">{t('myReport')}</span>
                                </Link>

                                {/* Report Missing Person */}
                                <Link
                                    href="/report-missing"
                                    onClick={closeDialogs}
                                    className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/report-missing')
                                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                        }`}
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="whitespace-nowrap">{t('reportMissingPerson')}</span>
                                </Link>

                                {/* Report Sighting */}
                                <Link
                                    href="/report-sighting"
                                    onClick={closeDialogs}
                                    className={`sidebar-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/report-sighting') ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'}`}
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span className="whitespace-nowrap">{t('sighting')}</span>
                                </Link>

                                {/* Admin Dashboard - Only visible for admins */}
                                {isAdmin && (
                                    <Link
                                        href="/admin"
                                        onClick={closeDialogs}
                                        className={`sidebar-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin') ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'}`}
                                    >
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <span className="whitespace-nowrap flex items-center gap-2">
                                            {t('adminDashboard')}
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-md">
                                                {t('adminBadge')}
                                            </span>
                                        </span>
                                    </Link>
                                )}
                            </div>

                            <Link
                                href="/settings"
                                onClick={closeDialogs}
                                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/settings')
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {tCommon('navigation.settings')}
                            </Link>

                            <Link
                                href="/about"
                                onClick={closeDialogs}
                                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/about')
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {tCommon('navigation.about')}
                            </Link>

                            <Link
                                href="/contact"
                                onClick={closeDialogs}
                                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/contact')
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {tCommon('navigation.contact')}
                            </Link>

                            <Link
                                href="/privacy"
                                onClick={closeDialogs}
                                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/privacy')
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:translate-x-1'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                {tCommon('navigation.privacy')}
                            </Link>
                        </div>

                        {/* Mobile Auth Actions */}
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3 md:hidden">
                            {!user ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setInitialTab("login");
                                            setIsLoginDialogOpen(true);
                                            setIsMenuOpen(false);
                                        }}
                                        className="btn-outline w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-[0.98]"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        {tCommon('buttons.login')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setInitialTab("signup");
                                            setIsLoginDialogOpen(true);
                                            setIsMenuOpen(false);
                                        }}
                                        className="btn-gradient btn-ripple w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98]"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        {tCommon('buttons.signup')}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="btn-outline w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium active:scale-[0.98]"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    {tCommon('buttons.logout')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Bar (Mobile Only) */}
            <div className="fixed bottom-0 inset-x-0 z-[60] bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe md:hidden">
                <div className="flex justify-around items-center h-16 px-2 flex-row-reverse">
                    <Link href="/" onClick={closeDialogs} className={`group flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-200 ${isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-[10px] font-medium">{tCommon('navigation.home')}</span>
                    </Link>

                    <Link href="/report-sighting" onClick={closeDialogs} className={`group flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-200 ${isActive('/report-sighting') ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-[10px] font-medium">{t('sighting')}</span>
                    </Link>

                    <Link href="/report-missing" onClick={closeDialogs} className="group flex flex-col items-center justify-center w-full h-full space-y-1 text-white active:scale-95 transition-transform duration-200">
                        <div className={`w-12 h-12 -mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110 group-active:scale-100 transition-all duration-200 ${isActive('/report-missing') ? 'ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
                            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{t('upload')}</span>
                    </Link>

                    <Link href="/my-report" onClick={closeDialogs} className={`group flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-200 ${isActive('/my-report') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-[10px] font-medium">{t('myReport')}</span>
                    </Link>

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`group flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-200 ${isMenuOpen ? 'text-blue-600 dark:text-blue-400' : isAdmin ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 hover:text-blue-600'}`}
                    >
                        <div className="relative">
                            {user && profile?.avatar_url ? (
                                <img 
                                    src={profile.avatar_url} 
                                    className={`w-6 h-6 rounded-full border group-hover:scale-110 transition-all duration-200 ${
                                        isAdmin 
                                            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.5)]' 
                                            : 'border-gray-300 dark:border-gray-600 ring-2 ring-transparent group-hover:ring-blue-500'
                                    }`} 
                                    alt="Menu" 
                                />
                            ) : user ? (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold group-hover:scale-110 transition-all duration-200 ${
                                    isAdmin 
                                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.5)]' 
                                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                }`}>
                                    {profile?.first_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                            ) : (
                                <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                                </svg>
                            )}
                            {/* Admin Badge */}
                            {user && isAdmin && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center border border-white dark:border-gray-900 shadow-sm">
                                    <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <span className={`text-[10px] font-medium ${isAdmin && user ? 'text-amber-500 dark:text-amber-400' : ''}`}>
                            {user ? t('profile') : t('menu')}
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
}
