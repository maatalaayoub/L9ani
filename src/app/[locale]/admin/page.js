"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import LoginDialog from '@/components/LoginDialog';

export default function AdminPage() {
    const { user, isAuthLoading } = useAuth();
    const router = useRouter();
    const t = useTranslations('admin');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';

    // Admin state
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [adminRole, setAdminRole] = useState(null);

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

    // Login dialog
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

    // Image preview state
    const [previewImage, setPreviewImage] = useState(null);

    // Check admin status
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsCheckingAdmin(false);
                setIsAdmin(false);
                return;
            }

            try {
                console.log('[Admin Page] Checking admin status for user:', user.id);
                const response = await fetch(`/api/admin/check?userId=${user.id}`);
                const data = await response.json();
                
                console.log('[Admin Page] Admin check response:', data);
                
                setIsAdmin(data.isAdmin);
                setAdminRole(data.role);
            } catch (err) {
                console.error('[Admin Page] Error checking admin status:', err);
                setIsAdmin(false);
            } finally {
                setIsCheckingAdmin(false);
            }
        };

        if (!isAuthLoading) {
            checkAdminStatus();
        }
    }, [user, isAuthLoading]);

    // Fetch stats for all statuses
    const fetchStats = useCallback(async () => {
        if (!user || !isAdmin) return;

        try {
            // Fetch counts for each status
            const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
                fetch(`/api/admin/reports?userId=${user.id}&type=${activeTab}&status=all&limit=1`),
                fetch(`/api/admin/reports?userId=${user.id}&type=${activeTab}&status=pending&limit=1`),
                fetch(`/api/admin/reports?userId=${user.id}&type=${activeTab}&status=approved&limit=1`),
                fetch(`/api/admin/reports?userId=${user.id}&type=${activeTab}&status=rejected&limit=1`)
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

    // Fetch reports
    const fetchReports = useCallback(async () => {
        if (!user || !isAdmin) return;

        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                userId: user.id,
                type: activeTab,
                status: statusFilter,
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            console.log('[Admin] Fetching reports with params:', params.toString());
            const response = await fetch(`/api/admin/reports?${params}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Admin] API Error:', response.status, errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch reports`);
            }

            const data = await response.json();
            console.log('[Admin] Fetched reports:', data);

            setReports(data.reports || []);
            setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 });
        } catch (err) {
            console.error('[Admin] Error fetching reports:', err);
            setError(err.message || t('messages.fetchError'));
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, activeTab, statusFilter, pagination.page, pagination.limit, t]);

    useEffect(() => {
        if (isAdmin) {
            fetchReports();
            fetchStats();
        }
    }, [isAdmin, fetchReports, fetchStats]);

    // Handle approve/reject actions
    const handleAction = async (action) => {
        if (!selectedReport) return;

        setActionLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    reportId: selectedReport.id,
                    type: activeTab,
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
            const response = await fetch(
                `/api/admin/reports?userId=${user.id}&reportId=${selectedReport.id}&type=${activeTab}`,
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
            const action = newStatus === 'approved' ? 'approve' : 'reject';
            const response = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    reportId: selectedReport.id,
                    type: activeTab,
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
        return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', {
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

    // Loading state
    if (isAuthLoading || isCheckingAdmin) {
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
                        <div className="grid gap-4 p-4">
                            {reports.map((report) => (
                                <div 
                                    key={report.id} 
                                    className={`bg-white dark:bg-gray-800 rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg ${
                                        report.status === 'approved' 
                                            ? 'border-green-200 dark:border-green-800' 
                                            : report.status === 'rejected' 
                                                ? 'border-red-200 dark:border-red-800' 
                                                : 'border-yellow-200 dark:border-yellow-800'
                                    }`}
                                >
                                    {/* Status Header Bar */}
                                    <div className={`px-4 py-2 flex items-center justify-between ${
                                        report.status === 'approved' 
                                            ? 'bg-green-50 dark:bg-green-900/30' 
                                            : report.status === 'rejected' 
                                                ? 'bg-red-50 dark:bg-red-900/30' 
                                                : 'bg-yellow-50 dark:bg-yellow-900/30'
                                    }`}>
                                        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${
                                            report.status === 'approved' 
                                                ? 'text-green-700 dark:text-green-300' 
                                                : report.status === 'rejected' 
                                                    ? 'text-red-700 dark:text-red-300' 
                                                    : 'text-yellow-700 dark:text-yellow-300'
                                        }`}>
                                            {report.status === 'approved' && (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            {report.status === 'rejected' && (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            {(!report.status || report.status === 'pending') && (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            {t(`status.${report.status || 'pending'}`)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                            #{report.id?.slice(0, 8)}
                                        </span>
                                    </div>

                                    <div className="p-5">
                                        <div className="flex flex-col lg:flex-row gap-5">
                                            {/* Photo Section - Clickable */}
                                            <div className="flex-shrink-0">
                                                {report.photos && report.photos.length > 0 ? (
                                                    <button
                                                        onClick={() => setPreviewImage(report.photos[0])}
                                                        className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl overflow-hidden"
                                                    >
                                                        <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-md bg-white dark:bg-gray-700">
                                                            <img
                                                                src={report.photos[0]}
                                                                alt={`${report.first_name} ${report.last_name}`}
                                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                                style={{ backgroundColor: '#f3f4f6' }}
                                                            />
                                                        </div>
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-2xl transition-all">
                                                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                            </svg>
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 shadow-md">
                                                        <svg className="w-12 h-12 text-blue-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info Section */}
                                            <div className="flex-1 min-w-0">
                                                {/* Person Info Card */}
                                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4 border border-blue-100 dark:border-blue-800">
                                                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        {t('modal.missingPersonInfo')}
                                                    </h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.fullName')}</p>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{report.first_name} {report.last_name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.city')}</p>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{report.city || '-'}</p>
                                                        </div>
                                                        {report.gender && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.gender')}</p>
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{report.gender}</p>
                                                            </div>
                                                        )}
                                                        {report.date_of_birth && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.dateOfBirth')}</p>
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{report.date_of_birth}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Location Info Card */}
                                                {(report.last_known_location || report.location_description) && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 border border-green-100 dark:border-green-800">
                                                        <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {t('modal.lastKnownLocation')}
                                                        </h4>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{report.last_known_location || report.location_description}</p>
                                                    </div>
                                                )}

                                                {/* Additional Info */}
                                                {report.additional_info && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
                                                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {t('modal.additionalInfo')}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic">"{report.additional_info}"</p>
                                                    </div>
                                                )}

                                                {/* Rejection Reason */}
                                                {report.status === 'rejected' && report.rejection_reason && (
                                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-4 border border-red-200 dark:border-red-800">
                                                        <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                            {t('modal.rejectionReason')}
                                                        </h4>
                                                        <p className="text-sm text-red-700 dark:text-red-300">{report.rejection_reason}</p>
                                                    </div>
                                                )}

                                                {/* Footer: Date & Actions */}
                                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            {t('modal.submittedAt')}: {formatDate(report.created_at)}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            {t('actions.view')}
                                                        </button>

                                                        {(!report.status || report.status === 'pending') && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedReport(report);
                                                                        setShowApproveModal(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    {t('actions.approve')}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedReport(report);
                                                                        setShowRejectModal(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                    {t('actions.reject')}
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Change Status button - only for approved/rejected reports */}
                                                        {(report.status === 'approved' || report.status === 'rejected') && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedReport(report);
                                                                    setNewStatus(report.status === 'approved' ? 'rejected' : 'approved');
                                                                    setRejectionReason('');
                                                                    setShowChangeStatusModal(true);
                                                                }}
                                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                                {t('actions.changeStatus')}
                                                            </button>
                                                        )}

                                                        {/* Delete button - for all reports */}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-200 dark:border-gray-600"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            {t('actions.delete')}
                                                        </button>
                                                    </div>
                                                </div>
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
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDetailModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full mx-auto z-10 overflow-hidden">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('modal.reportDetails')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {t('modal.reportId')}: <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{selectedReport.id?.slice(0, 8)}...</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                                {/* Photos Section */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {t('modal.photos')}
                                    </h4>
                                    {selectedReport.photos && selectedReport.photos.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {selectedReport.photos.map((photo, index) => (
                                                <img
                                                    key={index}
                                                    src={photo}
                                                    alt={`Photo ${index + 1}`}
                                                    className="w-28 h-28 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600 shadow-sm hover:scale-105 transition-transform cursor-pointer"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                                            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('modal.noPhotosAvailable')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Missing Person Information */}
                                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {t('modal.missingPersonInfo')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.fullName')}</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.first_name} {selectedReport.last_name}</p>
                                        </div>
                                        {selectedReport.date_of_birth && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.dateOfBirth')}</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.date_of_birth}</p>
                                            </div>
                                        )}
                                        {selectedReport.gender && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.gender')}</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.gender}</p>
                                            </div>
                                        )}
                                        {selectedReport.health_status && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.healthStatus')}</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.health_status}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedReport.health_details && (
                                        <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg p-3">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.healthDetails')}</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.health_details}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Location Information */}
                                <div className="mb-6 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {t('modal.locationInfo')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.city')}</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.city || '-'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:col-span-2">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.lastKnownLocation')}</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.last_known_location || selectedReport.location_description || '-'}</p>
                                        </div>
                                        {selectedReport.coordinates && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:col-span-2">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.coordinates')}</p>
                                                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                                    {selectedReport.coordinates.lat}, {selectedReport.coordinates.lng}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Reporter Information */}
                                <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                    <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {t('modal.reporterInfo')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:col-span-2">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.reporterId')}</p>
                                            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{selectedReport.user_id || '-'}</p>
                                        </div>
                                        {(selectedReport.reporter_first_name || selectedReport.reporter_last_name) && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.reporterName')}</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">
                                                    {selectedReport.reporter_first_name} {selectedReport.reporter_last_name}
                                                </p>
                                            </div>
                                        )}
                                        {selectedReport.reporter_phone && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.reporterPhone')}</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.reporter_phone}</p>
                                            </div>
                                        )}
                                        {selectedReport.reporter_email && (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:col-span-2">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.reporterEmail')}</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.reporter_email}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Information */}
                                {selectedReport.additional_info && (
                                    <div className="mb-6 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {t('modal.additionalInfo')}
                                        </h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedReport.additional_info}</p>
                                    </div>
                                )}

                                {/* Report Status & Dates */}
                                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        {t('modal.reportInfo')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.currentStatus')}</p>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${getStatusBadgeClass(selectedReport.status || 'pending')}`}>
                                                {selectedReport.status === 'approved' && (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                                {selectedReport.status === 'rejected' && (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                {(!selectedReport.status || selectedReport.status === 'pending') && (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                                {t(`status.${selectedReport.status || 'pending'}`)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.submittedAt')}</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedReport.created_at)}</p>
                                        </div>
                                        {selectedReport.updated_at && selectedReport.updated_at !== selectedReport.created_at && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.updatedAt')}</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedReport.updated_at)}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedReport.status === 'rejected' && selectedReport.rejection_reason && (
                                        <div className="mt-4 bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
                                            <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">{t('modal.rejectionReason')}</p>
                                            <p className="text-sm text-red-700 dark:text-red-300">{selectedReport.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-wrap justify-end gap-3">
                                {selectedReport.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowApproveModal(true);
                                            }}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {t('actions.approve')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowRejectModal(true);
                                            }}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {t('actions.reject')}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
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
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowApproveModal(false)} />
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
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    disabled={actionLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={() => handleAction('approve')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? t('actions.approving') : t('modal.confirm')}
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
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowRejectModal(false)} />
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
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason('');
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    disabled={actionLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={() => handleAction('reject')}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? t('actions.rejecting') : t('modal.confirm')}
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
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDeleteModal(false)} />
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
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedReport(null);
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    disabled={deleteLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? t('actions.deleting') : t('actions.delete')}
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
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowChangeStatusModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto z-10 p-6">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modal.confirmStatusChange')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {t('modal.confirmStatusChangeMessage', { 
                                        from: t(`status.${selectedReport.status}`), 
                                        to: t(`status.${newStatus}`) 
                                    })}
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
                            
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => {
                                        setShowChangeStatusModal(false);
                                        setSelectedReport(null);
                                        setNewStatus('');
                                        setRejectionReason('');
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    disabled={changeStatusLoading}
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={handleChangeStatus}
                                    className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                                        newStatus === 'approved' 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                    disabled={changeStatusLoading}
                                >
                                    {changeStatusLoading ? t('actions.changingStatus') : t('modal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm" />
                    
                    {/* Close Button */}
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    {/* Image Container */}
                    <div 
                        className="relative z-10 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-2xl max-w-[90vw] max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl"
                            onError={(e) => {
                                e.target.src = '/icons/user-placeholder.svg';
                                e.target.className = 'w-64 h-64 object-contain rounded-xl bg-gray-100 dark:bg-gray-700 p-8';
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
