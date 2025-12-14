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
    const [statusFilter, setStatusFilter] = useState('pending');
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

    // Modal state
    const [selectedReport, setSelectedReport] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Login dialog
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

    // Check admin status
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsCheckingAdmin(false);
                return;
            }

            try {
                const response = await fetch(`/api/admin/check?userId=${user.id}`);
                const data = await response.json();
                
                setIsAdmin(data.isAdmin);
                setAdminRole(data.role);
            } catch (err) {
                console.error('Error checking admin status:', err);
                setIsAdmin(false);
            } finally {
                setIsCheckingAdmin(false);
            }
        };

        if (!isAuthLoading) {
            checkAdminStatus();
        }
    }, [user, isAuthLoading]);

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

            const response = await fetch(`/api/admin/reports?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch reports');
            }

            setReports(data.reports);
            setPagination(data.pagination);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(t('messages.fetchError'));
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, activeTab, statusFilter, pagination.page, pagination.limit, t]);

    useEffect(() => {
        if (isAdmin) {
            fetchReports();
        }
    }, [isAdmin, fetchReports]);

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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
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
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
                    {adminRole && (
                        <span className="inline-block mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            {adminRole}
                        </span>
                    )}
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
                            {t('tabs.missing')}
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
                            {t('tabs.sightings')}
                        </button>
                    </nav>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {['all', 'pending', 'approved', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setStatusFilter(status);
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {t(`filters.${status}`)}
                        </button>
                    ))}
                </div>

                {/* Reports Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('loading')}</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            {t('table.noReports')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('table.photo')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('table.name')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('table.city')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('table.submittedAt')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('table.status')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('table.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {report.photos && report.photos.length > 0 ? (
                                                    <img
                                                        src={report.photos[0]}
                                                        alt=""
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {report.first_name} {report.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {report.city || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(report.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(report.status || 'pending')}`}>
                                                    {t(`status.${report.status || 'pending'}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedReport(report);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        {t('actions.view')}
                                                    </button>
                                                    {report.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedReport(report);
                                                                    setShowApproveModal(true);
                                                                }}
                                                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                            >
                                                                {t('actions.approve')}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedReport(report);
                                                                    setShowRejectModal(true);
                                                                }}
                                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                            >
                                                                {t('actions.reject')}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('modal.reportDetails')}</h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                                {/* Photos */}
                                {selectedReport.photos && selectedReport.photos.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('modal.photos')}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedReport.photos.map((photo, index) => (
                                                <img
                                                    key={index}
                                                    src={photo}
                                                    alt=""
                                                    className="w-24 h-24 rounded-lg object-cover"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Person Info */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('modal.personInfo')}</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('modal.firstName')}:</span>
                                            <span className="ml-2 text-gray-900 dark:text-white">{selectedReport.first_name || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('modal.lastName')}:</span>
                                            <span className="ml-2 text-gray-900 dark:text-white">{selectedReport.last_name || '-'}</span>
                                        </div>
                                        {selectedReport.date_of_birth && (
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">{t('modal.dateOfBirth')}:</span>
                                                <span className="ml-2 text-gray-900 dark:text-white">{selectedReport.date_of_birth}</span>
                                            </div>
                                        )}
                                        {selectedReport.gender && (
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">{t('modal.gender')}:</span>
                                                <span className="ml-2 text-gray-900 dark:text-white">{selectedReport.gender}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Location Info */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('modal.locationInfo')}</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('modal.city')}:</span>
                                            <span className="ml-2 text-gray-900 dark:text-white">{selectedReport.city || '-'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-500 dark:text-gray-400">{t('modal.lastKnownLocation')}:</span>
                                            <span className="ml-2 text-gray-900 dark:text-white">{selectedReport.last_known_location || selectedReport.location_description || '-'}</span>
                                        </div>
                                        {selectedReport.coordinates && (
                                            <div className="col-span-2">
                                                <span className="text-gray-500 dark:text-gray-400">{t('modal.coordinates')}:</span>
                                                <span className="ml-2 text-gray-900 dark:text-white">
                                                    {selectedReport.coordinates.lat}, {selectedReport.coordinates.lng}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Info */}
                                {selectedReport.additional_info && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('modal.additionalInfo')}</h4>
                                        <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                            {selectedReport.additional_info}
                                        </p>
                                    </div>
                                )}

                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('table.status')}:</span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(selectedReport.status || 'pending')}`}>
                                        {t(`status.${selectedReport.status || 'pending'}`)}
                                    </span>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                                {selectedReport.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowApproveModal(true);
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            {t('actions.approve')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowRejectModal(true);
                                            }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            {t('actions.reject')}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
        </div>
    );
}
