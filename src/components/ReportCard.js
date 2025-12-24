"use client";

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

// Helper to format relative time
function formatRelativeTime(dateString, locale) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} د` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} س` : `${diffHours}h ago`;
    if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} ي` : `${diffDays}d ago`;
    
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Type icons - small version for badges
const typeIcons = {
    person: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    pet: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.5 12c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm15 0c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm-12.5 2c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm10 0c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm-5 1c-2.5 0-5 2-5 4.5v1.5h10v-1.5c0-2.5-2.5-4.5-5-4.5z"/>
        </svg>
    ),
    document: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    electronics: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    ),
    vehicle: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
    ),
    other: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    )
};

// Large type icons for placeholder
const largeTypeIcons = {
    person: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    pet: (
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.5 12c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm15 0c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm-12.5 2c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm10 0c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3 1.5 3 3 3zm-5 1c-2.5 0-5 2-5 4.5v1.5h10v-1.5c0-2.5-2.5-4.5-5-4.5z"/>
        </svg>
    ),
    document: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    electronics: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    ),
    vehicle: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
    ),
    other: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    )
};

export default function ReportCard({ report, onShare, onShowOnMap }) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const { user, getAccessToken } = useAuth();
    const [imageError, setImageError] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(report.reactions_count || 0);
    const [likeAnimation, setLikeAnimation] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    const isRTL = locale === 'ar';
    
    // Determine source type
    const isMissing = report.source === 'missing';
    const isSighting = report.source === 'sighting';
    
    // Get report type
    const reportType = report.type || report.report_type || 'other';

    // Fetch reactions data on mount
    useEffect(() => {
        const fetchReactions = async () => {
            try {
                const token = await getAccessToken();
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await fetch(
                    `/api/reports/${report.id}/reactions?source=${report.source}`,
                    { headers }
                );
                if (response.ok) {
                    const data = await response.json();
                    setLikeCount(data.total || 0);
                    setLiked(data.userReactions?.includes('support') || false);
                }
            } catch (err) {
                console.error('Error fetching reactions:', err);
            }
        };
        
        fetchReactions();
    }, [report.id, report.source, getAccessToken]);
    
    // Get type labels
    const typeLabels = {
        person: { en: 'Person', ar: 'شخص' },
        pet: { en: 'Pet', ar: 'حيوان أليف' },
        document: { en: 'Document', ar: 'وثيقة' },
        electronics: { en: 'Electronics', ar: 'إلكترونيات' },
        vehicle: { en: 'Vehicle', ar: 'مركبة' },
        other: { en: 'Item', ar: 'غرض' }
    };

    const getTypeLabel = () => {
        const labels = typeLabels[reportType] || typeLabels.other;
        return locale === 'ar' ? labels.ar : labels.en;
    };

    // Get display title
    const getDisplayTitle = () => {
        if (report.title && 
            report.title !== 'Sighting Report' && 
            report.title !== 'Person Sighting' &&
            report.title !== 'Pet Sighting' &&
            report.title !== 'Vehicle Sighting' &&
            report.title !== 'Document Found' &&
            report.title !== 'Electronics Found' &&
            report.title !== 'Item Found') {
            return report.title;
        }

        if (isMissing && report.details) {
            if (reportType === 'person') {
                const name = `${report.details.first_name || ''} ${report.details.last_name || ''}`.trim();
                if (name) return name;
            }
            if (reportType === 'pet') {
                if (report.details.pet_name) return report.details.pet_name;
            }
            if (reportType === 'electronics' || reportType === 'vehicle') {
                const name = `${report.details.brand || ''} ${report.details.model || ''}`.trim();
                if (name) return name;
            }
        }

        if (isSighting) {
            const sightingTitles = {
                person: { en: 'Person Seen', ar: 'تم مشاهدة شخص' },
                pet: { en: 'Pet Found', ar: 'تم العثور على حيوان' },
                document: { en: 'Document Found', ar: 'تم العثور على وثيقة' },
                electronics: { en: 'Device Found', ar: 'تم العثور على جهاز' },
                vehicle: { en: 'Vehicle Seen', ar: 'تم مشاهدة مركبة' },
                other: { en: 'Item Found', ar: 'تم العثور على غرض' }
            };
            const titles = sightingTitles[reportType] || sightingTitles.other;
            return locale === 'ar' ? titles.ar : titles.en;
        } else {
            const missingTitles = {
                person: { en: 'Missing Person', ar: 'شخص مفقود' },
                pet: { en: 'Missing Pet', ar: 'حيوان مفقود' },
                document: { en: 'Lost Document', ar: 'وثيقة مفقودة' },
                electronics: { en: 'Lost Device', ar: 'جهاز مفقود' },
                vehicle: { en: 'Missing Vehicle', ar: 'مركبة مفقودة' },
                other: { en: 'Lost Item', ar: 'غرض مفقود' }
            };
            const titles = missingTitles[reportType] || missingTitles.other;
            return locale === 'ar' ? titles.ar : titles.en;
        }
    };

    // Get photo URL
    const photoUrl = !imageError ? (
        (report.photos && report.photos.length > 0 && report.photos[0]) ||
        report.photo_url ||
        null
    ) : null;

    // Get details for display
    const getDetails = () => {
        const details = report.details || {};
        const items = [];

        if (reportType === 'person') {
            if (details.gender) {
                const genderLabels = { 
                    male: locale === 'ar' ? 'ذكر' : 'Male', 
                    female: locale === 'ar' ? 'أنثى' : 'Female' 
                };
                items.push({ 
                    label: locale === 'ar' ? 'الجنس' : 'Gender', 
                    value: genderLabels[details.gender] || details.gender 
                });
            }
            if (details.date_of_birth) {
                const age = Math.floor((new Date() - new Date(details.date_of_birth)) / 31536000000);
                items.push({ 
                    label: locale === 'ar' ? 'العمر' : 'Age', 
                    value: `${age} ${locale === 'ar' ? 'سنة' : 'Yrs'}` 
                });
            }
            if (details.health_status) {
                const healthLabels = { 
                    healthy: locale === 'ar' ? 'سليم' : 'Healthy',
                    condition: locale === 'ar' ? 'حالة صحية' : 'Has Condition'
                };
                items.push({ 
                    label: locale === 'ar' ? 'الصحة' : 'Health', 
                    value: healthLabels[details.health_status] || details.health_status 
                });
            }
        } else if (reportType === 'pet') {
            if (details.pet_type) items.push({ 
                label: locale === 'ar' ? 'النوع' : 'Type', 
                value: details.pet_type 
            });
            if (details.breed) items.push({ 
                label: locale === 'ar' ? 'السلالة' : 'Breed', 
                value: details.breed 
            });
            if (details.color) items.push({ 
                label: locale === 'ar' ? 'اللون' : 'Color', 
                value: details.color 
            });
        } else if (reportType === 'vehicle') {
            if (details.vehicle_type) items.push({ 
                label: locale === 'ar' ? 'النوع' : 'Type', 
                value: details.vehicle_type 
            });
            if (details.brand) items.push({ 
                label: locale === 'ar' ? 'العلامة' : 'Brand', 
                value: details.brand 
            });
            if (details.color) items.push({ 
                label: locale === 'ar' ? 'اللون' : 'Color', 
                value: details.color 
            });
        } else if (reportType === 'electronics') {
            if (details.brand) items.push({ 
                label: locale === 'ar' ? 'العلامة' : 'Brand', 
                value: details.brand 
            });
            if (details.model) items.push({ 
                label: locale === 'ar' ? 'الموديل' : 'Model', 
                value: details.model 
            });
        } else if (reportType === 'document') {
            if (details.document_type) items.push({ 
                label: locale === 'ar' ? 'النوع' : 'Type', 
                value: details.document_type 
            });
        }

        return items.slice(0, 3);
    };

    // Handle like
    const handleLike = async () => {
        if (!user || isLikeLoading) return;
        
        setLikeAnimation(true);
        setTimeout(() => setLikeAnimation(false), 300);
        
        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
        
        setIsLikeLoading(true);
        try {
            const token = await getAccessToken();
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            
            if (newLiked) {
                // Add reaction
                const response = await fetch(`/api/reports/${report.id}/reactions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        reaction_type: 'support',
                        source: report.source
                    })
                });
                
                if (!response.ok && response.status !== 409) {
                    // Revert on error (409 means already liked, which is fine)
                    setLiked(false);
                    setLikeCount(prev => Math.max(0, prev - 1));
                }
            } else {
                // Remove reaction
                const response = await fetch(
                    `/api/reports/${report.id}/reactions?reaction_type=support&source=${report.source}`,
                    { method: 'DELETE', headers }
                );
                
                if (!response.ok) {
                    // Revert on error
                    setLiked(true);
                    setLikeCount(prev => prev + 1);
                }
            }
        } catch (err) {
            console.error('Error toggling like:', err);
            // Revert on error
            setLiked(!newLiked);
            setLikeCount(prev => newLiked ? Math.max(0, prev - 1) : prev + 1);
        } finally {
            setIsLikeLoading(false);
        }
    };

    const details = getDetails();

    // Owner info - using report data or fallback
    const ownerName = report.owner?.full_name || report.owner?.username || (locale === 'ar' ? 'مستخدم مجهول' : 'Anonymous User');
    const ownerAvatar = report.owner?.avatar_url;

    return (
        <div 
            className={`
                bg-white dark:bg-gray-800 
                border border-gray-200 dark:border-gray-700
                rounded-xl shadow-sm
                w-full max-w-2xl mx-auto
                overflow-hidden
                transition-all duration-200
                hover:shadow-md
            `}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Header - User Info & Status */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Owner Avatar */}
                    <div className="relative">
                        {ownerAvatar ? (
                            <img 
                                src={ownerAvatar} 
                                alt={ownerName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                {ownerName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {/* Online indicator */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${isSighting ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                    </div>
                    
                    {/* Owner Name & Time */}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                {ownerName}
                            </span>
                            {/* Status Badge */}
                            <span className={`
                                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                ${isSighting 
                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }
                            `}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isSighting ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                {isSighting 
                                    ? (locale === 'ar' ? 'مشاهدة' : 'Sighting')
                                    : (locale === 'ar' ? 'مفقود' : 'Missing')
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatRelativeTime(report.created_at, locale)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {report.city}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Type Badge */}
                <div className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                    ${isSighting 
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    }
                `}>
                    {typeIcons[reportType] || typeIcons.other}
                    <span>{getTypeLabel()}</span>
                </div>
            </div>

            {/* Main Content Area - Photo Only */}
            <div>
                {photoUrl ? (
                    <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                            src={photoUrl}
                            alt={getDisplayTitle()}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                        {/* Photo count badge */}
                        {report.photos && report.photos.length > 1 && (
                            <div className="absolute top-2 right-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    +{report.photos.length - 1}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`
                        aspect-video flex items-center justify-center
                        ${isSighting 
                            ? 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20' 
                            : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20'
                        }
                    `}>
                        <div className={`${isSighting ? 'text-orange-300 dark:text-orange-700' : 'text-blue-300 dark:text-blue-700'}`}>
                            {largeTypeIcons[reportType] || largeTypeIcons.other}
                        </div>
                    </div>
                )}
            </div>

            {/* Title & Description */}
            <div className="px-4 py-3">
                <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                    {getDisplayTitle()}
                </h3>
                
                {/* Location detail */}
                {report.last_known_location && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="font-medium">{locale === 'ar' ? 'الموقع:' : 'Location:'}</span> {report.last_known_location}
                    </p>
                )}
                
                {/* Description */}
                {(report.description || report.additional_info) && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {report.description || report.additional_info}
                    </p>
                )}

                {/* Details Grid */}
                {details.length > 0 && (
                    <div className={`grid gap-2 mt-3 ${details.length === 1 ? 'grid-cols-1' : details.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {details.map((detail, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-center">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block uppercase tracking-wide font-medium">{detail.label}</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-100 dark:border-gray-700 px-2 py-2">
                <div className="flex items-center justify-between">
                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        disabled={!user}
                        className={`
                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                            ${liked 
                                ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }
                            ${!user ? 'opacity-50 cursor-not-allowed' : ''}
                            ${likeAnimation ? 'scale-110' : 'scale-100'}
                        `}
                    >
                        <svg 
                            className={`w-5 h-5 transition-transform ${likeAnimation ? 'scale-125' : ''}`} 
                            fill={liked ? "currentColor" : "none"} 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{likeCount > 0 ? likeCount : ''} {locale === 'ar' ? 'إعجاب' : 'Like'}</span>
                    </button>

                    {/* Comment Button */}
                    <Link
                        href={`/reports/${report.id}?source=${report.source}#comments`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{locale === 'ar' ? 'تعليق' : 'Comment'}</span>
                    </Link>

                    {/* Share Button */}
                    <button
                        onClick={() => onShare?.(report)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>{locale === 'ar' ? 'مشاركة' : 'Share'}</span>
                    </button>

                    {/* View Details */}
                    <Link
                        href={`/reports/${report.id}?source=${report.source}`}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:shadow transition-all ${
                            isSighting 
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600' 
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        }`}
                    >
                        <span>{locale === 'ar' ? 'التفاصيل' : 'Details'}</span>
                        <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
