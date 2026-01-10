"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/lib/notifications';

/**
 * FaceMatchAlert Component
 * 
 * A global modal dialog that subscribes to real-time face match notifications
 * and displays a professional dialog when a match is found.
 * 
 * Should be placed in the root layout so it works across all pages.
 */
export default function FaceMatchAlert({ locale = 'en' }) {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [alerts, setAlerts] = useState([]);
    const [currentAlert, setCurrentAlert] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const isRTL = locale === 'ar';

    const translations = {
        en: {
            matchFound: 'Potential Match Found!',
            subtitle: 'This could be a breakthrough in your search',
            matchFoundMessage: 'Great news! A potential sighting match has been found for your missing person report. This could be a breakthrough in your search!',
            sightingMatchMessage: 'Great news! A potential match has been found between your sighting report and a missing person report!',
            similarity: 'Similarity Score',
            viewDetails: 'View Details',
            dismiss: 'Close',
            highMatch: 'High Confidence',
            mediumMatch: 'Good Match',
            lowMatch: 'Possible Match',
            queueMessage: 'You have {count} more match notification(s)',
        },
        ar: {
            matchFound: 'تم العثور على تطابق محتمل!',
            subtitle: 'قد يكون هذا تقدماً مهماً في بحثك',
            matchFoundMessage: 'أخبار رائعة! تم العثور على تطابق محتمل في بلاغ مشاهدة مع بلاغ الشخص المفقود الخاص بك. قد يكون هذا تقدماً كبيراً في بحثك!',
            sightingMatchMessage: 'أخبار رائعة! تم العثور على تطابق محتمل بين بلاغ المشاهدة الخاص بك وبلاغ شخص مفقود!',
            similarity: 'نسبة التشابه',
            viewDetails: 'عرض التفاصيل',
            dismiss: 'إغلاق',
            highMatch: 'ثقة عالية',
            mediumMatch: 'تطابق جيد',
            lowMatch: 'تطابق محتمل',
            queueMessage: 'لديك {count} إشعار(ات) تطابق أخرى',
        },
    };

    const t = translations[locale] || translations.en;

    // Check if FaceMatchingDialog is open (via sessionStorage flag)
    const isFaceMatchingDialogOpen = useCallback(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('faceMatchingDialogOpen') === 'true';
        }
        return false;
    }, []);

    // Handle new notification
    const handleNewNotification = useCallback((notification) => {
        console.log('[FaceMatchAlert] Received notification:', notification);
        
        // Only handle face match notifications
        if (notification.type === NotificationType.FACE_MATCH_FOUND || notification.type === 'FACE_MATCH_FOUND') {
            // Don't show if FaceMatchingDialog is already open
            if (isFaceMatchingDialogOpen()) {
                console.log('[FaceMatchAlert] FaceMatchingDialog is open, skipping alert');
                return;
            }

            const alertData = {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                similarity: notification.data?.similarity,
                matchId: notification.data?.matchId,
                reportType: notification.data?.reportType,
                matchedReportId: notification.data?.matchedReportId,
                matchedReportType: notification.data?.matchedReportType,
                accessToken: notification.data?.accessToken,
                timestamp: Date.now(),
            };
            
            setAlerts(prev => {
                const newAlerts = [...prev, alertData];
                // If no dialog is open, show the first alert
                if (!isDialogOpen && newAlerts.length === 1) {
                    setCurrentAlert(alertData);
                    setIsDialogOpen(true);
                }
                return newAlerts;
            });
        }
    }, [isFaceMatchingDialogOpen, isDialogOpen]);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!user?.id) return;

        console.log('[FaceMatchAlert] Setting up subscription for user:', user.id);

        const channel = supabase
            .channel(`face-match-alerts:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[FaceMatchAlert] Received realtime payload:', payload);
                    handleNewNotification(payload.new);
                }
            )
            .subscribe((status, err) => {
                console.log('[FaceMatchAlert] Subscription status:', status);
                if (err) {
                    console.error('[FaceMatchAlert] Subscription error:', err);
                }
            });

        return () => {
            console.log('[FaceMatchAlert] Unsubscribing from notifications');
            supabase.removeChannel(channel);
        };
    }, [user?.id, handleNewNotification]);

    // Show next alert when current one is dismissed
    useEffect(() => {
        if (!isDialogOpen && alerts.length > 0) {
            const nextAlert = alerts[0];
            if (nextAlert && !isFaceMatchingDialogOpen()) {
                setCurrentAlert(nextAlert);
                setIsDialogOpen(true);
            }
        }
    }, [alerts, isDialogOpen, isFaceMatchingDialogOpen]);

    const dismissAlert = () => {
        if (currentAlert) {
            setAlerts(prev => prev.filter(a => a.id !== currentAlert.id));
        }
        setIsDialogOpen(false);
        setCurrentAlert(null);
    };

    const handleViewDetails = () => {
        const alert = currentAlert;
        dismissAlert();
        
        if (alert?.matchedReportId) {
            const matchedSource = alert.matchedReportType || (alert.reportType === 'missing' ? 'sighting' : 'missing');
            let url = `/reports/${alert.matchedReportId}?source=${matchedSource}`;
            if (alert.accessToken) {
                url += `&match_token=${alert.accessToken}`;
            }
            router.push(url);
        } else {
            router.push('/my-report');
        }
    };

    const getMatchQuality = (similarity) => {
        if (similarity >= 90) return { label: t.highMatch, color: 'emerald', emoji: '🎯' };
        if (similarity >= 80) return { label: t.mediumMatch, color: 'blue', emoji: '✨' };
        return { label: t.lowMatch, color: 'amber', emoji: '🔍' };
    };

    if (!isDialogOpen || !currentAlert) return null;

    const matchQuality = currentAlert.similarity ? getMatchQuality(currentAlert.similarity) : null;
    const remainingAlerts = alerts.length - 1;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={dismissAlert}
            />
            
            {/* Dialog */}
            <div 
                className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <div 
                    className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto animate-scaleIn border border-gray-200 dark:border-gray-800"
                >
                    {/* Header with gradient and icon */}
                    <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 py-8 text-center overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                        
                        {/* Close button */}
                        <button
                            onClick={dismissAlert}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all group"
                        >
                            <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Animated success icon */}
                        <div className="relative inline-flex items-center justify-center mb-4">
                            <div className="absolute w-20 h-20 bg-white/20 rounded-full animate-ping" />
                            <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1">
                            {t.matchFound}
                        </h2>
                        <p className="text-white/80 text-sm">
                            {t.subtitle}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Message */}
                        <p className="text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
                            {currentAlert.reportType === 'sighting' 
                                ? t.sightingMatchMessage 
                                : t.matchFoundMessage}
                        </p>

                        {/* Similarity Score */}
                        {currentAlert.similarity && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        {t.similarity}
                                    </span>
                                    {matchQuality && (
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            matchQuality.color === 'emerald' 
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                : matchQuality.color === 'blue'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                        }`}>
                                            {matchQuality.label}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Progress bar */}
                                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${currentAlert.similarity}%` }}
                                    />
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {currentAlert.similarity.toFixed(1)}%
                                    </span>
                                    {matchQuality && (
                                        <span className="text-lg">{matchQuality.emoji}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Remaining alerts indicator */}
                        {remainingAlerts > 0 && (
                            <div className="text-center mb-4">
                                <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    {t.queueMessage.replace('{count}', remainingAlerts)}
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleViewDetails}
                                className="flex-1 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 group"
                            >
                                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t.viewDetails}
                            </button>
                            <button
                                onClick={dismissAlert}
                                className="px-5 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
                            >
                                {t.dismiss}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
}
