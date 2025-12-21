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

// Helper to get display name for a report (works for both missing and sighting reports)
const getReportDisplayName = (report, isSighting = false) => {
    const { report_type, details } = report;
    
    // For sighting reports, different field names are used
    if (isSighting) {
        if (!details) {
            return report_type === 'pet' ? 'Unknown Pet' : 'Unknown';
        }
        
        switch (report_type) {
            case 'person':
                // Sighting person has first_name/last_name in details
                return details.first_name && details.last_name 
                    ? `${details.first_name} ${details.last_name}` 
                    : details.first_name || details.last_name || 'Unknown';
            case 'pet':
                // Sighting pet has pet_type (not pet_name) - e.g., "Dog", "Cat"
                return details.pet_type || 'Unknown Pet';
            case 'document':
                return details.document_type || 'Unknown Document';
            case 'electronics':
                return `${details.brand || ''} ${details.model || ''}`.trim() || details.device_type || 'Unknown Device';
            case 'vehicle':
                return `${details.brand || ''} ${details.model || ''}`.trim() || details.vehicle_type || 'Unknown Vehicle';
            case 'other':
                return details.item_name || 'Unknown Item';
            default:
                return 'Unknown';
        }
    }
    
    // For missing reports (original behavior)
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
    const [sightingReports, setSightingReports] = useState([]);
    const [activeTab, setActiveTab] = useState('missing'); // 'missing' or 'sighting'
    const [loading, setLoading] = useState(true);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');
    const [selectedReport, setSelectedReport] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [previewImages, setPreviewImages] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    
    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');
    
    // Edit photos state
    const [editExistingPhotos, setEditExistingPhotos] = useState([]); // URLs of existing photos to keep
    const [editNewPhotos, setEditNewPhotos] = useState([]); // New File objects to upload
    const [editPhotosPreviews, setEditPhotosPreviews] = useState([]); // Preview URLs for new photos
    
    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingReport, setDeletingReport] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    
    // Copy Report ID state
    const [copiedReportId, setCopiedReportId] = useState(false);
    
    // Options dropdown menu state
    const [openMenuId, setOpenMenuId] = useState(null);
    
    const t = useTranslations('myreport');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openMenuId && !e.target.closest('.options-menu-container')) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    // Share report function
    const handleShare = async (report, platform) => {
        const reportName = getReportDisplayName(report, activeTab === 'sighting');
        const reportType = activeTab === 'sighting' ? t('tabs.sighting') : t('tabs.missing');
        const shareText = `${reportType}: ${reportName} - ${report.city || ''}`;
        const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
        
        switch (platform) {
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
                break;
            case 'copy':
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    alert(t('options.linkCopied') || 'Link copied!');
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
                break;
        }
        setOpenMenuId(null);
    };

    // Print report function - Creates a professional poster/flyer for street distribution
    const handlePrint = (report) => {
        const reportName = getReportDisplayName(report, activeTab === 'sighting');
        const isSighting = activeTab === 'sighting';
        const reportTypeLabel = isSighting ? (t('tabs.sighting') || 'Sighting Report') : (t('tabs.missing') || 'Missing Report');
        const mainPhoto = report.photos && report.photos.length > 0 ? report.photos[0] : null;
        const reportUrl = `${window.location.origin}/${locale}/report/${report.id}`;
        
        // Generate QR Code using a public API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reportUrl)}&bgcolor=ffffff&color=1f2937&margin=0`;
        
        // Get type-specific details
        let typeDetails = '';
        if (report.details) {
            switch (report.report_type) {
                case 'person':
                    if (report.details.gender) typeDetails += `${isRTL ? 'الجنس' : 'Gender'}: ${report.details.gender} | `;
                    if (report.details.approximate_age || report.date_of_birth) typeDetails += `${isRTL ? 'العمر' : 'Age'}: ${report.details.approximate_age || report.date_of_birth || '-'} | `;
                    break;
                case 'pet':
                    if (report.details.pet_type) typeDetails += `${isRTL ? 'النوع' : 'Type'}: ${report.details.pet_type} | `;
                    if (report.details.breed) typeDetails += `${isRTL ? 'السلالة' : 'Breed'}: ${report.details.breed} | `;
                    if (report.details.color || report.details.pet_color) typeDetails += `${isRTL ? 'اللون' : 'Color'}: ${report.details.color || report.details.pet_color} | `;
                    break;
                case 'document':
                    if (report.details.document_type) typeDetails += `${isRTL ? 'نوع الوثيقة' : 'Document'}: ${report.details.document_type} | `;
                    break;
                case 'electronics':
                    if (report.details.device_type) typeDetails += `${isRTL ? 'الجهاز' : 'Device'}: ${report.details.device_type} | `;
                    if (report.details.brand) typeDetails += `${isRTL ? 'العلامة' : 'Brand'}: ${report.details.brand} | `;
                    break;
                case 'vehicle':
                    if (report.details.vehicle_type) typeDetails += `${isRTL ? 'نوع المركبة' : 'Vehicle'}: ${report.details.vehicle_type} | `;
                    if (report.details.brand) typeDetails += `${isRTL ? 'العلامة' : 'Brand'}: ${report.details.brand} | `;
                    if (report.details.color || report.details.vehicle_color) typeDetails += `${isRTL ? 'اللون' : 'Color'}: ${report.details.color || report.details.vehicle_color} | `;
                    break;
            }
        }
        if (typeDetails.endsWith(' | ')) typeDetails = typeDetails.slice(0, -3);
        
        const headerText = isSighting 
            ? (isRTL ? 'تم العثور عليه' : 'FOUND')
            : (isRTL ? 'مفقود' : 'MISSING');
        
        const headerColor = isSighting ? '#059669' : '#dc2626';
        const headerBg = isSighting ? '#ecfdf5' : '#fef2f2';
        
        const printContent = `
            <!DOCTYPE html>
            <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${locale}">
            <head>
                <meta charset="UTF-8">
                <title>${reportName} - L9ani</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
                    
                    /* Remove browser header/footer (date, URL, page number) */
                    @page {
                        margin: 0;
                    }
                    
                    @media print {
                        html, body {
                            margin: 0;
                            padding: 0;
                        }
                    }
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { 
                        font-family: ${isRTL ? "'Tajawal', 'Arial'" : "'Inter', 'Arial'"}, sans-serif;
                        background: #f8fafc;
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    
                    .poster {
                        width: 100%;
                        max-width: 600px;
                        background: #ffffff;
                        border-radius: 24px;
                        overflow: hidden;
                    }
                    
                    /* Header Banner */
                    .header-banner {
                        background: linear-gradient(180deg, ${isSighting ? '#ecfdf5' : '#fff5f5'} 0%, #ffffff 70%);
                        padding: 18px 24px 18px;
                        position: relative;
                    }
                    
                    /* underline removed */
                    
                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: ${isSighting ? '#059669' : '#dc2626'};
                        color: #ffffff;
                        font-size: 24px;
                        font-weight: 800;
                        padding: 12px 20px;
                        border-radius: 18px;
                        border: 2px solid ${isSighting ? '#047857' : '#b91c1c'};
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                        box-shadow: 0 8px 20px ${isSighting ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'};
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .status-badge .status-icon {
                        width: 22px;
                        height: 22px;
                    }
                    
                    .logo-container {
                        direction: ltr;
                    }
                    
                    .logo {
                        display: flex;
                        align-items: center;
                    }
                    
                    .logo svg {
                        height: 44px;
                        width: auto;
                        direction: ltr;
                    }
                    
                    /* Photo Section */
                    .photo-section {
                        padding: 24px;
                        display: flex;
                        justify-content: center;
                    }
                    
                    .photo-container {
                        position: relative;
                        width: 100%;
                        max-width: 400px;
                    }
                    
                    .main-photo {
                        width: 100%;
                        aspect-ratio: 1;
                        object-fit: cover;
                        border-radius: 20px;
                        box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
                    }
                    
                    .no-photo {
                        width: 100%;
                        aspect-ratio: 1;
                        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                        border-radius: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                    }
                    
                    .no-photo svg {
                        width: 80px;
                        height: 80px;
                        margin-bottom: 16px;
                    }
                    
                    .no-photo span {
                        font-size: 18px;
                        font-weight: 500;
                    }
                    
                    /* Info Section */
                    .info-section {
                        padding: 0 24px 8px;
                    }
                    
                    .name-title {
                        text-align: center;
                        font-size: 36px;
                        font-weight: 800;
                        color: #0f172a;
                        margin-bottom: 16px;
                        line-height: 1.2;
                        text-transform: capitalize;
                    }
                    
                    .type-badge {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 16px;
                    }
                    
                    .type-badge span {
                        background: #f1f5f9;
                        color: #475569;
                        padding: 6px 16px;
                        border-radius: 50px;
                        font-size: 14px;
                        font-weight: 600;
                    }
                    
                    .details-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                        margin-bottom: 8px;
                    }
                    
                    .detail-card {
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 14px 16px;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .detail-card.full-width {
                        grid-column: span 2;
                    }
                    
                    .detail-label {
                        font-size: 11px;
                        font-weight: 600;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 4px;
                    }
                    
                    .detail-value {
                        font-size: 16px;
                        font-weight: 600;
                        color: #1e293b;
                    }
                    
                    .type-details {
                        text-align: center;
                        font-size: 14px;
                        color: #64748b;
                        margin-bottom: 16px;
                        padding: 12px;
                        background: #fefce8;
                        border-radius: 10px;
                        border: 1px dashed #facc15;
                    }
                    
                    /* Contact Section */
                    .contact-section {
                        background: #f1f5f9;
                        border-radius: 12px;
                        padding: 12px 24px;
                        text-align: center;
                        color: #0f172a;
                        margin: 8px 24px;
                    }
                    
                    .contact-title {
                        font-size: 13px;
                        font-weight: 600;
                        color: #475569;
                        margin-bottom: 6px;
                    }
                    
                    .contact-phone {
                        font-size: 28px;
                        font-weight: 800;
                        letter-spacing: 1px;
                        line-height: 1.3;
                        color: #0f172a;
                        direction: ltr;
                    }
                    
                    /* Footer Section */
                    .footer-section {
                        padding: 20px 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    .footer-info {
                        flex: 1;
                    }
                    
                    .report-id {
                        font-size: 11px;
                        color: #94a3b8;
                        margin-bottom: 4px;
                    }
                    
                    .report-id-value {
                        font-size: 12px;
                        font-weight: 600;
                        color: #64748b;
                        font-family: monospace;
                        word-break: break-all;
                    }
                    
                    .scan-text {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 8px;
                    }
                    
                    .qr-section {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .qr-code {
                        width: 100px;
                        height: 100px;
                        border-radius: 12px;
                        border: 3px solid #e2e8f0;
                        background: white;
                        padding: 4px;
                    }
                    
                    .qr-label {
                        font-size: 10px;
                        color: #94a3b8;
                        margin-top: 6px;
                        text-align: center;
                    }
                    
                    /* Print Styles */
                    @media print {
                        body {
                            background: white;
                            padding: 0;
                        }
                        
                        .poster {
                            max-width: 100%;
                            box-shadow: none;
                            border-radius: 0;
                        }
                        
                        .main-photo {
                            border-radius: 16px;
                        }
                        
                        .qr-code,
                        .status-badge,
                        .header-banner::after,
                        .logo svg {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                </style>
            </head>
            <body>
                <div class="poster">
                    <!-- Header Banner -->
                    <div class="header-banner">
                        <div class="header-content">
                            <div class="header-left">
                                <div class="status-badge">
                                    ${isSighting ? `
                                        <svg class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    ` : `
                                        <svg class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                        </svg>
                                    `}
                                    ${headerText}
                                </div>
                            </div>
                            <div class="logo-container">
                                <div class="logo">
                                    <svg width="140" height="40" viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
                                        <!-- Background circle for search icon -->
                                        <circle cx="25" cy="25" r="20" fill="#4A3FF6" opacity="0.1"/>
                                        <!-- Search magnifying glass -->
                                        <circle cx="22" cy="22" r="10" fill="none" stroke="#4A3FF6" stroke-width="2.5"/>
                                        <line x1="29" y1="29" x2="36" y2="36" stroke="#4A3FF6" stroke-width="2.5" stroke-linecap="round"/>
                                        <!-- Person icon inside magnifying glass -->
                                        <circle cx="22" cy="20" r="3" fill="#4A3FF6"/>
                                        <path d="M 22 24 Q 18 24 17 27 L 27 27 Q 26 24 22 24 Z" fill="#4A3FF6"/>
                                        <!-- Text: Lqani.ma -->
                                        <text x="48" y="32" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#4A3FF6">
                                            Lqani<tspan font-weight="400" opacity="0.7">.ma</tspan>
                                        </text>
                                        <!-- Decorative dots -->
                                        <circle cx="45" cy="40" r="1.5" fill="#4A3FF6" opacity="0.5"/>
                                        <circle cx="55" cy="42" r="1.5" fill="#4A3FF6" opacity="0.5"/>
                                        <circle cx="65" cy="40" r="1.5" fill="#4A3FF6" opacity="0.5"/>
                                        <line x1="45" y1="40" x2="55" y2="42" stroke="#4A3FF6" stroke-width="0.5" opacity="0.3"/>
                                        <line x1="55" y1="42" x2="65" y2="40" stroke="#4A3FF6" stroke-width="0.5" opacity="0.3"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Photo Section -->
                    <div class="photo-section">
                        <div class="photo-container">
                            ${mainPhoto ? `
                                <img src="${mainPhoto}" alt="${reportName}" class="main-photo" />
                            ` : `
                                <div class="no-photo">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span>${isRTL ? 'لا توجد صورة' : 'No Photo Available'}</span>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- Info Section -->
                    <div class="info-section">
                        <h1 class="name-title">${reportName}</h1>
                        
                        <div class="details-grid">
                            <div class="detail-card">
                                <div class="detail-label">${isRTL ? 'المدينة' : 'City'}</div>
                                <div class="detail-value">${report.city || '-'}</div>
                            </div>
                            <div class="detail-card">
                                <div class="detail-label">${isRTL ? 'التاريخ' : 'Date'}</div>
                                <div class="detail-value">${new Date(report.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                            ${report.location_description ? `
                                <div class="detail-card full-width">
                                    <div class="detail-label">${isRTL ? 'آخر موقع معروف' : 'Last Known Location'}</div>
                                    <div class="detail-value">${report.location_description}</div>
                                </div>
                            ` : ''}
                            ${report.additional_info ? `
                                <div class="detail-card full-width">
                                    <div class="detail-label">${isRTL ? 'معلومات إضافية' : 'Additional Info'}</div>
                                    <div class="detail-value">${report.additional_info}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Contact Section -->
                    ${report.reporter_phone ? `
                        <div class="contact-section">
                            <div class="contact-title">${isRTL ? 'للتواصل اتصل على' : 'If found, please contact'}</div>
                            <div class="contact-phone">${report.reporter_phone}</div>
                        </div>
                    ` : ''}
                    
                    <!-- Footer Section with QR Code -->
                    <div class="footer-section">
                        <div class="footer-info">
                            <div class="report-id">${isRTL ? 'معرف البلاغ' : 'Report ID'}</div>
                            <div class="report-id-value">${report.id}</div>
                            <div class="scan-text">${isRTL ? 'امسح رمز QR للمزيد من التفاصيل' : 'Scan QR code for more details'}</div>
                        </div>
                        <div class="qr-section">
                            <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
                            <div class="qr-label">l9ani.ma</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
            // Small delay to ensure QR code and images are loaded
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
        setOpenMenuId(null);
    };

    // Download report as PDF - Uses same poster template but triggers save dialog
    const handleDownloadPDF = (report) => {
        const reportName = getReportDisplayName(report, activeTab === 'sighting');
        const isSighting = activeTab === 'sighting';
        const reportTypeLabel = isSighting ? (t('tabs.sighting') || 'Sighting Report') : (t('tabs.missing') || 'Missing Report');
        const mainPhoto = report.photos && report.photos.length > 0 ? report.photos[0] : null;
        const reportUrl = `${window.location.origin}/${locale}/report/${report.id}`;
        
        // Generate QR Code using a public API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reportUrl)}&bgcolor=ffffff&color=1f2937&margin=0`;
        
        // Status text
        const headerText = isSighting 
            ? (isRTL ? 'تمت المشاهدة' : 'FOUND') 
            : (isRTL ? 'مفقود' : 'MISSING');
        
        // Create the same poster HTML but with PDF-specific styling
        const pdfContent = `
            <!DOCTYPE html>
            <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${locale}">
            <head>
                <meta charset="UTF-8">
                <title>${reportName} - L9ani</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
                    
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    @media print {
                        html, body {
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { 
                        font-family: ${isRTL ? "'Tajawal', 'Arial'" : "'Inter', 'Arial'"}, sans-serif;
                        background: #ffffff;
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        padding: 20px;
                    }
                    
                    .poster {
                        width: 100%;
                        max-width: 600px;
                        background: #ffffff;
                        border-radius: 24px;
                        overflow: hidden;
                    }
                    
                    .header-banner {
                        background: linear-gradient(180deg, ${isSighting ? '#ecfdf5' : '#fff5f5'} 0%, #ffffff 70%);
                        padding: 18px 24px 18px;
                        position: relative;
                    }
                    
                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: ${isSighting ? '#059669' : '#dc2626'};
                        color: #ffffff;
                        font-size: 24px;
                        font-weight: 800;
                        padding: 12px 20px;
                        border-radius: 18px;
                        border: 2px solid ${isSighting ? '#047857' : '#b91c1c'};
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                        box-shadow: 0 8px 20px ${isSighting ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'};
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .status-badge .status-icon {
                        width: 22px;
                        height: 22px;
                    }
                    
                    .logo-container {
                        direction: ltr;
                    }
                    
                    .logo {
                        display: flex;
                        align-items: center;
                    }
                    
                    .logo svg {
                        height: 44px;
                        width: auto;
                        direction: ltr;
                    }
                    
                    .photo-section {
                        padding: 24px;
                        display: flex;
                        justify-content: center;
                    }
                    
                    .photo-container {
                        position: relative;
                        width: 100%;
                        max-width: 400px;
                    }
                    
                    .main-photo {
                        width: 100%;
                        aspect-ratio: 1;
                        object-fit: cover;
                        border-radius: 20px;
                        box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
                    }
                    
                    .no-photo {
                        width: 100%;
                        aspect-ratio: 1;
                        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                        border-radius: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                    }
                    
                    .no-photo svg {
                        width: 80px;
                        height: 80px;
                        margin-bottom: 16px;
                    }
                    
                    .no-photo span {
                        font-size: 18px;
                        font-weight: 500;
                    }
                    
                    .info-section {
                        padding: 0 24px 8px;
                    }
                    
                    .name-title {
                        text-align: center;
                        font-size: 36px;
                        font-weight: 800;
                        color: #0f172a;
                        margin-bottom: 16px;
                        line-height: 1.2;
                        text-transform: capitalize;
                    }
                    
                    .details-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                        margin-bottom: 8px;
                    }
                    
                    .detail-card {
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 14px 16px;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .detail-card.full-width {
                        grid-column: span 2;
                    }
                    
                    .detail-label {
                        font-size: 11px;
                        font-weight: 600;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 4px;
                    }
                    
                    .detail-value {
                        font-size: 16px;
                        font-weight: 600;
                        color: #1e293b;
                    }
                    
                    .contact-section {
                        background: #f1f5f9;
                        border-radius: 12px;
                        padding: 12px 24px;
                        text-align: center;
                        color: #0f172a;
                        margin: 8px 24px;
                    }
                    
                    .contact-title {
                        font-size: 13px;
                        font-weight: 600;
                        color: #475569;
                        margin-bottom: 6px;
                    }
                    
                    .contact-phone {
                        font-size: 28px;
                        font-weight: 800;
                        letter-spacing: 1px;
                        line-height: 1.3;
                        color: #0f172a;
                        direction: ltr;
                    }
                    
                    .footer-section {
                        padding: 20px 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    .footer-info {
                        flex: 1;
                    }
                    
                    .report-id {
                        font-size: 11px;
                        color: #94a3b8;
                        margin-bottom: 4px;
                    }
                    
                    .report-id-value {
                        font-size: 12px;
                        font-weight: 600;
                        color: #64748b;
                        font-family: monospace;
                        word-break: break-all;
                    }
                    
                    .scan-text {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 8px;
                    }
                    
                    .qr-section {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .qr-code {
                        width: 80px;
                        height: 80px;
                        border-radius: 8px;
                    }
                    
                    .qr-label {
                        font-size: 10px;
                        font-weight: 600;
                        color: #64748b;
                        margin-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="poster">
                    <div class="header-banner">
                        <div class="header-content">
                            <div class="header-left">
                                <div class="status-badge">
                                    ${isSighting ? `
                                        <svg class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    ` : `
                                        <svg class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                        </svg>
                                    `}
                                    ${headerText}
                                </div>
                            </div>
                            <div class="logo-container">
                                <div class="logo">
                                    <svg width="140" height="40" viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="25" cy="25" r="20" fill="#4A3FF6" opacity="0.1"/>
                                        <circle cx="22" cy="22" r="10" fill="none" stroke="#4A3FF6" stroke-width="2.5"/>
                                        <line x1="29" y1="29" x2="36" y2="36" stroke="#4A3FF6" stroke-width="2.5" stroke-linecap="round"/>
                                        <circle cx="22" cy="20" r="3" fill="#4A3FF6"/>
                                        <path d="M 22 24 Q 18 24 17 27 L 27 27 Q 26 24 22 24 Z" fill="#4A3FF6"/>
                                        <text x="48" y="32" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#4A3FF6">
                                            Lqani<tspan font-weight="400" opacity="0.7">.ma</tspan>
                                        </text>
                                        <circle cx="45" cy="40" r="1.5" fill="#4A3FF6" opacity="0.5"/>
                                        <circle cx="55" cy="42" r="1.5" fill="#4A3FF6" opacity="0.5"/>
                                        <circle cx="65" cy="40" r="1.5" fill="#4A3FF6" opacity="0.5"/>
                                        <line x1="45" y1="40" x2="55" y2="42" stroke="#4A3FF6" stroke-width="0.5" opacity="0.3"/>
                                        <line x1="55" y1="42" x2="65" y2="40" stroke="#4A3FF6" stroke-width="0.5" opacity="0.3"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="photo-section">
                        <div class="photo-container">
                            ${mainPhoto ? `
                                <img src="${mainPhoto}" alt="${reportName}" class="main-photo" />
                            ` : `
                                <div class="no-photo">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span>${isRTL ? 'لا توجد صورة' : 'No Photo Available'}</span>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h1 class="name-title">${reportName}</h1>
                        
                        <div class="details-grid">
                            <div class="detail-card">
                                <div class="detail-label">${isRTL ? 'المدينة' : 'City'}</div>
                                <div class="detail-value">${report.city || '-'}</div>
                            </div>
                            <div class="detail-card">
                                <div class="detail-label">${isRTL ? 'التاريخ' : 'Date'}</div>
                                <div class="detail-value">${new Date(report.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                            ${report.location_description ? `
                                <div class="detail-card full-width">
                                    <div class="detail-label">${isRTL ? 'آخر موقع معروف' : 'Last Known Location'}</div>
                                    <div class="detail-value">${report.location_description}</div>
                                </div>
                            ` : ''}
                            ${report.additional_info ? `
                                <div class="detail-card full-width">
                                    <div class="detail-label">${isRTL ? 'معلومات إضافية' : 'Additional Info'}</div>
                                    <div class="detail-value">${report.additional_info}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${report.reporter_phone ? `
                        <div class="contact-section">
                            <div class="contact-title">${isRTL ? 'للتواصل اتصل على' : 'If found, please contact'}</div>
                            <div class="contact-phone">${report.reporter_phone}</div>
                        </div>
                    ` : ''}
                    
                    <div class="footer-section">
                        <div class="footer-info">
                            <div class="report-id">${isRTL ? 'معرف البلاغ' : 'Report ID'}</div>
                            <div class="report-id-value">${report.id}</div>
                            <div class="scan-text">${isRTL ? 'امسح رمز QR للمزيد من التفاصيل' : 'Scan QR code for more details'}</div>
                        </div>
                        <div class="qr-section">
                            <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
                            <div class="qr-label">l9ani.ma</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Open in new window and trigger print dialog (user can select "Save as PDF")
        const pdfWindow = window.open('', '_blank');
        pdfWindow.document.write(pdfContent);
        pdfWindow.document.close();
        pdfWindow.onload = () => {
            setTimeout(() => {
                pdfWindow.print();
            }, 600);
        };
        setOpenMenuId(null);
    };

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
            
            // Fetch both missing and sighting reports in parallel
            const [missingResponse, sightingResponse] = await Promise.all([
                fetch('/api/reports/missing', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch('/api/reports/sighting', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            const missingData = await missingResponse.json();
            const sightingData = await sightingResponse.json();
            
            if (!missingResponse.ok) {
                console.error('[MyReport] Missing API error:', missingResponse.status, missingData);
                if (missingResponse.status === 401) {
                    // Token is invalid - clear it so user can re-login
                    localStorage.removeItem('supabase_token');
                    localStorage.removeItem('supabase_refresh_token');
                    console.log('[MyReport] Cleared invalid tokens');
                }
                setReports([]);
            } else {
                console.log('[MyReport] Fetched', missingData.reports?.length || 0, 'missing reports');
                setReports(missingData.reports || []);
            }

            if (!sightingResponse.ok) {
                console.error('[MyReport] Sighting API error:', sightingResponse.status, sightingData);
                setSightingReports([]);
            } else {
                console.log('[MyReport] Fetched', sightingData.reports?.length || 0, 'sighting reports');
                setSightingReports(sightingData.reports || []);
            }
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
        return date.toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
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
        // Initialize photo state with existing photos
        setEditExistingPhotos(report.photos || []);
        setEditNewPhotos([]);
        setEditPhotosPreviews([]);
        setEditError('');
        setEditSuccess('');
        setShowEditModal(true);
    };

    // Handle adding new photos in edit modal
    const handleEditPhotoAdd = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        // Limit total photos to 5
        const totalPhotos = editExistingPhotos.length + editNewPhotos.length + files.length;
        if (totalPhotos > 5) {
            setEditError(t('edit.maxPhotosError') || 'Maximum 5 photos allowed');
            return;
        }
        
        // Create preview URLs
        const newPreviews = files.map(file => URL.createObjectURL(file));
        
        setEditNewPhotos(prev => [...prev, ...files]);
        setEditPhotosPreviews(prev => [...prev, ...newPreviews]);
    };

    // Handle removing existing photo
    const handleRemoveExistingPhoto = (index) => {
        setEditExistingPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Handle removing new photo
    const handleRemoveNewPhoto = (index) => {
        // Revoke the object URL to prevent memory leaks
        URL.revokeObjectURL(editPhotosPreviews[index]);
        setEditNewPhotos(prev => prev.filter((_, i) => i !== index));
        setEditPhotosPreviews(prev => prev.filter((_, i) => i !== index));
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
            
            // Use FormData to support file uploads
            const formData = new FormData();
            formData.append('reportId', editingReport.id);
            formData.append('reportType', reportType);
            formData.append('city', editFormData.city);
            formData.append('lastKnownLocation', editFormData.lastKnownLocation);
            formData.append('additionalInfo', editFormData.additionalInfo || '');
            formData.append('resubmit', resubmit ? 'true' : 'false');
            
            // Add existing photos to keep (as JSON array)
            formData.append('existingPhotos', JSON.stringify(editExistingPhotos));
            
            // Add new photos
            for (const photo of editNewPhotos) {
                formData.append('photos', photo);
            }
            
            // Add type-specific fields
            switch (reportType) {
                case 'person':
                    formData.append('firstName', editFormData.firstName || '');
                    formData.append('lastName', editFormData.lastName || '');
                    formData.append('dateOfBirth', editFormData.dateOfBirth || '');
                    formData.append('gender', editFormData.gender || '');
                    formData.append('healthStatus', editFormData.healthStatus || '');
                    formData.append('healthDetails', editFormData.healthDetails || '');
                    break;
                case 'pet':
                    formData.append('petName', editFormData.petName || '');
                    formData.append('petType', editFormData.petType || '');
                    formData.append('petBreed', editFormData.petBreed || '');
                    formData.append('petColor', editFormData.petColor || '');
                    formData.append('petSize', editFormData.petSize || '');
                    break;
                case 'document':
                    formData.append('documentType', editFormData.documentType || '');
                    formData.append('documentNumber', editFormData.documentNumber || '');
                    formData.append('documentIssuer', editFormData.documentIssuer || '');
                    formData.append('ownerName', editFormData.ownerName || '');
                    break;
                case 'electronics':
                    formData.append('deviceType', editFormData.deviceType || '');
                    formData.append('deviceBrand', editFormData.deviceBrand || '');
                    formData.append('deviceModel', editFormData.deviceModel || '');
                    formData.append('deviceColor', editFormData.deviceColor || '');
                    formData.append('serialNumber', editFormData.serialNumber || '');
                    break;
                case 'vehicle':
                    formData.append('vehicleType', editFormData.vehicleType || '');
                    formData.append('vehicleBrand', editFormData.vehicleBrand || '');
                    formData.append('vehicleModel', editFormData.vehicleModel || '');
                    formData.append('vehicleColor', editFormData.vehicleColor || '');
                    formData.append('vehicleYear', editFormData.vehicleYear || '');
                    formData.append('licensePlate', editFormData.licensePlate || '');
                    break;
                case 'other':
                    formData.append('itemName', editFormData.itemName || '');
                    formData.append('itemDescription', editFormData.itemDescription || '');
                    break;
            }

            // Determine the API endpoint based on active tab (sighting vs missing)
            const endpoint = activeTab === 'sighting' 
                ? '/api/reports/sighting'
                : '/api/reports/missing';

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type - browser will set it with boundary for FormData
                },
                body: formData
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

            // Determine the API endpoint based on active tab (sighting vs missing)
            const endpoint = activeTab === 'sighting' 
                ? `/api/reports/sighting?reportId=${deletingReport.id}`
                : `/api/reports/missing?reportId=${deletingReport.id}`;

            const response = await fetch(endpoint, {
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

                {/* Tabs */}
                <div className="mb-6">
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('missing')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'missing'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {t('tabs.missing') || 'Missing Reports'}
                                {reports.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                        {reports.length}
                                    </span>
                                )}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('sighting')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'sighting'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t('tabs.sighting') || 'Sighting Reports'}
                                {sightingReports.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                        {sightingReports.length}
                                    </span>
                                )}
                            </span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (activeTab === 'missing' ? reports : sightingReports).length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                        <svg className="w-20 h-20 mx-auto text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {activeTab === 'missing' ? (t('noReports.title') || 'No missing reports') : (t('noReports.sightingTitle') || 'No sighting reports')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            {activeTab === 'missing' ? (t('noReports.description') || 'You haven\'t submitted any missing reports yet.') : (t('noReports.sightingDescription') || 'You haven\'t submitted any sighting reports yet.')}
                        </p>
                        <Link href={activeTab === 'missing' ? "/report-missing" : "/report-sighting"} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                            </svg>
                            {activeTab === 'missing' ? (t('noReports.button') || 'Report Missing') : (t('noReports.sightingButton') || 'Report Sighting')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(activeTab === 'missing' ? reports : sightingReports).map((report) => (
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
                                                onClick={() => {
                                                    if (report.photos?.length > 0) {
                                                        setPreviewImages(report.photos);
                                                        setPreviewIndex(0);
                                                    }
                                                }}
                                                className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg overflow-hidden"
                                                disabled={!report.photos?.[0]}
                                            >
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#344054]">
                                                    {report.photos && report.photos.length > 0 ? (
                                                        <img
                                                            src={report.photos[0]}
                                                            alt={getReportDisplayName(report, activeTab === 'sighting')}
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
                                                    {getReportDisplayName(report, activeTab === 'sighting')}
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
                                                    {new Date(report.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                                        
                                        {/* Options Menu (Share & Print) */}
                                        <div className="relative options-menu-container">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === report.id ? null : report.id);
                                                }}
                                                className="inline-flex items-center justify-center p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                                                title={t('options.title') || 'More options'}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </button>
                                            
                                            {/* Dropdown Menu */}
                                            {openMenuId === report.id && (
                                                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50`}>
                                                    {/* Share submenu header */}
                                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                                        {t('options.share') || 'Share'}
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => handleShare(report, 'facebook')}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                                        </svg>
                                                        Facebook
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleShare(report, 'twitter')}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                                        </svg>
                                                        X (Twitter)
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleShare(report, 'whatsapp')}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                        </svg>
                                                        WhatsApp
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleShare(report, 'copy')}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        {t('options.copyLink') || 'Copy Link'}
                                                    </button>
                                                    
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    
                                                    {/* Print option */}
                                                    <button
                                                        onClick={() => handlePrint(report)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                        {t('options.print') || 'Print Report'}
                                                    </button>
                                                    
                                                    {/* Download PDF option */}
                                                    <button
                                                        onClick={() => handleDownloadPDF(report)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        {t('options.downloadPdf') || 'Download as PDF'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                                                {/* For missing reports: show pet_name, for sighting reports: show pet_type as primary */}
                                                {activeTab === 'missing' && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.petName') || 'Pet Name'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.pet_name || '-'}</p>
                                                    </div>
                                                )}
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
                                                {/* Show additional sighting-specific fields */}
                                                {activeTab === 'sighting' && selectedReport.details.size && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.size') || 'Size'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{selectedReport.details.size}</p>
                                                    </div>
                                                )}
                                                {activeTab === 'sighting' && selectedReport.details.has_collar !== undefined && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded-lg p-3 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('modal.hasCollar') || 'Has Collar'}</p>
                                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedReport.details.has_collar ? (t('yes') || 'Yes') : (t('no') || 'No')}</p>
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
                                    <div className="space-y-2">
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.city')}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReport.city || '-'}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.lastKnownLocation')}</p>
                                            <p className="text-xs text-gray-700 dark:text-gray-300">{selectedReport.last_known_location || selectedReport.location_description || '-'}</p>
                                        </div>
                                        {selectedReport.coordinates && (
                                            <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
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

                                {/* Reporter Contact Information */}
                                {(selectedReport.reporter_first_name || selectedReport.reporter_last_name || selectedReport.reporter_phone || selectedReport.reporter_email) && (
                                    <div className="mb-4 bg-white dark:bg-[#1D2939] rounded-lg p-3 border border-gray-200 dark:border-gray-600/30">
                                        <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                            <div className="p-1 bg-indigo-100 dark:bg-indigo-500/20 rounded">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            {t('modal.reporterContact') || 'Your Contact Information'}
                                        </h4>
                                        <div className="space-y-2">
                                            {(selectedReport.reporter_first_name || selectedReport.reporter_last_name) && (
                                                <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.reporterName') || 'Name'}</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {[selectedReport.reporter_first_name, selectedReport.reporter_last_name].filter(Boolean).join(' ') || '-'}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {selectedReport.reporter_phone && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.reporterPhone') || 'Phone'}</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-all" dir="ltr">{selectedReport.reporter_phone}</p>
                                                    </div>
                                                )}
                                                {selectedReport.reporter_email && (
                                                    <div className="bg-gray-50 dark:bg-[#344054] rounded p-2 border border-gray-100 dark:border-gray-600/20">
                                                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('modal.reporterEmail') || 'Email'}</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-all" dir="ltr">{selectedReport.reporter_email}</p>
                                                    </div>
                                                )}
                                            </div>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

            {/* Image Gallery Modal */}
            {previewImages.length > 0 && (
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
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
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('modal.reportId')}:</span>
                                            <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300 font-mono">
                                                {editingReport.id}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(editingReport.id);
                                                    setCopiedReportId(true);
                                                    setTimeout(() => setCopiedReportId(false), 2000);
                                                }}
                                                className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                                                title={copiedReportId ? (t('modal.copied') || 'Copied!') : (t('modal.copyId') || 'Copy ID')}
                                            >
                                                {copiedReportId ? (
                                                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
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
                                        {/* Name Fields - same for both missing and sighting */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.firstName') || 'First Name'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.firstName || ''}
                                                    onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('edit.lastName') || 'Last Name'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFormData.lastName || ''}
                                                    onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Additional fields only for missing reports (not sighting) */}
                                        {activeTab === 'missing' && (
                                            <>
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
                                    </>
                                )}

                                {/* Pet Fields */}
                                {editingReport.report_type === 'pet' && (
                                    <>
                                        {/* For missing reports: petName is required, for sighting: petType is required */}
                                        {activeTab === 'missing' ? (
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
                                        ) : (
                                            /* Sighting reports - only petType required */
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
                                        )}
                                        {/* Breed and Color - same for both */}
                                        <div className="grid grid-cols-2 gap-4">
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
                                        </div>
                                        {/* Size - only for missing reports */}
                                        {activeTab === 'missing' && (
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
                                        )}
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
                                                    <option value="nationalId">{t('edit.documentTypes.nationalId') || 'National ID'}</option>
                                                    <option value="passport">{t('edit.documentTypes.passport') || 'Passport'}</option>
                                                    <option value="driverLicense">{t('edit.documentTypes.driverLicense') || 'Driver License'}</option>
                                                    <option value="other">{t('edit.documentTypes.other') || 'Other'}</option>
                                                </select>
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
                                        {/* Additional document fields - only for missing reports */}
                                        {activeTab === 'missing' && (
                                            <div className="grid grid-cols-2 gap-4">
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
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Electronics Fields */}
                                {editingReport.report_type === 'electronics' && (
                                    <>
                                        {/* Device Type and Brand - same for both */}
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
                                        {/* Additional electronics fields - only for missing reports */}
                                        {activeTab === 'missing' && (
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
                                        )}
                                    </>
                                )}

                                {/* Vehicle Fields */}
                                {editingReport.report_type === 'vehicle' && (
                                    <>
                                        {/* Vehicle Type and Brand - same for both */}
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
                                        {/* Additional vehicle fields - only for missing reports */}
                                        {activeTab === 'missing' && (
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
                                        )}
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
                                        {/* Item description - only for missing reports */}
                                        {activeTab === 'missing' && (
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
                                        )}
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
                                        {activeTab === 'sighting' 
                                            ? (t('edit.locationDescription') || 'Location Description') 
                                            : (t('edit.lastKnownLocation') || 'Last Known Location')
                                        } <span className="text-red-500">*</span>
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

                                {/* Photos Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('edit.photos') || 'Photos'}
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ms-2">
                                            ({editExistingPhotos.length + editNewPhotos.length}/5)
                                        </span>
                                    </label>
                                    
                                    {/* Photo Grid */}
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                                        {/* Existing Photos */}
                                        {editExistingPhotos.map((photoUrl, index) => (
                                            <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 group">
                                                <img 
                                                    src={photoUrl} 
                                                    alt={`Photo ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExistingPhoto(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* New Photos */}
                                        {editPhotosPreviews.map((previewUrl, index) => (
                                            <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-400 dark:border-blue-500 group">
                                                <img 
                                                    src={previewUrl} 
                                                    alt={`New photo ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded font-medium">
                                                    {t('edit.newPhoto') || 'New'}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveNewPhoto(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* Add Photo Button */}
                                        {editExistingPhotos.length + editNewPhotos.length < 5 && (
                                            <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('edit.addPhoto') || 'Add'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleEditPhotoAdd}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                    
                                    {/* Photo hint */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('edit.photosHint') || 'Click on a photo to remove it. Add up to 5 photos.'}
                                    </p>
                                </div>
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
                                        activeTab === 'sighting' ? (
                                            // Sighting reports: less strict validation
                                            editingReport.report_type === 'pet' ? !editFormData.petType :
                                            editingReport.report_type === 'document' ? !editFormData.documentType :
                                            editingReport.report_type === 'electronics' ? (!editFormData.deviceType || !editFormData.deviceBrand) :
                                            editingReport.report_type === 'vehicle' ? (!editFormData.vehicleType || !editFormData.vehicleBrand) :
                                            editingReport.report_type === 'other' ? !editFormData.itemName : false
                                        ) : (
                                            // Missing reports: full validation
                                            (editingReport.report_type === 'person' || !editingReport.report_type) ? (!editFormData.firstName || !editFormData.lastName) :
                                            editingReport.report_type === 'pet' ? (!editFormData.petName || !editFormData.petType) :
                                            editingReport.report_type === 'document' ? !editFormData.documentType :
                                            editingReport.report_type === 'electronics' ? (!editFormData.deviceType || !editFormData.deviceBrand) :
                                            editingReport.report_type === 'vehicle' ? (!editFormData.vehicleType || !editFormData.vehicleBrand) :
                                            editingReport.report_type === 'other' ? !editFormData.itemName : false
                                        )
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
                                        {deletingReport.city} • {new Date(deletingReport.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US')}
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
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex gap-3">
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
                                            {t('delete.confirm') || 'Delete'}
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
