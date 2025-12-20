"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import LoginDialog from '@/components/LoginDialog';

// Report type icons component
const ReportTypeIcon = ({ type, className = "w-5 h-5" }) => {
    const icons = {
        person: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        pet: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
        document: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        electronics: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
        vehicle: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
            </svg>
        ),
        other: (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )
    };
    return icons[type] || icons.other;
};

// Report type colors
const getReportTypeColors = (type) => {
    const colors = {
        person: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        pet: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
        document: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        electronics: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        vehicle: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        other: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600'
    };
    return colors[type] || colors.other;
};

// Helper to get display name for a report
const getReportDisplayName = (report) => {
    const { report_type, details } = report;
    
    if (!details) {
        // Fallback for legacy data
        return report.first_name && report.last_name 
            ? `${report.first_name} ${report.last_name}` 
            : report.first_name || 'Unknown';
    }
    
    switch (report_type) {
        case 'person':
            return `${details.first_name || ''} ${details.last_name || ''}`.trim() || 'Unknown Person';
        case 'pet':
            return details.pet_name || 'Unknown Pet';
        case 'document':
            return details.document_type || 'Unknown Document';
        case 'electronics':
            return `${details.brand || ''} ${details.model || ''}`.trim() || 'Unknown Device';
        case 'vehicle':
            return `${details.brand || ''} ${details.model || ''}`.trim() || 'Unknown Vehicle';
        case 'other':
            return details.item_name || 'Unknown Item';
        default:
            return report.first_name || 'Unknown';
    }
};

