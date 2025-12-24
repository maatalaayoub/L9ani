"use client";

import { useState, useEffect } from 'react';
import { useTranslations, useLanguage } from "@/context/LanguageContext";

export default function ShareDialog({ isOpen, onClose, report }) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const [copied, setCopied] = useState(false);

    // Reset copied state when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen || !report) return null;

    // Get display name for the report
    const getDisplayName = () => {
        if (report.details) {
            if (report.report_type === 'person') {
                return `${report.details.first_name || ''} ${report.details.last_name || ''}`.trim();
            }
            if (report.report_type === 'pet') {
                return report.details.pet_name;
            }
            if (report.report_type === 'document') {
                return report.details.document_type;
            }
            if (report.report_type === 'electronics') {
                return `${report.details.brand || ''} ${report.details.model || ''}`.trim();
            }
            if (report.report_type === 'vehicle') {
                return `${report.details.brand || ''} ${report.details.model || ''}`.trim();
            }
        }
        return locale === 'ar' ? 'بلاغ' : 'Report';
    };

    const isSighting = report.source === 'sighting';
    const name = getDisplayName();
    const location = report.city || (isSighting ? report.location_description : report.last_known_location) || '';
    
    // Build share URL
    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/${locale}/reports/${report.id}?source=${report.source}`
        : '';

    // Build share text
    const shareText = isSighting
        ? t('share.sightingShareText').replace('{{location}}', location)
        : t('share.shareText').replace('{{name}}', name).replace('{{location}}', location);

    // Share handlers
    const shareToWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const shareToFacebook = () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const shareToTwitter = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Native share if available
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: name,
                    text: shareText,
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Dialog */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('share.title')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('share.description')}
                    </p>
                </div>

                {/* Report Preview */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        {report.photos && report.photos.length > 0 ? (
                            <img 
                                src={report.photos[0]} 
                                alt={name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        ) : (
                            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isSighting ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                <svg className={`w-8 h-8 ${isSighting ? 'text-orange-500' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${isSighting ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                    {isSighting ? t('card.sighting') : t('card.missing')}
                                </span>
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {location}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Share Options */}
                <div className="p-6 space-y-3">
                    {/* WhatsApp */}
                    <button
                        onClick={shareToWhatsApp}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="font-medium">{t('share.whatsapp')}</span>
                    </button>

                    {/* Facebook */}
                    <button
                        onClick={shareToFacebook}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="font-medium">{t('share.facebook')}</span>
                    </button>

                    {/* Twitter/X */}
                    <button
                        onClick={shareToTwitter}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span className="font-medium">{t('share.twitter')}</span>
                    </button>

                    {/* Copy Link */}
                    <button
                        onClick={copyLink}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                            copied 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {copied ? (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium">{t('share.copied')}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">{t('share.copyLink')}</span>
                            </>
                        )}
                    </button>

                    {/* Native Share (mobile) */}
                    {typeof navigator !== 'undefined' && navigator.share && (
                        <button
                            onClick={handleNativeShare}
                            className="w-full flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="font-medium">{locale === 'ar' ? 'مشاركة أخرى' : 'More options'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
