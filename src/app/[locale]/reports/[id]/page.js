"use client";

import { useState, useEffect, use, Suspense } from 'react';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import CommentsSection from '@/components/CommentsSection';
import ShareDialog from '@/components/ShareDialog';

// Type icons for report types
const typeIcons = {
    person: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    pet: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.5 12c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm15 0c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm-12.5 2c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm10 0c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm-5 1c-2.5 0-5 2-5 4.5v1.5h10v-1.5c0-2.5-2.5-4.5-5-4.5z"/>
        </svg>
    ),
    document: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    electronics: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    ),
    vehicle: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
    ),
    other: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    )
};

function formatRelativeTime(dateString, locale) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins} minutes ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
    if (diffDays < 30) return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays} days ago`;
    
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export default function ReportDetailsPage({ params }) {
    const resolvedParams = use(params);
    const searchParams = useSearchParams();
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const { user } = useAuth();
    
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(0);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [showImageGallery, setShowImageGallery] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);

    const reportId = resolvedParams.id;
    const source = searchParams.get('source') || 'missing';
    const isRTL = locale === 'ar';

    useEffect(() => {
        fetchReport();
    }, [reportId, source]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/public?source=${source}`);
            const data = await res.json();
            
            if (data.reports) {
                const foundReport = data.reports.find(r => r.id === reportId);
                if (foundReport) {
                    setReport(foundReport);
                } else {
                    setError('Report not found');
                }
            }
        } catch (err) {
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    // Get type labels
    const typeLabels = {
        person: { en: 'Person', ar: 'شخص' },
        pet: { en: 'Pet', ar: 'حيوان أليف' },
        document: { en: 'Document', ar: 'وثيقة' },
        electronics: { en: 'Electronics', ar: 'إلكترونيات' },
        vehicle: { en: 'Vehicle', ar: 'مركبة' },
        other: { en: 'Item', ar: 'غرض' }
    };

    const getTypeLabel = (type) => {
        const labels = typeLabels[type] || typeLabels.other;
        return locale === 'ar' ? labels.ar : labels.en;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                        <div className="space-y-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
                <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
                        <div className="text-6xl mb-4">😔</div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {locale === 'ar' ? 'لم يتم العثور على البلاغ' : 'Report Not Found'}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {locale === 'ar' 
                                ? 'لم نتمكن من العثور على البلاغ المطلوب' 
                                : 'We could not find the report you are looking for'}
                        </p>
                        <Link 
                            href="/reports" 
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {locale === 'ar' ? 'العودة للبلاغات' : 'Back to Reports'}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isMissing = report.source === 'missing';
    const isSighting = report.source === 'sighting';
    const reportType = report.type || report.report_type || 'other';
    const photos = report.photos || (report.photo_url ? [report.photo_url] : []);
    const details = report.details || {};

    // Detail fields based on type
    const getDetailFields = () => {
        const fields = [];
        
        if (reportType === 'person') {
            if (details.gender) fields.push({ label: locale === 'ar' ? 'الجنس' : 'Gender', value: details.gender });
            if (details.date_of_birth) {
                const age = Math.floor((new Date() - new Date(details.date_of_birth)) / 31536000000);
                fields.push({ label: locale === 'ar' ? 'العمر' : 'Age', value: `${age} ${locale === 'ar' ? 'سنة' : 'years'}` });
            }
            if (details.approximate_age) fields.push({ label: locale === 'ar' ? 'العمر التقريبي' : 'Approx. Age', value: details.approximate_age });
            if (details.height) fields.push({ label: locale === 'ar' ? 'الطول' : 'Height', value: details.height });
            if (details.weight) fields.push({ label: locale === 'ar' ? 'الوزن' : 'Weight', value: details.weight });
            if (details.skin_color) fields.push({ label: locale === 'ar' ? 'لون البشرة' : 'Skin Color', value: details.skin_color });
            if (details.hair_color) fields.push({ label: locale === 'ar' ? 'لون الشعر' : 'Hair Color', value: details.hair_color });
            if (details.eye_color) fields.push({ label: locale === 'ar' ? 'لون العين' : 'Eye Color', value: details.eye_color });
            if (details.physical_description) fields.push({ label: locale === 'ar' ? 'الوصف' : 'Description', value: details.physical_description });
            if (details.clothing_description) fields.push({ label: locale === 'ar' ? 'الملابس' : 'Clothing', value: details.clothing_description });
        } else if (reportType === 'pet') {
            if (details.pet_type) fields.push({ label: locale === 'ar' ? 'النوع' : 'Type', value: details.pet_type });
            if (details.breed) fields.push({ label: locale === 'ar' ? 'السلالة' : 'Breed', value: details.breed });
            if (details.color) fields.push({ label: locale === 'ar' ? 'اللون' : 'Color', value: details.color });
            if (details.size) fields.push({ label: locale === 'ar' ? 'الحجم' : 'Size', value: details.size });
            if (details.has_collar) fields.push({ label: locale === 'ar' ? 'طوق' : 'Collar', value: locale === 'ar' ? 'نعم' : 'Yes' });
        } else if (reportType === 'vehicle') {
            if (details.vehicle_type) fields.push({ label: locale === 'ar' ? 'النوع' : 'Type', value: details.vehicle_type });
            if (details.brand) fields.push({ label: locale === 'ar' ? 'العلامة' : 'Brand', value: details.brand });
            if (details.model) fields.push({ label: locale === 'ar' ? 'الموديل' : 'Model', value: details.model });
            if (details.color) fields.push({ label: locale === 'ar' ? 'اللون' : 'Color', value: details.color });
            if (details.license_plate) fields.push({ label: locale === 'ar' ? 'اللوحة' : 'Plate', value: details.license_plate });
        } else if (reportType === 'electronics') {
            if (details.device_type) fields.push({ label: locale === 'ar' ? 'النوع' : 'Type', value: details.device_type });
            if (details.brand) fields.push({ label: locale === 'ar' ? 'العلامة' : 'Brand', value: details.brand });
            if (details.model) fields.push({ label: locale === 'ar' ? 'الموديل' : 'Model', value: details.model });
            if (details.color) fields.push({ label: locale === 'ar' ? 'اللون' : 'Color', value: details.color });
        } else if (reportType === 'document') {
            if (details.document_type) fields.push({ label: locale === 'ar' ? 'نوع الوثيقة' : 'Document Type', value: details.document_type });
            if (details.owner_name) fields.push({ label: locale === 'ar' ? 'اسم المالك' : 'Owner Name', value: details.owner_name });
        }

        return fields;
    };

    const detailFields = getDetailFields();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
            {/* Back Navigation */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <Link 
                        href="/reports" 
                        className={`inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                        <svg className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-medium">{locale === 'ar' ? 'العودة للبلاغات' : 'Back to Reports'}</span>
                    </Link>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Main Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    {/* Photo Gallery */}
                    {photos.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setGalleryIndex(selectedPhoto);
                                    setShowImageGallery(true);
                                }}
                                className="w-full aspect-[16/9] md:aspect-[2/1] overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer group"
                            >
                                <img
                                    src={photos[selectedPhoto]}
                                    alt={report.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {/* Hover overlay with zoom icon */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                </div>
                            </button>
                            
                            {/* Photo Navigation */}
                            {photos.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedPhoto(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setSelectedPhoto(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    
                                    {/* Thumbnails */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {photos.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedPhoto(index)}
                                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                                    index === selectedPhoto 
                                                        ? 'bg-white w-6' 
                                                        : 'bg-white/50 hover:bg-white/75'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-4 left-4">
                                <span className={`
                                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm
                                    ${isSighting 
                                        ? 'bg-orange-500/90 text-white' 
                                        : 'bg-blue-600/90 text-white'
                                    }
                                `}>
                                    {isSighting 
                                        ? (locale === 'ar' ? 'تم العثور عليه' : 'Found / Sighting')
                                        : (locale === 'ar' ? 'مفقود' : 'Missing')
                                    }
                                </span>
                            </div>

                            {/* Type Badge */}
                            <div className="absolute top-4 right-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-white shadow-lg backdrop-blur-sm">
                                    {typeIcons[reportType]}
                                    <span>{getTypeLabel(reportType)}</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                        {/* Title & Time */}
                        <div className="mb-6">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {report.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatRelativeTime(report.created_at, locale)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {report.city}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        {(report.description || report.additional_info) && (
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {locale === 'ar' ? 'الوصف' : 'Description'}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                    {report.description || report.additional_info}
                                </p>
                            </div>
                        )}

                        {/* Details Grid */}
                        {detailFields.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    {locale === 'ar' ? 'التفاصيل' : 'Details'}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {detailFields.map((field, index) => (
                                        <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wide">
                                                {field.label}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                                {field.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {report.last_known_location && (
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {locale === 'ar' ? 'آخر موقع معروف' : 'Last Known Location'}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    {report.last_known_location}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShareDialogOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                {locale === 'ar' ? 'مشاركة' : 'Share'}
                            </button>

                            {report.coordinates && (
                                <a
                                    href={`https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {locale === 'ar' ? 'عرض على الخريطة' : 'View on Map'}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div id="comments" className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        {locale === 'ar' ? 'التعليقات' : 'Comments'}
                    </h2>
                    <CommentsSection reportId={reportId} source={source} />
                </div>
            </div>

            {/* Share Dialog */}
            <ShareDialog
                isOpen={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                report={report}
            />

            {/* Image Gallery Modal */}
            {showImageGallery && photos.length > 0 && (
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                    onClick={() => setShowImageGallery(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') {
                            setGalleryIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
                        } else if (e.key === 'ArrowRight') {
                            setGalleryIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
                        } else if (e.key === 'Escape') {
                            setShowImageGallery(false);
                        }
                    }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm" />
                    
                    {/* Close Button */}
                    <button
                        onClick={() => setShowImageGallery(false)}
                        className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image Counter */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                        {galleryIndex + 1} / {photos.length}
                    </div>

                    {/* Previous Button */}
                    {photos.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setGalleryIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
                            }}
                            className="absolute left-4 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Next Button */}
                    {photos.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setGalleryIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
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
                                    setGalleryIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
                                } else {
                                    setGalleryIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
                                }
                            }
                        }}
                    >
                        <img
                            src={photos[galleryIndex]}
                            alt={`Photo ${galleryIndex + 1}`}
                            className="max-w-full max-h-[85vh] object-contain rounded-xl"
                        />
                    </div>

                    {/* Dot Indicators */}
                    {photos.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                            {photos.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setGalleryIndex(idx);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === galleryIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
