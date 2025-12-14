"use client"

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { Link } from '@/i18n/navigation';
import LoginDialog from "@/components/LoginDialog";
import { supabase } from '@/lib/supabase';

export default function MyReport() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');
    const [selectedReport, setSelectedReport] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    
    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');
    
    const t = useTranslations('myreport');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';

    useEffect(() => {
        if (user) {
            fetchReports();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchReports = async () => {
        try {
            // Always get fresh token from Supabase session
            let token = null;
            
            if (supabase) {
                try {
                    // First try to get current session
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                    
                    if (sessionError) {
                        console.log('[MyReport] Session error:', sessionError.message);
                    }
                    
                    if (session?.access_token) {
                        token = session.access_token;
                        localStorage.setItem('supabase_token', token);
                        console.log('[MyReport] Using session token');
                    } else {
                        // No session - try to refresh
                        console.log('[MyReport] No active session, trying refresh...');
                        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                        
                        if (refreshError) {
                            console.log('[MyReport] Refresh error:', refreshError.message);
                        }
                        
                        if (refreshData?.session?.access_token) {
                            token = refreshData.session.access_token;
                            localStorage.setItem('supabase_token', token);
                            if (refreshData.session.refresh_token) {
                                localStorage.setItem('supabase_refresh_token', refreshData.session.refresh_token);
                            }
                            console.log('[MyReport] Got refreshed token');
                        } else {
                            // Last resort - try stored token
                            token = localStorage.getItem('supabase_token');
                            console.log('[MyReport] Fallback to stored token:', !!token);
                        }
                    }
                } catch (supabaseErr) {
                    console.error('[MyReport] Supabase error:', supabaseErr);
                    token = localStorage.getItem('supabase_token');
                }
            } else {
                // Supabase not available, use stored token
                token = localStorage.getItem('supabase_token');
                console.log('[MyReport] Supabase not available, using stored token');
            }

            if (!token) {
                console.log('[MyReport] No token available, user needs to log in');
                setLoading(false);
                return;
            }

            console.log('[MyReport] Fetching reports...');
            const response = await fetch('/api/reports/missing', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                console.error('[MyReport] API error:', response.status, data);
                if (response.status === 401) {
                    // Token is invalid - clear it so user can re-login
                    localStorage.removeItem('supabase_token');
                    localStorage.removeItem('supabase_refresh_token');
                    console.log('[MyReport] Cleared invalid tokens');
                }
                setReports([]);
                return;
            }

            console.log('[MyReport] Fetched', data.reports?.length || 0, 'reports');
            setReports(data.reports || []);
        } catch (error) {
            console.error('[MyReport] Error:', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'approved':
                return {
                    bg: 'bg-green-100 dark:bg-green-900/30',
                    text: 'text-green-700 dark:text-green-400',
                    border: 'border-green-200 dark:border-green-800',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            case 'rejected':
                return {
                    bg: 'bg-red-100 dark:bg-red-900/30',
                    text: 'text-red-700 dark:text-red-400',
                    border: 'border-red-200 dark:border-red-800',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            default:
                return {
                    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                    text: 'text-yellow-700 dark:text-yellow-400',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
        }
    };

    const openDetailModal = (report) => {
        setSelectedReport(report);
        setShowDetailModal(true);
    };

    const openEditModal = (report) => {
        setEditingReport(report);
        setEditFormData({
            firstName: report.first_name ?? '',
            lastName: report.last_name ?? '',
            dateOfBirth: report.date_of_birth ?? '',
            gender: report.gender ?? '',
            healthStatus: report.health_status ?? '',
            healthDetails: report.health_details ?? '',
            city: report.city ?? '',
            lastKnownLocation: report.last_known_location ?? '',
            additionalInfo: report.additional_info ?? ''
        });
        setEditError('');
        setEditSuccess('');
        setShowEditModal(true);
    };

    const handleEditFormChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSubmit = async (resubmit = false) => {
        setEditLoading(true);
        setEditError('');
        setEditSuccess('');

        try {
            // Get fresh token
            let token = null;
            if (supabase) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    token = session?.access_token;
                } catch (e) {
                    console.log('[MyReport] Error getting session:', e);
                }
            }
            if (!token) {
                token = localStorage.getItem('supabase_token');
            }

            if (!token) {
                setEditError(t('edit.errors.notLoggedIn') || 'You must be logged in');
                setEditLoading(false);
                return;
            }

            const response = await fetch('/api/reports/missing', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reportId: editingReport.id,
                    firstName: editFormData.firstName,
                    lastName: editFormData.lastName,
                    dateOfBirth: editFormData.dateOfBirth || null,
                    gender: editFormData.gender || null,
                    healthStatus: editFormData.healthStatus || null,
                    healthDetails: editFormData.healthDetails || null,
                    city: editFormData.city,
                    lastKnownLocation: editFormData.lastKnownLocation,
                    additionalInfo: editFormData.additionalInfo || null,
                    resubmit: resubmit
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update report');
            }

            setEditSuccess(resubmit ? (t('edit.success.resubmitted') || 'Report resubmitted successfully!') : (t('edit.success.updated') || 'Report updated successfully!'));
            
            // Refresh reports list
            await fetchReports();
            
            // Close modal after a short delay
            setTimeout(() => {
                setShowEditModal(false);
                setEditingReport(null);
            }, 1500);

        } catch (error) {
            console.error('[MyReport] Edit error:', error);
            setEditError(error.message || (t('edit.errors.failed') || 'Failed to update report'));
        } finally {
            setEditLoading(false);
        }
    };

    if (!user) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e] flex items-center justify-center px-4 pt-16">
                    <div className="text-center max-w-md">
                        <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{tCommon('messages.loginRequired')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">{tCommon('messages.pleaseLogin')}</p>
                    
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setLoginDialogTab('login');
                                    setIsLoginDialogOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                {tCommon('buttons.login')}
                            </button>
                            <button
                                onClick={() => {
                                    setLoginDialogTab('signup');
                                    setIsLoginDialogOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                {tCommon('buttons.createAccount')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <LoginDialog 
                    isOpen={isLoginDialogOpen} 
                    onClose={() => setIsLoginDialogOpen(false)}
                    initialTab={loginDialogTab}
                />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-28 sm:pb-28">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('subtitle')}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                        <svg className="w-20 h-20 mx-auto text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {t('noReports.title')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            {t('noReports.description')}
                        </p>
                        <Link href="/report-missing" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                            </svg>
                            {t('noReports.button')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {reports.map((report) => {
                            const statusConfig = getStatusConfig(report.status);
                            return (
                                <div 
                                    key={report.id} 
                                    className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border-2 ${statusConfig.border} hover:shadow-xl transition-all`}
                                >
                                    {/* Status Header */}
                                    <div className={`px-4 py-2 ${statusConfig.bg} flex items-center justify-between`}>
                                        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${statusConfig.text}`}>
                                            {statusConfig.icon}
                                            {t(`status.${report.status || 'pending'}`)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                            #{report.id?.slice(0, 8)}
                                        </span>
                                    </div>

                                    <div className="p-5">
                                        <div className="flex gap-5">
                                            {/* Photo */}
                                            <div className="flex-shrink-0">
                                                <button
                                                    onClick={() => report.photos?.[0] && setPreviewImage(report.photos[0])}
                                                    className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl overflow-hidden"
                                                    disabled={!report.photos?.[0]}
                                                >
                                                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                        {report.photos && report.photos.length > 0 ? (
                                                            <img
                                                                src={report.photos[0]}
                                                                alt={`${report.first_name} ${report.last_name}`}
                                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                                style={{ backgroundColor: '#f3f4f6' }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600">
                                                                <svg className="w-10 h-10 text-blue-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {report.photos?.[0] && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-xl transition-all">
                                                            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                {/* Person Info */}
                                                <div className="mb-3">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('card.name')}</p>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                                        {report.first_name} {report.last_name}
                                                    </h3>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('card.city')}</p>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{report.city || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('card.submitted')}</p>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {new Date(report.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Rejection Reason */}
                                                {report.status === 'rejected' && report.rejection_reason && (
                                                    <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                                                        <p className="text-xs text-red-600 dark:text-red-400">
                                                            <span className="font-semibold">{t('rejectionReason')}:</span> {report.rejection_reason}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <button 
                                                onClick={() => openDetailModal(report)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                {t('viewDetails')}
                                            </button>
                                            {(report.status === 'pending' || report.status === 'rejected') && (
                                                <button 
                                                    onClick={() => openEditModal(report)}
                                                    className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                                        report.status === 'rejected' 
                                                            ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                                >
                                                    {report.status === 'rejected' ? (t('editAndResubmit') || 'Edit & Resubmit') : t('edit')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailModal(false)} />
                        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full mx-auto z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('modal.title')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {t('modal.reportId')}: <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{selectedReport.id?.slice(0, 8)}...</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Status Card */}
                                <div className={`p-4 rounded-xl ${getStatusConfig(selectedReport.status).bg} ${getStatusConfig(selectedReport.status).border} border`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('modal.currentStatus')}</p>
                                            <span className={`inline-flex items-center gap-2 text-lg font-bold ${getStatusConfig(selectedReport.status).text}`}>
                                                {getStatusConfig(selectedReport.status).icon}
                                                {t(`status.${selectedReport.status || 'pending'}`)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('modal.submittedAt')}</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedReport.created_at)}</p>
                                        </div>
                                    </div>
                                    {selectedReport.status === 'rejected' && selectedReport.rejection_reason && (
                                        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">{t('modal.rejectionReason')}</p>
                                            <p className="text-sm text-red-700 dark:text-red-300">{selectedReport.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Missing Person Info */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {t('modal.missingPersonInfo')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.fullName')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReport.first_name} {selectedReport.last_name}</p>
                                        </div>
                                        {selectedReport.date_of_birth && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.dateOfBirth')}</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReport.date_of_birth}</p>
                                            </div>
                                        )}
                                        {selectedReport.gender && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.gender')}</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.gender}</p>
                                            </div>
                                        )}
                                        {selectedReport.health_status && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.healthStatus')}</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReport.health_status}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedReport.health_details && (
                                        <div className="mt-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.healthDetails')}</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.health_details}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Location Info */}
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
                                    <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {t('modal.locationInfo')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.city')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReport.city}</p>
                                        </div>
                                        {selectedReport.last_known_location && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.lastKnownLocation')}</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.last_known_location}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Info */}
                                {selectedReport.additional_info && (
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {t('modal.additionalInfo')}
                                        </h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedReport.additional_info}"</p>
                                    </div>
                                )}

                                {/* Photos */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {t('modal.photos')}
                                    </h4>
                                    {selectedReport.photos && selectedReport.photos.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-3">
                                            {selectedReport.photos.map((photo, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setPreviewImage(photo)}
                                                    className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors"
                                                >
                                                    <img
                                                        src={photo}
                                                        alt={`Photo ${index + 1}`}
                                                        className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                            <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('modal.noPhotos')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                                >
                                    {t('modal.close')}
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
                        />
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => !editLoading && setShowEditModal(false)} />
                        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full mx-auto z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {editingReport.status === 'rejected' ? (t('edit.titleResubmit') || 'Edit & Resubmit Report') : (t('edit.title') || 'Edit Report')}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {t('modal.reportId')}: <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{editingReport.id?.slice(0, 8)}...</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => !editLoading && setShowEditModal(false)}
                                        disabled={editLoading}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Rejection Notice */}
                            {editingReport.status === 'rejected' && editingReport.rejection_reason && (
                                <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-red-700 dark:text-red-400">{t('edit.rejectedNotice') || 'This report was rejected'}</p>
                                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{editingReport.rejection_reason}</p>
                                            <p className="text-xs text-red-500 dark:text-red-400 mt-2">{t('edit.resubmitHint') || 'Edit the information and resubmit for review.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Success/Error Messages */}
                            {editSuccess && (
                                <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <p className="text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {editSuccess}
                                    </p>
                                </div>
                            )}
                            {editError && (
                                <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                    <p className="text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {editError}
                                    </p>
                                </div>
                            )}

                            {/* Form */}
                            <div className="p-6 space-y-5">
                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('edit.firstName') || 'First Name'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.firstName || ''}
                                            onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('edit.lastName') || 'Last Name'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.lastName || ''}
                                            onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Date of Birth & Gender */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('edit.dateOfBirth') || 'Date of Birth'}
                                        </label>
                                        <input
                                            type="date"
                                            value={editFormData.dateOfBirth || ''}
                                            onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('edit.gender') || 'Gender'}
                                        </label>
                                        <select
                                            value={editFormData.gender || ''}
                                            onChange={(e) => handleEditFormChange('gender', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        >
                                            <option value="">{t('edit.selectGender') || 'Select Gender'}</option>
                                            <option value="male">{t('edit.male') || 'Male'}</option>
                                            <option value="female">{t('edit.female') || 'Female'}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Health Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('edit.healthStatus') || 'Health Status'}
                                        </label>
                                        <select
                                            value={editFormData.healthStatus || ''}
                                            onChange={(e) => handleEditFormChange('healthStatus', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        >
                                            <option value="">{t('edit.selectHealthStatus') || 'Select Health Status'}</option>
                                            <option value="healthy">{t('edit.healthy') || 'Healthy'}</option>
                                            <option value="medical_condition">{t('edit.medicalCondition') || 'Has Medical Condition'}</option>
                                            <option value="unknown">{t('edit.unknown') || 'Unknown'}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('edit.healthDetails') || 'Health Details'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editFormData.healthDetails || ''}
                                            onChange={(e) => handleEditFormChange('healthDetails', e.target.value)}
                                            placeholder={t('edit.healthDetailsPlaceholder') || 'Any medical conditions...'}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('edit.city') || 'City'} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.city || ''}
                                        onChange={(e) => handleEditFormChange('city', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('edit.lastKnownLocation') || 'Last Known Location'} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={editFormData.lastKnownLocation || ''}
                                        onChange={(e) => handleEditFormChange('lastKnownLocation', e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                                        required
                                    />
                                </div>

                                {/* Additional Info */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('edit.additionalInfo') || 'Additional Information'}
                                    </label>
                                    <textarea
                                        value={editFormData.additionalInfo || ''}
                                        onChange={(e) => handleEditFormChange('additionalInfo', e.target.value)}
                                        rows={3}
                                        placeholder={t('edit.additionalInfoPlaceholder') || 'Any other relevant details...'}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                                    />
                                </div>

                                {/* Photos Note */}
                                {editingReport?.photos && editingReport.photos.length > 0 && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {t('edit.photosNote') || 'Photos cannot be changed after submission. Current photos will be kept.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex gap-3">
                                <button
                                    onClick={() => !editLoading && setShowEditModal(false)}
                                    disabled={editLoading}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    {t('edit.cancel') || 'Cancel'}
                                </button>
                                <button
                                    onClick={() => handleEditSubmit(editingReport?.status === 'rejected')}
                                    disabled={editLoading || !editFormData.firstName || !editFormData.lastName || !editFormData.city || !editFormData.lastKnownLocation}
                                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                                        editingReport?.status === 'rejected'
                                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    {editLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('edit.saving') || 'Saving...'}
                                        </>
                                    ) : editingReport?.status === 'rejected' ? (
                                        t('edit.resubmit') || 'Save & Resubmit'
                                    ) : (
                                        t('edit.save') || 'Save Changes'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
