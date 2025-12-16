"use client"

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { Link } from '@/i18n/navigation';
import LoginDialog from "@/components/LoginDialog";
import { supabase } from '@/lib/supabase';

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
    return icons[type] || icons.person;
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
    return colors[type] || colors.person;
};

// Helper to get display name for a report
const getReportDisplayName = (report) => {
    const { report_type, details } = report;
    
    if (!report_type || report_type === 'person') {
        return report.first_name && report.last_name 
            ? `${report.first_name} ${report.last_name}` 
            : report.first_name || 'Unknown';
    }
    
    if (!details) {
        return report.first_name || 'Unknown';
    }
    
    switch (report_type) {
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

// Report type labels
const getReportTypeLabel = (type, t) => {
    const labels = {
        person: t('reportTypes.person'),
        pet: t('reportTypes.pet'),
        document: t('reportTypes.document'),
        electronics: t('reportTypes.electronics'),
        vehicle: t('reportTypes.vehicle'),
        other: t('reportTypes.other')
    };
    return labels[type] || labels.person;
};

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
    
    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingReport, setDeletingReport] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    
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

    // Get status badge color (for compact badges)
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

    const openDetailModal = (report) => {
        setSelectedReport(report);
        setShowDetailModal(true);
    };

    const openEditModal = (report) => {
        setEditingReport(report);
        
        // Initialize form data based on report type
        const reportType = report.report_type || 'person';
        const details = report.details || {};
        
        const baseData = {
            city: report.city ?? '',
            lastKnownLocation: report.last_known_location ?? '',
            additionalInfo: report.additional_info ?? ''
        };
        
        let typeSpecificData = {};
        
        switch (reportType) {
            case 'person':
                typeSpecificData = {
                    firstName: details.first_name ?? report.first_name ?? '',
                    lastName: details.last_name ?? report.last_name ?? '',
                    dateOfBirth: details.date_of_birth ?? report.date_of_birth ?? '',
                    gender: details.gender ?? report.gender ?? '',
                    healthStatus: details.health_status ?? report.health_status ?? '',
                    healthDetails: details.health_details ?? report.health_details ?? ''
                };
                break;
            case 'pet':
                typeSpecificData = {
                    petName: details.pet_name ?? '',
                    petType: details.pet_type ?? '',
                    petBreed: details.breed ?? '',
                    petColor: details.color ?? '',
                    petSize: details.size ?? ''
                };
                break;
            case 'document':
                typeSpecificData = {
                    documentType: details.document_type ?? '',
                    documentNumber: details.document_number ?? '',
                    documentIssuer: details.issuing_authority ?? '',
                    ownerName: details.owner_name ?? ''
                };
                break;
            case 'electronics':
                typeSpecificData = {
                    deviceType: details.device_type ?? '',
                    deviceBrand: details.brand ?? '',
                    deviceModel: details.model ?? '',
                    deviceColor: details.color ?? '',
                    serialNumber: details.serial_number ?? ''
                };
                break;
            case 'vehicle':
                typeSpecificData = {
                    vehicleType: details.vehicle_type ?? '',
                    vehicleBrand: details.brand ?? '',
                    vehicleModel: details.model ?? '',
                    vehicleColor: details.color ?? '',
                    vehicleYear: details.year ?? '',
                    licensePlate: details.plate_number ?? ''
                };
                break;
            case 'other':
                typeSpecificData = {
                    itemName: details.item_name ?? '',
                    itemDescription: details.description ?? ''
                };
                break;
            default:
                typeSpecificData = {
                    firstName: details.first_name ?? report.first_name ?? '',
                    lastName: details.last_name ?? report.last_name ?? ''
                };
        }
        
        setEditFormData({ ...baseData, ...typeSpecificData });
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

            const reportType = editingReport.report_type || 'person';
            
            // Build request body based on report type
            const requestBody = {
                reportId: editingReport.id,
                reportType: reportType,
                city: editFormData.city,
                lastKnownLocation: editFormData.lastKnownLocation,
                additionalInfo: editFormData.additionalInfo || null,
                resubmit: resubmit
            };
            
            // Add type-specific fields
            switch (reportType) {
                case 'person':
                    requestBody.firstName = editFormData.firstName;
                    requestBody.lastName = editFormData.lastName;
                    requestBody.dateOfBirth = editFormData.dateOfBirth || null;
                    requestBody.gender = editFormData.gender || null;
                    requestBody.healthStatus = editFormData.healthStatus || null;
                    requestBody.healthDetails = editFormData.healthDetails || null;
                    break;
                case 'pet':
                    requestBody.petName = editFormData.petName;
                    requestBody.petType = editFormData.petType;
                    requestBody.petBreed = editFormData.petBreed || null;
                    requestBody.petColor = editFormData.petColor || null;
                    requestBody.petSize = editFormData.petSize || null;
                    break;
                case 'document':
                    requestBody.documentType = editFormData.documentType;
                    requestBody.documentNumber = editFormData.documentNumber || null;
                    requestBody.documentIssuer = editFormData.documentIssuer || null;
                    requestBody.ownerName = editFormData.ownerName || null;
                    break;
                case 'electronics':
                    requestBody.deviceType = editFormData.deviceType;
                    requestBody.deviceBrand = editFormData.deviceBrand;
                    requestBody.deviceModel = editFormData.deviceModel || null;
                    requestBody.deviceColor = editFormData.deviceColor || null;
                    requestBody.serialNumber = editFormData.serialNumber || null;
                    break;
                case 'vehicle':
                    requestBody.vehicleType = editFormData.vehicleType;
                    requestBody.vehicleBrand = editFormData.vehicleBrand;
                    requestBody.vehicleModel = editFormData.vehicleModel || null;
                    requestBody.vehicleColor = editFormData.vehicleColor || null;
                    requestBody.vehicleYear = editFormData.vehicleYear || null;
                    requestBody.licensePlate = editFormData.licensePlate || null;
                    break;
                case 'other':
                    requestBody.itemName = editFormData.itemName;
                    requestBody.itemDescription = editFormData.itemDescription || null;
                    break;
            }

            const response = await fetch('/api/reports/missing', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
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

    const openDeleteModal = (report) => {
        setDeletingReport(report);
        setDeleteError('');
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deletingReport) return;
        
        setDeleteLoading(true);
        setDeleteError('');

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
                setDeleteError(t('delete.errors.notLoggedIn') || 'You must be logged in');
                setDeleteLoading(false);
                return;
            }

            const response = await fetch(`/api/reports/missing?reportId=${deletingReport.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete report');
            }

            // Close modal and refresh reports
            setShowDeleteModal(false);
            setDeletingReport(null);
            await fetchReports();

        } catch (error) {
            console.error('[MyReport] Delete error:', error);
            setDeleteError(error.message || (t('delete.errors.failed') || 'Failed to delete report'));
        } finally {
            setDeleteLoading(false);
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {reports.map((report) => (
                            <div 
                                key={report.id} 
                                className="bg-white dark:bg-[#1D2939] rounded-xl border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-lg"
                            >
                                <div className="p-4 sm:p-5">
                                    {/* Top Row: Photo + Main Info */}
                                    <div className="flex gap-4">
                                        {/* Photo */}
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={() => report.photos?.[0] && setPreviewImage(report.photos[0])}
                                                className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg overflow-hidden"
                                                disabled={!report.photos?.[0]}
                                            >
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#344054]">
                                                    {report.photos && report.photos.length > 0 ? (
                                                        <img
                                                            src={report.photos[0]}
                                                            alt={getReportDisplayName(report)}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ReportTypeIcon type={report.report_type || 'person'} className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                {report.photos?.[0] && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-lg transition-all">
                                                        <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 min-w-0">
                                            {/* Title Row */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                    {getReportDisplayName(report)}
                                                </h3>
                                                {/* Status Badge */}
                                                <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
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

                                            {/* Info Row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                {/* Report Type */}
                                                <span className="inline-flex items-center gap-1.5">
                                                    <ReportTypeIcon type={report.report_type || 'person'} className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                    <span>{getReportTypeLabel(report.report_type || 'person', t)}</span>
                                                </span>
                                                
                                                {/* Location */}
                                                {report.city && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {report.city}
                                                    </span>
                                                )}
                                                
                                                {/* Date */}
                                                <span className="inline-flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {new Date(report.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rejection Reason - Shown only for rejected reports */}
                                    {report.status === 'rejected' && report.rejection_reason && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/50">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div>
                                                    <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-0.5">{t('rejectionReason') || 'Rejection Reason'}</p>
                                                    <p className="text-sm text-red-600 dark:text-red-300">{report.rejection_reason}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                        <button 
                                            onClick={() => openDetailModal(report)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
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
                                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                    report.status === 'rejected' 
                                                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50'
                                                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                {report.status === 'rejected' ? (t('editAndResubmit') || 'Resubmit') : (t('editButton') || 'Edit')}
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => openDeleteModal(report)}
                                            className="inline-flex items-center justify-center p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title={t('delete.title') || 'Delete'}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedReport && (
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailModal(false)} />
                        <div className="relative bg-white dark:bg-[#101828] rounded-2xl shadow-2xl max-w-lg w-full mx-auto z-[101] overflow-hidden border border-gray-200 dark:border-gray-700/50">
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
                                                <h3 className="text-lg font-bold text-white">{t('modal.title')}</h3>
                                                <p className="text-xs text-white/80">
                                                    {t(`reportTypes.${selectedReport.report_type || 'person'}`)} • {t(`status.${selectedReport.status || 'pending'}`)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-white/70">{t('modal.reportId')}:</span>
                                            <code className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-white font-mono truncate max-w-[200px]" title={selectedReport.id}>
                                                {selectedReport.id}
                                            </code>
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
                                                    onClick={() => setPreviewImage(photo)}
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
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('modal.noPhotos')}</p>
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
                                        {t('modal.missingPersonInfo')}
                                        <span className={`ml-auto px-2.5 py-1 text-xs font-medium rounded-full ${getReportTypeColors(selectedReport.report_type || 'person')}`}>
                                            {t(`reportTypes.${selectedReport.report_type || 'person'}`)}
                                        </span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Person fields */}
                                        {(selectedReport.report_type === 'person' || !selectedReport.report_type) && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.fullName')}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                                        {selectedReport.details?.first_name || selectedReport.first_name} {selectedReport.details?.last_name || selectedReport.last_name}
                                                    </p>
                                                </div>
                                                {(selectedReport.details?.date_of_birth || selectedReport.date_of_birth) && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.dateOfBirth')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details?.date_of_birth || selectedReport.date_of_birth}</p>
                                                    </div>
                                                )}
                                                {(selectedReport.details?.gender || selectedReport.gender) && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.gender')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details?.gender || selectedReport.gender}</p>
                                                    </div>
                                                )}
                                                {(selectedReport.details?.health_status || selectedReport.health_status) && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.healthStatus')}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details?.health_status || selectedReport.health_status}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Pet fields */}
                                        {selectedReport.report_type === 'pet' && selectedReport.details && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.petName') || 'Pet Name'}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.pet_name || '-'}</p>
                                                </div>
                                                {selectedReport.details.pet_type && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.petType') || 'Pet Type'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.pet_type}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.breed && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.breed') || 'Breed'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.breed}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.color && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.color') || 'Color'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.color}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Document fields */}
                                        {selectedReport.report_type === 'document' && selectedReport.details && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.documentType') || 'Document Type'}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.document_type || '-'}</p>
                                                </div>
                                                {selectedReport.details.document_number && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.documentNumber') || 'Document Number'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white font-mono">{selectedReport.details.document_number}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.owner_name && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.ownerName') || 'Owner Name'}</p>
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
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.deviceType') || 'Device Type'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.device_type}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.brand && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.brand') || 'Brand'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.brand}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.model && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.model') || 'Model'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.model}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.serial_number && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20 sm:col-span-2">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.serialNumber') || 'Serial Number'}</p>
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
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.vehicleType') || 'Vehicle Type'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.vehicle_type}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.brand && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.brand') || 'Brand'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.brand}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.model && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.model') || 'Model'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.model}</p>
                                                    </div>
                                                )}
                                                {selectedReport.details.plate_number && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.plateNumber') || 'Plate Number'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white font-mono">{selectedReport.details.plate_number}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Other item fields */}
                                        {selectedReport.report_type === 'other' && selectedReport.details && (
                                            <>
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.itemName') || 'Item Name'}</p>
                                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.item_name || '-'}</p>
                                                </div>
                                                {selectedReport.details.description && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20 sm:col-span-2">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.description') || 'Description'}</p>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.details.description}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {(selectedReport.details?.health_details || selectedReport.health_details) && selectedReport.report_type === 'person' && (
                                        <div className="mt-3 bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.healthDetails')}</p>
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
                                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.coordinates') || 'Coordinates'}</p>
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

                                {/* Report Status & Dates */}
                                <div className="bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <div className="p-1 bg-gray-100 dark:bg-[#344054] rounded">
                                            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        {t('modal.reportInfo') || 'Report Info'}
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
                                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.updatedAt') || 'Updated'}</p>
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

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
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
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 py-16 sm:py-8 text-center">
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => !editLoading && setShowEditModal(false)} />
                        <div className="relative bg-white dark:bg-[#101828] rounded-2xl shadow-xl max-w-2xl w-full mx-auto z-[101] overflow-hidden max-h-[calc(100vh-8rem)] sm:max-h-[85vh] overflow-y-auto scrollbar-hide border border-gray-200 dark:border-gray-700/50 my-4">
                            {/* Modal Header */}
                            <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-[#1D2939] dark:to-[#101828] z-10">
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
                                {/* Type-specific Fields */}
                                {(editingReport.report_type === 'person' || !editingReport.report_type) && (
                                    <>
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
                                    </>
                                )}

                                {/* Pet Fields */}
                                {editingReport.report_type === 'pet' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.petName') || 'Pet Name'} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.petName || ''}
                                                    onChange={(e) => handleEditFormChange('petName', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.petType') || 'Pet Type'} <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={editFormData.petType || ''}
                                                    onChange={(e) => handleEditFormChange('petType', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                >
                                                    <option value="">{t('edit.selectPetType') || 'Select Pet Type'}</option>
                                                    <option value="dog">{t('edit.petTypes.dog') || 'Dog'}</option>
                                                    <option value="cat">{t('edit.petTypes.cat') || 'Cat'}</option>
                                                    <option value="bird">{t('edit.petTypes.bird') || 'Bird'}</option>
                                                    <option value="other">{t('edit.petTypes.other') || 'Other'}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.petBreed') || 'Breed'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.petBreed || ''}
                                                    onChange={(e) => handleEditFormChange('petBreed', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.petColor') || 'Color'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.petColor || ''}
                                                    onChange={(e) => handleEditFormChange('petColor', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.petSize') || 'Size'}
                                                </label>
                                                <select
                                                    value={editFormData.petSize || ''}
                                                    onChange={(e) => handleEditFormChange('petSize', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                >
                                                    <option value="">{t('edit.selectSize') || 'Select Size'}</option>
                                                    <option value="small">{t('edit.sizes.small') || 'Small'}</option>
                                                    <option value="medium">{t('edit.sizes.medium') || 'Medium'}</option>
                                                    <option value="large">{t('edit.sizes.large') || 'Large'}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Document Fields */}
                                {editingReport.report_type === 'document' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.documentType') || 'Document Type'} <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={editFormData.documentType || ''}
                                                    onChange={(e) => handleEditFormChange('documentType', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                >
                                                    <option value="">{t('edit.selectDocumentType') || 'Select Document Type'}</option>
                                                    <option value="id_card">{t('edit.documentTypes.idCard') || 'ID Card'}</option>
                                                    <option value="passport">{t('edit.documentTypes.passport') || 'Passport'}</option>
                                                    <option value="driver_license">{t('edit.documentTypes.driverLicense') || 'Driver License'}</option>
                                                    <option value="other">{t('edit.documentTypes.other') || 'Other'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.documentNumber') || 'Document Number'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.documentNumber || ''}
                                                    onChange={(e) => handleEditFormChange('documentNumber', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.documentIssuer') || 'Issuing Authority'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.documentIssuer || ''}
                                                    onChange={(e) => handleEditFormChange('documentIssuer', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.ownerName') || 'Owner Name'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.ownerName || ''}
                                                    onChange={(e) => handleEditFormChange('ownerName', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Electronics Fields */}
                                {editingReport.report_type === 'electronics' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.deviceType') || 'Device Type'} <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={editFormData.deviceType || ''}
                                                    onChange={(e) => handleEditFormChange('deviceType', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                >
                                                    <option value="">{t('edit.selectDeviceType') || 'Select Device Type'}</option>
                                                    <option value="phone">{t('edit.deviceTypes.phone') || 'Phone'}</option>
                                                    <option value="laptop">{t('edit.deviceTypes.laptop') || 'Laptop'}</option>
                                                    <option value="tablet">{t('edit.deviceTypes.tablet') || 'Tablet'}</option>
                                                    <option value="other">{t('edit.deviceTypes.other') || 'Other'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.deviceBrand') || 'Brand'} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.deviceBrand || ''}
                                                    onChange={(e) => handleEditFormChange('deviceBrand', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.deviceModel') || 'Model'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.deviceModel || ''}
                                                    onChange={(e) => handleEditFormChange('deviceModel', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.deviceColor') || 'Color'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.deviceColor || ''}
                                                    onChange={(e) => handleEditFormChange('deviceColor', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.serialNumber') || 'Serial Number'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.serialNumber || ''}
                                                    onChange={(e) => handleEditFormChange('serialNumber', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Vehicle Fields */}
                                {editingReport.report_type === 'vehicle' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.vehicleType') || 'Vehicle Type'} <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={editFormData.vehicleType || ''}
                                                    onChange={(e) => handleEditFormChange('vehicleType', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                >
                                                    <option value="">{t('edit.selectVehicleType') || 'Select Vehicle Type'}</option>
                                                    <option value="car">{t('edit.vehicleTypes.car') || 'Car'}</option>
                                                    <option value="motorcycle">{t('edit.vehicleTypes.motorcycle') || 'Motorcycle'}</option>
                                                    <option value="bicycle">{t('edit.vehicleTypes.bicycle') || 'Bicycle'}</option>
                                                    <option value="other">{t('edit.vehicleTypes.other') || 'Other'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.vehicleBrand') || 'Brand'} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.vehicleBrand || ''}
                                                    onChange={(e) => handleEditFormChange('vehicleBrand', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.vehicleModel') || 'Model'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.vehicleModel || ''}
                                                    onChange={(e) => handleEditFormChange('vehicleModel', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.vehicleColor') || 'Color'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.vehicleColor || ''}
                                                    onChange={(e) => handleEditFormChange('vehicleColor', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.vehicleYear') || 'Year'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.vehicleYear || ''}
                                                    onChange={(e) => handleEditFormChange('vehicleYear', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.licensePlate') || 'License Plate'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.licensePlate || ''}
                                                    onChange={(e) => handleEditFormChange('licensePlate', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Other Item Fields */}
                                {editingReport.report_type === 'other' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('edit.itemName') || 'Item Name'} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.itemName || ''}
                                                onChange={(e) => handleEditFormChange('itemName', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('edit.itemDescription') || 'Item Description'}
                                            </label>
                                            <textarea
                                                value={editFormData.itemDescription || ''}
                                                onChange={(e) => handleEditFormChange('itemDescription', e.target.value)}
                                                rows={3}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Common Location Fields */}
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
                                    disabled={editLoading || !editFormData.city || !editFormData.lastKnownLocation || (
                                        (editingReport.report_type === 'person' || !editingReport.report_type) ? (!editFormData.firstName || !editFormData.lastName) :
                                        editingReport.report_type === 'pet' ? (!editFormData.petName || !editFormData.petType) :
                                        editingReport.report_type === 'document' ? !editFormData.documentType :
                                        editingReport.report_type === 'electronics' ? (!editFormData.deviceType || !editFormData.deviceBrand) :
                                        editingReport.report_type === 'vehicle' ? (!editFormData.vehicleType || !editFormData.vehicleBrand) :
                                        editingReport.report_type === 'other' ? !editFormData.itemName : false
                                    )}
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingReport && (
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 py-16 sm:py-8 text-center">
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => !deleteLoading && setShowDeleteModal(false)} />
                        <div className="relative bg-white dark:bg-[#101828] rounded-2xl shadow-xl max-w-md w-full mx-auto z-[101] overflow-hidden border border-gray-200 dark:border-gray-700/50 my-4">
                            {/* Modal Header */}
                            <div className="px-6 py-5 text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t('delete.title') || 'Delete Report'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('delete.message') || 'Are you sure you want to delete this report? This action cannot be undone.'}
                                </p>
                                
                                {/* Report Info */}
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1D2939] rounded-lg text-left border border-gray-100 dark:border-gray-700/30">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {deletingReport.first_name} {deletingReport.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {deletingReport.city} • {new Date(deletingReport.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                    </p>
                                </div>

                                {/* Warning */}
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        {t('delete.warning') || 'This action cannot be undone!'}
                                    </p>
                                </div>

                                {/* Error Message */}
                                {deleteError && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex gap-3">
                                <button
                                    onClick={() => !deleteLoading && setShowDeleteModal(false)}
                                    disabled={deleteLoading}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    {t('delete.cancel') || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleteLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('delete.deleting') || 'Deleting...'}
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            {t('delete.confirm') || 'Delete Report'}
                                        </>
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