export default function AdminPage() {
    const { user, isAuthLoading, isAdmin, adminRole, isAdminChecked } = useAuth();
    const router = useRouter();
    const t = useTranslations('admin');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';

    // Reports state
    const [activeTab, setActiveTab] = useState('missing'); // 'missing' or 'sighting'
    const [statusFilter, setStatusFilter] = useState('all');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });
    
    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });

    // Modal state
    const [selectedReport, setSelectedReport] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Change status modal state
    const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [changeStatusLoading, setChangeStatusLoading] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Login dialog
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

    // Image preview state - gallery support
    const [previewImages, setPreviewImages] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    // Copy state for report ID
    const [copiedReportId, setCopiedReportId] = useState(false);

    // User profile modal state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);

    // Track if initial load has been done
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
    
    // Track if background refresh is in progress
    const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
    
    // Last refresh time for display
    const [lastRefreshTime, setLastRefreshTime] = useState(null);

    // Fetch stats for all statuses
    const fetchStats = useCallback(async () => {
        if (!user || !isAdmin) return;

        try {
            // Determine which API endpoint to use based on active tab
            const baseUrl = activeTab === 'sighting' ? '/api/admin/sighting-reports' : '/api/admin/reports';
            
            // Fetch counts for each status
            const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
                fetch(`${baseUrl}?userId=${user.id}&status=all&limit=1`),
                fetch(`${baseUrl}?userId=${user.id}&status=pending&limit=1`),
                fetch(`${baseUrl}?userId=${user.id}&status=approved&limit=1`),
                fetch(`${baseUrl}?userId=${user.id}&status=rejected&limit=1`)
            ]);

            const [total, pending, approved, rejected] = await Promise.all([
                totalRes.json(),
                pendingRes.json(),
                approvedRes.json(),
                rejectedRes.json()
            ]);

            setStats({
                total: total.pagination?.total || 0,
                pending: pending.pagination?.total || 0,
                approved: approved.pagination?.total || 0,
                rejected: rejected.pagination?.total || 0
            });
        } catch (err) {
            console.error('[Admin] Error fetching stats:', err);
        }
    }, [user, isAdmin, activeTab]);

    // Fetch reports (with option for background refresh)
    const fetchReports = useCallback(async (isBackground = false) => {
        if (!user || !isAdmin) return;

        if (isBackground) {
            setIsBackgroundRefreshing(true);
        } else {
            setLoading(true);
        }
        setError('');

        try {
            // Determine which API endpoint to use based on active tab
            const baseUrl = activeTab === 'sighting' ? '/api/admin/sighting-reports' : '/api/admin/reports';
            
            const params = new URLSearchParams({
                userId: user.id,
                status: statusFilter,
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            // Add search query if present
            if (debouncedSearch.trim()) {
                params.append('search', debouncedSearch.trim());
            }

            console.log('[Admin] Fetching reports with params:', params.toString());
            const response = await fetch(`${baseUrl}?${params}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Admin] API Error:', response.status, errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch reports`);
            }

            const data = await response.json();
            console.log('[Admin] Fetched reports:', data);

            setReports(data.reports || []);
            setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 });
            setLastRefreshTime(new Date());
            
            if (!hasInitiallyLoaded) {
                setHasInitiallyLoaded(true);
            }
        } catch (err) {
            console.error('[Admin] Error fetching reports:', err);
            if (!isBackground) {
                setError(err.message || t('messages.fetchError'));
            }
        } finally {
            if (isBackground) {
                setIsBackgroundRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [user, isAdmin, activeTab, statusFilter, pagination.page, pagination.limit, debouncedSearch, t, hasInitiallyLoaded]);

    // Manual refresh function
    const handleManualRefresh = useCallback(() => {
        fetchReports(false);
        fetchStats();
    }, [fetchReports, fetchStats]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            // Reset to page 1 when search changes
            if (searchQuery !== debouncedSearch) {
                setPagination(p => ({ ...p, page: 1 }));
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Initial load - only once when admin status is confirmed
    useEffect(() => {
        if (isAdmin && !hasInitiallyLoaded) {
            fetchReports(false);
            fetchStats();
        }
    }, [isAdmin, hasInitiallyLoaded]);

    // Reload when filters change (but not on initial load)
    useEffect(() => {
        if (isAdmin && hasInitiallyLoaded) {
            fetchReports(false);
            fetchStats();
        }
    }, [activeTab, statusFilter, pagination.page, debouncedSearch]);

    // Background polling - check for new reports every 30 seconds
    useEffect(() => {
        if (!isAdmin || !hasInitiallyLoaded) return;

        const pollInterval = setInterval(() => {
            // Only poll if the tab is visible
            if (document.visibilityState === 'visible') {
                console.log('[Admin] Background polling for new reports...');
                fetchReports(true);
                fetchStats();
            }
        }, 30000); // 30 seconds

        return () => clearInterval(pollInterval);
    }, [isAdmin, hasInitiallyLoaded, fetchReports, fetchStats]);

    // Handle approve/reject actions
    const handleAction = async (action) => {
        if (!selectedReport || !user) return;

        setActionLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            // Determine which API endpoint to use based on active tab
            const baseUrl = activeTab === 'sighting' ? '/api/admin/sighting-reports' : '/api/admin/reports';
            
            console.log('[Admin] handleAction - activeTab:', activeTab, 'baseUrl:', baseUrl, 'userId:', user.id);
            
            const response = await fetch(baseUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    reportId: selectedReport.id,
                    action,
                    rejectionReason: action === 'reject' ? rejectionReason : null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Action failed');
            }

            setSuccessMessage(action === 'approve' ? t('messages.approveSuccess') : t('messages.rejectSuccess'));
            setShowApproveModal(false);
            setShowRejectModal(false);
            setSelectedReport(null);
            setRejectionReason('');
            
            // Refresh the reports list
            fetchReports();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error performing action:', err);
            setError(t('messages.error'));
        } finally {
            setActionLoading(false);
        }
    };

    // Handle delete report
    const handleDelete = async () => {
        if (!selectedReport || !user) return;

        setDeleteLoading(true);
        setError('');

        try {
            // Determine which API endpoint to use based on active tab
            const baseUrl = activeTab === 'sighting' ? '/api/admin/sighting-reports' : '/api/admin/reports';
            
            const response = await fetch(
                `${baseUrl}?userId=${user.id}&reportId=${selectedReport.id}`,
                { method: 'DELETE' }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete report');
            }

            setSuccessMessage(t('messages.deleteSuccess'));
            setShowDeleteModal(false);
            setSelectedReport(null);
            
            // Refresh the reports list and stats
            fetchReports();
            fetchStats();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error deleting report:', err);
            setError(t('messages.error'));
        } finally {
            setDeleteLoading(false);
        }
    };

    // Handle change status
    const handleChangeStatus = async () => {
        if (!selectedReport || !user || !newStatus) return;

        setChangeStatusLoading(true);
        setError('');

        try {
            // Determine which API endpoint to use based on active tab
            const baseUrl = activeTab === 'sighting' ? '/api/admin/sighting-reports' : '/api/admin/reports';
            
            const action = newStatus === 'approved' ? 'approve' : 'reject';
            const response = await fetch(baseUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    reportId: selectedReport.id,
                    action: action,
                    rejectionReason: newStatus === 'rejected' ? rejectionReason : undefined
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change status');
            }

            setSuccessMessage(t('messages.statusChangeSuccess'));
            setShowChangeStatusModal(false);
            setSelectedReport(null);
            setNewStatus('');
            setRejectionReason('');
            
            // Refresh the reports list and stats
            fetchReports();
            fetchStats();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error changing status:', err);
            setError(t('messages.error'));
        } finally {
            setChangeStatusLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString(locale === 'ar' ? 'ar-MA-u-nu-latn' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status badge color
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        }
    };

    // Loading state - wait for auth and admin check to complete
    if (isAuthLoading || !isAdminChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 pt-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">{t('checkingAccess')}</p>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-20">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{tCommon('messages.loginRequired')}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{t('loginRequired')}</p>
                    <button
                        onClick={() => setIsLoginDialogOpen(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {tCommon('buttons.login')}
                    </button>
                </div>
                <LoginDialog 
                    isOpen={isLoginDialogOpen} 
                    onClose={() => setIsLoginDialogOpen(false)} 
                    defaultTab="login"
                />
            </div>
        );
    }

    // Not admin
    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pt-20">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('unauthorized')}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{t('unauthorizedMessage')}</p>
                    <Link
                        href="/"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                        {tCommon('buttons.backToHome')}
                    </Link>
                </div>
            </div>
        );
    }

    // Admin dashboard
    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
                        </div>
                    </div>
                    {adminRole && (
                        <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium shadow-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {adminRole}
                        </span>
                    )}
                </div>

                {/* Stats Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t('stats.overview')}
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Reports */}
                        <div 
                            onClick={() => setStatusFilter('all')}
                            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 cursor-pointer transition-all hover:shadow-lg ${
                                statusFilter === 'all' 
                                    ? 'border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-800' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('stats.totalReports')}</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pending Review */}
                        <div 
                            onClick={() => setStatusFilter('pending')}
                            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 cursor-pointer transition-all hover:shadow-lg ${
                                statusFilter === 'pending' 
                                    ? 'border-yellow-500 shadow-md ring-2 ring-yellow-200 dark:ring-yellow-800' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('stats.pendingReview')}</p>
                                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Approved */}
                        <div 
                            onClick={() => setStatusFilter('approved')}
                            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 cursor-pointer transition-all hover:shadow-lg ${
                                statusFilter === 'approved' 
                                    ? 'border-green-500 shadow-md ring-2 ring-green-200 dark:ring-green-800' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('stats.approved')}</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Rejected */}
                        <div 
                            onClick={() => setStatusFilter('rejected')}
                            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 cursor-pointer transition-all hover:shadow-lg ${
                                statusFilter === 'rejected' 
                                    ? 'border-red-500 shadow-md ring-2 ring-red-200 dark:ring-red-800' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('stats.rejected')}</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => {
                                setActiveTab('missing');
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'missing'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {t('tabs.missing')}
                            </span>
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('sighting');
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'sighting'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t('tabs.sightings')}
                            </span>
                        </button>
                    </nav>
                </div>

                {/* Search Bar and Refresh */}
                <div className="mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('search.placeholder')}
                                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        
                        {/* Refresh Button */}
                        <button
                            onClick={handleManualRefresh}
                            disabled={loading || isBackgroundRefreshing}
                            className={`flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                (loading || isBackgroundRefreshing) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={t('actions.refresh') || 'Refresh'}
                        >
                            <svg 
                                className={`w-5 h-5 ${isBackgroundRefreshing ? 'animate-spin' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="hidden sm:inline">{t('actions.refresh') || 'Refresh'}</span>
                        </button>
                    </div>
                    
                    {/* Search results and last refresh info */}
                    <div className="flex items-center justify-between mt-2">
                        <div>
                            {debouncedSearch && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('search.resultsFor')} "<span className="font-medium text-gray-700 dark:text-gray-300">{debouncedSearch}</span>"
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                            {isBackgroundRefreshing && (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                    {t('messages.updating') || 'Updating...'}
                                </span>
                            )}
                            {lastRefreshTime && !isBackgroundRefreshing && (
                                <span>
                                    {t('messages.lastUpdated') || 'Last updated'}: {lastRefreshTime.toLocaleTimeString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reports Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('loading')}</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('table.noReports')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {activeTab === 'missing' 
                                    ? 'No missing person reports have been submitted yet.'
                                    : 'No sighting reports have been submitted yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-gray-200 dark:divide-gray-600">
                            {reports.map((report, index) => (
                                <div 
                                    key={report.id} 
                                    className="bg-white dark:bg-[#1D2939] p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-[#1D2939]/80 transition-colors cursor-pointer"
                                >
                                    {/* Main Layout */}
                                    <div className="flex items-start gap-4">
                                        {/* Reporter Profile Picture - Main Focus */}
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (report.reporter) {
                                                        setSelectedUserProfile(report.reporter);
                                                        setShowProfileModal(true);
                                                    }
                                                }}
                                                className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                                                title={t('modal.viewProfile') || 'View Profile'}
                                            >
                                            {report.reporter?.profile_picture ? (
                                                <img 
                                                    src={report.reporter.profile_picture} 
                                                    alt={report.reporter.name || 'User'}
                                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
                                                    <span className="text-white font-semibold text-lg">
                                                        {(report.reporter?.name || report.reporter?.username || 'U').charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Reporter Name & ID */}
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (report.reporter) {
                                                            setSelectedUserProfile(report.reporter);
                                                            setShowProfileModal(true);
                                                        }
                                                    }}
                                                    className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none focus:underline"
                                                    title={t('modal.viewProfile') || 'View Profile'}
                                                >
                                                    {report.reporter?.first_name && report.reporter?.last_name 
                                                        ? `${report.reporter.first_name} ${report.reporter.last_name}`
                                                        : report.reporter?.name || report.reporter?.username || t('modal.anonymous')}
                                                </button>
                                                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                    ID: {report.reporter?.user_id || t('modal.notAvailable')}
                                                </span>
                                                {/* Status Badge */}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                                    report.status === 'approved' 
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                                                        : report.status === 'rejected' 
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' 
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        report.status === 'approved' ? 'bg-emerald-500' : report.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                                                    }`}></span>
                                                    {t(`status.${report.status || 'pending'}`)}
                                                </span>
                                            </div>

                                            {/* Report Info Row */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {/* Report Type */}
                                                <span className="inline-flex items-center gap-1">
                                                    <ReportTypeIcon type={report.report_type || 'person'} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                    <span className="font-medium">{t(`reportTypes.${report.report_type || 'person'}`)}</span>
                                                </span>
                                                
                                                {/* Location */}
                                                {report.city && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {report.city}
                                                    </span>
                                                )}
                                                
                                                {/* Date */}
                                                <span className="inline-flex items-center gap-1">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {formatDate(report.created_at)}
                                                </span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedReport(report);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    {t('actions.viewDetails')}
                                                </button>

                                                {(!report.status || report.status === 'pending') && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowApproveModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            {t('actions.approve')}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowRejectModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            {t('actions.reject')}
                                                        </button>
                                                    </>
                                                )}

                                                {(report.status === 'approved' || report.status === 'rejected') && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedReport(report);
                                                            setNewStatus(report.status === 'approved' ? 'rejected' : 'approved');
                                                            setRejectionReason('');
                                                            setShowChangeStatusModal(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        {t('actions.changeStatus')}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        setSelectedReport(report);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    {t('actions.delete')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t('pagination.showing')} {((pagination.page - 1) * pagination.limit) + 1} {t('pagination.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('pagination.of')} {pagination.total} {t('pagination.results')}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {t('pagination.previous')}
                                </button>
                                <button
                                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {t('pagination.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailModal(false)} />
                        <div className="relative bg-white dark:bg-[#101828] rounded-2xl shadow-2xl max-w-lg w-full mx-auto z-10 overflow-hidden border border-gray-200 dark:border-gray-700/50">
                            {/* Modal Header - Clean gradient with status indicator */}
                            <div className={`relative px-5 py-4 ${
                                selectedReport.status === 'approved' 
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600' 
                                    : selectedReport.status === 'rejected' 
                                        ? 'bg-gradient-to-r from-rose-500 to-pink-600' 
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                            }`}>
                                {/* Decorative pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                            <circle cx="1" cy="1" r="1" fill="white"/>
                                        </pattern>
                                        <rect width="100" height="100" fill="url(#grid)"/>
                                    </svg>
                                </div>
                                
                                <div className="relative flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                                <ReportTypeIcon type={selectedReport.report_type || 'person'} className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{t('modal.reportDetails')}</h3>
                                                <p className="text-xs text-white/80">
                                                    {t(`reportTypes.${selectedReport.report_type || 'person'}`)} • {t(`status.${selectedReport.status || 'pending'}`)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-white/70">{t('modal.reportId')}:</span>
                                            <code className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-white font-mono">
                                                {selectedReport.id}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedReport.id);
                                                    setCopiedReportId(true);
                                                    setTimeout(() => setCopiedReportId(false), 2000);
                                                }}
                                                className="p-1 hover:bg-white/20 rounded transition-colors"
                                                title={copiedReportId ? t('modal.copied') || 'Copied!' : t('modal.copyId') || 'Copy ID'}
                                            >
                                                {copiedReportId ? (
                                                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="px-4 py-4 max-h-[60vh] overflow-y-auto scrollbar-hide bg-gray-50 dark:bg-[#101828]">
                                {/* Photos Section */}
                                <div className="mb-4">
                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <div className="p-1 bg-blue-100 dark:bg-blue-500/20 rounded">
                                            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        {t('modal.photos')}
                                    </h4>
                                    {selectedReport.photos && selectedReport.photos.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedReport.photos.map((photo, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        setPreviewImages(selectedReport.photos);
                                                        setPreviewIndex(index);
                                                    }}
                                                    className="group relative"
                                                >
                                                    <img
                                                        src={photo}
                                                        alt={`Photo ${index + 1}`}
                                                        className="w-16 h-16 rounded-lg object-cover border-2 border-white dark:border-gray-600 shadow-md group-hover:scale-105 transition-all duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-[#1D2939] rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600/30">
                                            <div className="w-10 h-10 mx-auto mb-1 bg-gray-100 dark:bg-[#344054] rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.noPhotosAvailable')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Report Information - Type-based styling */}
                                <div className="mb-4 bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                    <h4 className={`text-xs font-semibold mb-3 flex items-center gap-2 ${
                                        selectedReport.report_type === 'person' ? 'text-blue-700 dark:text-blue-300' :
                                        selectedReport.report_type === 'pet' ? 'text-pink-700 dark:text-pink-300' :
                                        selectedReport.report_type === 'document' ? 'text-amber-700 dark:text-amber-300' :
                                        selectedReport.report_type === 'electronics' ? 'text-purple-700 dark:text-purple-300' :
                                        selectedReport.report_type === 'vehicle' ? 'text-cyan-700 dark:text-cyan-300' :
                                        'text-blue-700 dark:text-blue-300'
                                    }`}>
                                        <div className={`p-1 rounded ${
                                            selectedReport.report_type === 'person' ? 'bg-blue-100 dark:bg-blue-500/20' :
                                            selectedReport.report_type === 'pet' ? 'bg-pink-100 dark:bg-pink-500/20' :
                                            selectedReport.report_type === 'document' ? 'bg-amber-100 dark:bg-amber-500/20' :
                                            selectedReport.report_type === 'electronics' ? 'bg-purple-100 dark:bg-purple-500/20' :
                                            selectedReport.report_type === 'vehicle' ? 'bg-cyan-100 dark:bg-cyan-500/20' :
                                            'bg-blue-100 dark:bg-blue-500/20'
                                        }`}>
                                            <ReportTypeIcon type={selectedReport.report_type || 'person'} className="w-4 h-4" />
                                        </div>
                                        {t(`typeInfo.${selectedReport.report_type || 'person'}.title`) || t('modal.missingPersonInfo')}
                                        <span className={`ml-auto px-2.5 py-1 text-xs font-medium rounded-full ${getReportTypeColors(selectedReport.report_type || 'person')}`}>
                                            {t(`reportTypes.${selectedReport.report_type || 'person'}`)}
                                        </span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Person fields */}
                                        {(selectedReport.report_type === 'person' || !selectedReport.report_type) && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.person.name')}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                                        {selectedReport.details?.first_name || selectedReport.first_name} {selectedReport.details?.last_name || selectedReport.last_name}
                                                    </p>
                                                </div>
                                                {(selectedReport.details?.date_of_birth || selectedReport.date_of_birth) && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.person.dateOfBirth')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details?.date_of_birth || selectedReport.date_of_birth}</p>
                                                    </div>
                                                )}
                                                {(selectedReport.details?.gender || selectedReport.gender) && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.person.gender')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details?.gender || selectedReport.gender}</p>
                                                    </div>
                                                )}
                                                {(selectedReport.details?.health_status || selectedReport.health_status) && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.person.healthStatus')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details?.health_status || selectedReport.health_status}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Pet fields */}
                                        {selectedReport.report_type === 'pet' && selectedReport.details && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.pet.name')}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.pet_name || '-'}</p>
                                                </div>
                                                {selectedReport.details.pet_type && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.pet.petType')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.pet_type}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.breed && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.pet.breed')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.breed}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.color && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.pet.color')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.color}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.size && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.pet.size')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.size}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Document fields */}
                                        {selectedReport.report_type === 'document' && selectedReport.details && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.document.documentType')}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.document_type || '-'}</p>
                                                </div>
                                                {selectedReport.details.document_number && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.document.documentNumber')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white font-mono">{selectedReport.details.document_number}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.issuing_authority && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.document.issuingAuthority')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.issuing_authority}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.owner_name && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.document.ownerName')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.owner_name}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Electronics fields */}
                                        {selectedReport.report_type === 'electronics' && selectedReport.details && (
                                            <>
                                                {selectedReport.details.device_type && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.electronics.deviceType')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.device_type}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.brand && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.electronics.brand')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.brand}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.model && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.electronics.model')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.model}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.color && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.electronics.color')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.color}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.serial_number && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20 sm:col-span-2">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.electronics.serialNumber')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white font-mono">{selectedReport.details.serial_number}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Vehicle fields */}
                                        {selectedReport.report_type === 'vehicle' && selectedReport.details && (
                                            <>
                                                {selectedReport.details.vehicle_type && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.vehicle.vehicleType')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.vehicle_type}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.brand && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.vehicle.brand')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.brand}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.model && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.vehicle.model')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.model}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.year && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.vehicle.year')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.year}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.color && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.vehicle.color')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.color}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.plate_number && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.vehicle.plateNumber')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white font-mono">{selectedReport.details.plate_number}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Other item fields */}
                                        {selectedReport.report_type === 'other' && selectedReport.details && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.other.itemName')}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.item_name || '-'}</p>
                                                </div>
                                                {selectedReport.details.description && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20 sm:col-span-2">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.other.description')}</p>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.details.description}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {(selectedReport.details?.health_details || selectedReport.health_details) && selectedReport.report_type === 'person' && (
                                        <div className="mt-3 bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('typeInfo.person.healthDetails')}</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.details?.health_details || selectedReport.health_details}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Location Information */}
                                <div className="mb-4 bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                    <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                                        <div className="p-1 bg-emerald-100 dark:bg-emerald-500/20 rounded">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        {t('modal.locationInfo')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.city')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReport.city || '-'}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20 col-span-2">
                                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.lastKnownLocation')}</p>
                                            <p className="text-xs text-gray-700 dark:text-gray-300">{selectedReport.last_known_location || selectedReport.location_description || '-'}</p>
                                        </div>
                                        {selectedReport.coordinates && (
                                            <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20 col-span-2">
                                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.coordinates')}</p>
                                                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                                    {selectedReport.coordinates.lat}, {selectedReport.coordinates.lng}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Information */}
                                {selectedReport.additional_info && (
                                    <div className="mb-4 bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                            <div className="p-1 bg-gray-100 dark:bg-[#344054] rounded">
                                                <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            {t('modal.additionalInfo')}
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedReport.additional_info}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Reporter Contact Information */}
                                {(selectedReport.reporter_first_name || selectedReport.reporter_last_name || selectedReport.reporter_phone || selectedReport.reporter_email) && (
                                    <div className="mb-4 bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                        <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                            <div className="p-1 bg-indigo-100 dark:bg-indigo-500/20 rounded">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            {t('modal.reporterContact') || 'Reporter Contact'}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(selectedReport.reporter_first_name || selectedReport.reporter_last_name) && (
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20 col-span-2">
                                                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.reporterName') || 'Name'}</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {[selectedReport.reporter_first_name, selectedReport.reporter_last_name].filter(Boolean).join(' ') || '-'}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedReport.reporter_phone && (
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.reporterPhone') || 'Phone'}</p>
                                                    <a href={`tel:${selectedReport.reporter_phone}`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline" dir="ltr">
                                                        {selectedReport.reporter_phone}
                                                    </a>
                                                </div>
                                            )}
                                            {selectedReport.reporter_email && (
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.reporterEmail') || 'Email'}</p>
                                                    <a href={`mailto:${selectedReport.reporter_email}`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline" dir="ltr">
                                                        {selectedReport.reporter_email}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Report Status & Dates */}
                                <div className="bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <div className="p-1 bg-gray-100 dark:bg-[#344054] rounded">
                                            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        {t('modal.reportInfo')}
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.currentStatus')}</p>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(selectedReport.status || 'pending')}`}>
                                                {selectedReport.status === 'approved' && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                                {selectedReport.status === 'rejected' && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                {(!selectedReport.status || selectedReport.status === 'pending') && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                                {t(`status.${selectedReport.status || 'pending'}`)}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.submittedAt')}</p>
                                            <p className="text-xs font-medium text-gray-900 dark:text-white">{formatDate(selectedReport.created_at)}</p>
                                        </div>
                                        {selectedReport.updated_at && selectedReport.updated_at !== selectedReport.created_at && (
                                            <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.updatedAt')}</p>
                                                <p className="text-xs font-medium text-gray-900 dark:text-white">{formatDate(selectedReport.updated_at)}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedReport.status === 'rejected' && selectedReport.rejection_reason && (
                                        <div className="mt-3 bg-rose-50 dark:bg-rose-900/20 rounded p-2 border border-rose-200 dark:border-rose-800/50">
                                            <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                {t('modal.rejectionReason')}
                                            </p>
                                            <p className="text-xs text-rose-700 dark:text-rose-300">{selectedReport.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#1D2939] flex flex-wrap justify-end gap-2">
                                {selectedReport.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowApproveModal(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all font-medium shadow-md shadow-emerald-500/25"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {t('actions.approve')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowRejectModal(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all font-medium shadow-md shadow-rose-500/25"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {t('actions.reject')}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-[#344054] text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium border border-gray-200 dark:border-gray-600/30"
                                >
                                    {t('modal.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowApproveModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto z-10 p-6">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modal.confirmApproval')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('modal.confirmApprovalMessage')}</p>
                            </div>
                            <div className="flex gap-3 justify-center mt-6">
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className="flex-1 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                    disabled={actionLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={() => handleAction('approve')}
                                    className="flex-1 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('actions.approving')}
                                        </span>
                                    ) : t('modal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowRejectModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto z-10 p-6">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modal.confirmRejection')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('modal.confirmRejectionMessage')}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('modal.rejectionReason')}
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder={t('modal.rejectionReasonPlaceholder')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 justify-center mt-2">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason('');
                                    }}
                                    className="flex-1 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                    disabled={actionLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={() => handleAction('reject')}
                                    className="flex-1 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('actions.rejecting')}
                                        </span>
                                    ) : t('modal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto z-10 p-6">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modal.confirmDelete')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('modal.confirmDeleteMessage')}</p>
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        {t('modal.deleteWarning')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-center mt-6">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedReport(null);
                                    }}
                                    className="flex-1 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                    disabled={deleteLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('actions.deleting')}
                                        </span>
                                    ) : t('actions.delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            {showChangeStatusModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowChangeStatusModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto z-10 p-6">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modal.confirmStatusChange')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {t('modal.confirmStatusChangeFrom')} <span className="font-semibold">{t(`status.${selectedReport.status}`)}</span> {t('modal.confirmStatusChangeTo')} <span className="font-semibold">{t(`status.${newStatus}`)}</span>?
                                </p>
                            </div>
                            
                            {/* Show rejection reason field if changing to rejected */}
                            {newStatus === 'rejected' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('modal.rejectionReason')}
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder={t('modal.rejectionReasonPlaceholder')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        rows={3}
                                    />
                                </div>
                            )}
                            
                            <div className="flex gap-3 justify-center mt-6">
                                <button
                                    onClick={() => {
                                        setShowChangeStatusModal(false);
                                        setSelectedReport(null);
                                        setNewStatus('');
                                        setRejectionReason('');
                                    }}
                                    className="flex-1 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                    disabled={changeStatusLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={handleChangeStatus}
                                    className={`flex-1 px-5 py-2.5 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                        newStatus === 'approved' 
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' 
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                    }`}
                                    disabled={changeStatusLoading}
                                >
                                    {changeStatusLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('actions.changingStatus')}
                                        </span>
                                    ) : t('modal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Gallery Modal */}
            {previewImages.length > 0 && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    onClick={() => setPreviewImages([])}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') {
                            setPreviewIndex(prev => prev > 0 ? prev - 1 : previewImages.length - 1);
                        } else if (e.key === 'ArrowRight') {
                            setPreviewIndex(prev => prev < previewImages.length - 1 ? prev + 1 : 0);
                        } else if (e.key === 'Escape') {
                            setPreviewImages([]);
                        }
                    }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm" />
                    
                    {/* Close Button */}
                    <button
                        onClick={() => setPreviewImages([])}
                        className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image Counter */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                        {previewIndex + 1} / {previewImages.length}
                    </div>

                    {/* Previous Button */}
                    {previewImages.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewIndex(prev => prev > 0 ? prev - 1 : previewImages.length - 1);
                            }}
                            className="absolute left-4 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Next Button */}
                    {previewImages.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewIndex(prev => prev < previewImages.length - 1 ? prev + 1 : 0);
                            }}
                            className="absolute right-4 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                    
                    {/* Image Container with Touch Support */}
                    <div 
                        className="relative z-10 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-2xl max-w-[90vw] max-h-[90vh] touch-pan-y"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => {
                            const touch = e.touches[0];
                            e.currentTarget.dataset.touchStartX = touch.clientX;
                        }}
                        onTouchEnd={(e) => {
                            const touchStartX = parseFloat(e.currentTarget.dataset.touchStartX);
                            const touchEndX = e.changedTouches[0].clientX;
                            const diff = touchStartX - touchEndX;
                            if (Math.abs(diff) > 50) {
                                if (diff > 0) {
                                    setPreviewIndex(prev => prev < previewImages.length - 1 ? prev + 1 : 0);
                                } else {
                                    setPreviewIndex(prev => prev > 0 ? prev - 1 : previewImages.length - 1);
                                }
                            }
                        }}
                    >
                        <img
                            src={previewImages[previewIndex]}
                            alt={`Preview ${previewIndex + 1}`}
                            className="max-w-full max-h-[85vh] object-contain rounded-xl"
                            onError={(e) => {
                                e.target.src = '/icons/user-placeholder.svg';
                                e.target.className = 'w-64 h-64 object-contain rounded-xl bg-gray-100 dark:bg-gray-700 p-8';
                            }}
                        />
                    </div>

                    {/* Dot Indicators */}
                    {previewImages.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                            {previewImages.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewIndex(idx);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === previewIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* User Profile Modal */}
            {showProfileModal && selectedUserProfile && (
                <div className="fixed inset-0 z-[70] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 py-8">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowProfileModal(false)} />
                        <div className="relative bg-white dark:bg-[#101828] rounded-2xl shadow-2xl max-w-md w-full mx-auto z-10 overflow-hidden border border-gray-200 dark:border-gray-700/50">
                            {/* Modal Header with gradient */}
                            <div className="relative px-6 py-8 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
                                {/* Decorative pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <pattern id="profileGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                                            <circle cx="1" cy="1" r="1" fill="white"/>
                                        </pattern>
                                        <rect width="100" height="100" fill="url(#profileGrid)"/>
                                    </svg>
                                </div>
                                
                                {/* Close button */}
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {/* Profile Picture */}
                                <div className="flex flex-col items-center">
                                    {selectedUserProfile.profile_picture ? (
                                        <img 
                                            src={selectedUserProfile.profile_picture} 
                                            alt={selectedUserProfile.name || 'User'}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/50 shadow-lg">
                                            <span className="text-white font-bold text-3xl">
                                                {(selectedUserProfile.name || selectedUserProfile.username || 'U').charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="mt-4 text-xl font-bold text-white">
                                        {selectedUserProfile.first_name && selectedUserProfile.last_name 
                                            ? `${selectedUserProfile.first_name} ${selectedUserProfile.last_name}`
                                            : selectedUserProfile.name || selectedUserProfile.username || t('modal.anonymous')}
                                    </h3>
                                    {selectedUserProfile.username && (
                                        <p className="text-white/80 text-sm">@{selectedUserProfile.username}</p>
                                    )}
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="px-6 py-5 space-y-4">
                                {/* User ID */}
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1D2939] rounded-lg border border-gray-100 dark:border-gray-700/30">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('modal.userId') || 'User ID'}</p>
                                        <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{selectedUserProfile.user_id || selectedUserProfile.auth_id || t('modal.notAvailable')}</p>
                                    </div>
                                </div>

                                {/* Email */}
                                {selectedUserProfile.email && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1D2939] rounded-lg border border-gray-100 dark:border-gray-700/30">
                                        <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('modal.email') || 'Email'}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-900 dark:text-white truncate">{selectedUserProfile.email}</p>
                                                {selectedUserProfile.email_verified && (
                                                    <span className="flex-shrink-0 text-green-500" title={t('modal.verified') || 'Verified'}>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Phone */}
                                {selectedUserProfile.phone && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1D2939] rounded-lg border border-gray-100 dark:border-gray-700/30">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('modal.phone') || 'Phone'}</p>
                                            <p className="text-sm text-gray-900 dark:text-white" dir="ltr">{selectedUserProfile.phone}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Member Since */}
                                {selectedUserProfile.created_at && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1D2939] rounded-lg border border-gray-100 dark:border-gray-700/30">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('modal.memberSince') || 'Member Since'}</p>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {new Date(selectedUserProfile.created_at).toLocaleDateString(locale === 'ar' ? 'ar-MA-u-nu-latn' : 'en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#1D2939]">
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-[#344054] text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600/30"
                                >
                                    {t('modal.close') || 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
