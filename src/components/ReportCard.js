"use client";

import { useState, useEffect, useCallback } from 'react';
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
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Type icons mapping
const typeIcons = {
    person: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    pet: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    ),
    document: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    electronics: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    ),
    vehicle: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 4h8m-4 4v4m-4-4h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
    ),
    other: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    )
};

// Reaction icons
const reactionIcons = {
    support: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    ),
    prayer: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
        </svg>
    ),
    hope: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
    ),
    share: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
    ),
    seen: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    )
};

export default function ReportCard({ report, onShare, onShowOnMap, expanded = false }) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const { user } = useAuth();
    const [imageError, setImageError] = useState(false);
    const [isExpanded, setIsExpanded] = useState(expanded);
    const [showReactions, setShowReactions] = useState(false);
    const [reactions, setReactions] = useState({});
    const [userReactions, setUserReactions] = useState([]);
    const [commentCount, setCommentCount] = useState(0);
    const [isSupporting, setIsSupporting] = useState(false);
    const [supportAnimation, setSupportAnimation] = useState(false);

    // Determine if this is a missing report or sighting
    const isMissing = report.source === 'missing';
    const isSighting = report.source === 'sighting';
    
    // Support both 'type' and 'report_type' field names
    const reportType = report.type || report.report_type || 'other';
    
    // Get display name
    const getDisplayName = () => {
        if (report.title) return report.title;
        
        if (report.details) {
            if (reportType === 'person') {
                return `${report.details.first_name || ''} ${report.details.last_name || ''}`.trim() || t('card.person');
            }
            if (reportType === 'pet') {
                return report.details.name || report.details.pet_name || t('card.pet');
            }
            if (reportType === 'document') {
                return report.details.document_type || t('card.document');
            }
            if (reportType === 'electronics') {
                return `${report.details.brand || ''} ${report.details.model || ''}`.trim() || t('card.electronics');
            }
            if (reportType === 'vehicle') {
                return `${report.details.brand || ''} ${report.details.model || ''}`.trim() || t('card.vehicle');
            }
        }
        return t(`card.${reportType}`) || t('card.other');
    };

    // Get the first photo
    const photoUrl = !imageError ? (
        (report.photos && report.photos.length > 0 && report.photos[0]) ||
        report.photo_url ||
        null
    ) : null;

    // Get status color
    const getStatusColor = () => {
        if (report.status === 'matched') return 'bg-green-500';
        if (report.status === 'found' || report.status === 'closed') return 'bg-emerald-500';
        if (isSighting) return 'bg-orange-500';
        return 'bg-blue-500';
    };

    const getStatusText = () => {
        if (report.status === 'matched') return t('card.matched');
        if (report.status === 'found' || report.status === 'closed') return t('card.found');
        if (isSighting) return t('card.sighting');
        return t('card.missing');
    };

    // Get details based on report type
    const getDetails = () => {
        const details = report.details || {};
        const items = [];

        if (reportType === 'person') {
            if (details.gender) items.push({ label: t('card.gender'), value: t(`card.${details.gender}`) || details.gender });
            if (details.date_of_birth) {
                const age = Math.floor((new Date() - new Date(details.date_of_birth)) / 31536000000);
                items.push({ label: t('card.age'), value: `${age} ${locale === 'ar' ? 'سنة' : 'years'}` });
            }
            if (details.health_status) items.push({ label: t('card.healthStatus'), value: t(`card.${details.health_status}`) || details.health_status });
        } else if (reportType === 'pet') {
            if (details.pet_type) items.push({ label: t('card.pet'), value: details.pet_type });
            if (details.breed) items.push({ label: t('card.breed'), value: details.breed });
            if (details.color) items.push({ label: t('card.color'), value: details.color });
            if (details.size) items.push({ label: t('card.size'), value: details.size });
        } else if (reportType === 'vehicle') {
            if (details.vehicle_type) items.push({ label: t('card.vehicle'), value: details.vehicle_type });
            if (details.color) items.push({ label: t('card.color'), value: details.color });
            if (details.year) items.push({ label: 'Year', value: details.year });
        }

        return items.slice(0, 4); // Limit to 4 items
    };

    // Handle support toggle
    const handleSupport = async () => {
        if (!user) return;
        
        setIsSupporting(!isSupporting);
        setSupportAnimation(true);
        setTimeout(() => setSupportAnimation(false), 600);

        try {
            const method = isSupporting ? 'DELETE' : 'POST';
            await fetch(`/api/reports/${report.id}/reactions`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reaction_type: 'support',
                    source: report.source
                })
            });
            
            // Update reaction count
            setReactions(prev => ({
                ...prev,
                support: (prev.support || 0) + (isSupporting ? -1 : 1)
            }));
        } catch (error) {
            console.error('Error toggling support:', error);
            setIsSupporting(!isSupporting);
        }
    };

    // Handle reaction toggle
    const handleReaction = async (reactionType) => {
        if (!user) return;
        
        const hasReaction = userReactions.includes(reactionType);
        
        try {
            const method = hasReaction ? 'DELETE' : 'POST';
            await fetch(`/api/reports/${report.id}/reactions`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reaction_type: reactionType,
                    source: report.source
                })
            });
            
            // Update user reactions
            if (hasReaction) {
                setUserReactions(prev => prev.filter(r => r !== reactionType));
            } else {
                setUserReactions(prev => [...prev, reactionType]);
            }
            
            // Update reaction count
            setReactions(prev => ({
                ...prev,
                [reactionType]: (prev[reactionType] || 0) + (hasReaction ? -1 : 1)
            }));
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    // Calculate total reactions
    const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300">
            {/* Header with Image */}
            <div className="relative h-56 overflow-hidden bg-gray-100 dark:bg-gray-700">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={getDisplayName()}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                        <div className={`p-6 rounded-full ${isSighting ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            <div className={`w-12 h-12 ${isSighting ? 'text-orange-500' : 'text-blue-500'}`}>
                                {typeIcons[reportType] || typeIcons.other}
                            </div>
                        </div>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                {/* Status & Type Badges */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${getStatusColor()} shadow-lg`}>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        {getStatusText()}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white backdrop-blur-sm shadow-lg">
                        {typeIcons[reportType] || typeIcons.other}
                        <span className="capitalize">{t(`card.${reportType}`)}</span>
                    </span>
                </div>

                {/* Name and Location on image */}
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-white text-xl mb-1 drop-shadow-lg">
                        {getDisplayName()}
                    </h3>
                    <div className="flex items-center gap-1.5 text-white/90 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{report.city}</span>
                        {report.last_known_location && (
                            <span className="text-white/70">• {report.last_known_location}</span>
                        )}
                    </div>
                </div>

                {/* Photo count */}
                {report.photos && report.photos.length > 1 && (
                    <div className="absolute bottom-4 right-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            +{report.photos.length - 1}
                        </span>
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div className="p-4 space-y-4">
                {/* Description */}
                {(report.description || report.additional_info) && (
                    <p className={`text-gray-600 dark:text-gray-300 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {report.description || report.additional_info}
                    </p>
                )}

                {/* Quick Details Grid */}
                {getDetails().length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {getDetails().map((detail, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 block">{detail.label}</span>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Interactions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {totalReactions > 0 && (
                            <span className="flex items-center gap-1">
                                <span className="text-red-500">{reactionIcons.support}</span>
                                <span>{totalReactions}</span>
                            </span>
                        )}
                        {commentCount > 0 && (
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span>{commentCount}</span>
                            </span>
                        )}
                        <span className="text-xs">{formatRelativeTime(report.created_at, locale)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Support Button */}
                    <button
                        onClick={handleSupport}
                        disabled={!user}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                            ${isSupporting 
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800' 
                                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                            }
                            ${supportAnimation ? 'scale-95' : 'scale-100'}
                            ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        <span className={`transition-transform duration-300 ${supportAnimation ? 'scale-125' : ''}`}>
                            {reactionIcons.support}
                        </span>
                        {isSupporting ? t('card.supporting') : t('card.support')}
                    </button>

                    {/* Comment Button */}
                    <Link
                        href={`/reports/${report.id}?source=${report.source}#comments`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {t('card.comments')}
                    </Link>

                    {/* More Reactions Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowReactions(!showReactions)}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Reactions Popup */}
                        {showReactions && (
                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex gap-1 z-50">
                                {Object.entries(reactionIcons).map(([type, icon]) => (
                                    <button
                                        key={type}
                                        onClick={() => handleReaction(type)}
                                        disabled={!user}
                                        className={`
                                            p-2.5 rounded-xl transition-all duration-200 hover:scale-110
                                            ${userReactions.includes(type) 
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }
                                        `}
                                        title={t(`interactions.${type}`)}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-2">
                    {/* Show on Map */}
                    {report.coordinates && (
                        <button
                            onClick={() => onShowOnMap?.(report)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            {t('card.showLocation')}
                        </button>
                    )}

                    {/* Share */}
                    <button
                        onClick={() => onShare?.(report)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        {t('card.share')}
                    </button>

                    {/* View Details */}
                    <Link
                        href={`/reports/${report.id}?source=${report.source}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                    >
                        {t('card.viewMore')}
                        <svg className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
