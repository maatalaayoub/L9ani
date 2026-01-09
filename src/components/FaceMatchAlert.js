"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/lib/notifications';

/**
 * FaceMatchAlert Component
 * 
 * A global component that subscribes to real-time face match notifications
 * and displays an animated alert when a match is found.
 * 
 * Should be placed in the root layout so it works across all pages.
 */
export default function FaceMatchAlert({ locale = 'en' }) {
    const { user } = useAuth();
    const router = useRouter();
    const [alerts, setAlerts] = useState([]);
    const isRTL = locale === 'ar';

    const translations = {
        en: {
            matchFound: 'Potential Match Found!',
            matchFoundMessage: 'A potential face match has been found for your report.',
            similarity: 'Similarity',
            viewDetails: 'View Details',
            dismiss: 'Dismiss',
            celebrate: 'This could be a breakthrough!',
        },
        ar: {
            matchFound: 'تم العثور على تطابق محتمل!',
            matchFoundMessage: 'تم العثور على تطابق محتمل للوجه في بلاغك.',
            similarity: 'نسبة التشابه',
            viewDetails: 'عرض التفاصيل',
            dismiss: 'إغلاق',
            celebrate: 'قد يكون هذا تقدماً مهماً!',
        },
    };

    const t = translations[locale] || translations.en;

    // Handle new notification
    const handleNewNotification = useCallback((notification) => {
        console.log('[FaceMatchAlert] Received notification:', notification);
        
        // Only handle face match notifications
        if (notification.type === NotificationType.FACE_MATCH_FOUND || notification.type === 'FACE_MATCH_FOUND') {
            const alertData = {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                similarity: notification.data?.similarity,
                matchId: notification.data?.matchId,
                reportType: notification.data?.reportType,
                matchedReportId: notification.data?.matchedReportId,
                timestamp: Date.now(),
            };
            
            setAlerts(prev => [...prev, alertData]);
            
            // Auto-dismiss after 30 seconds
            setTimeout(() => {
                dismissAlert(notification.id);
            }, 30000);
        }
    }, []);

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
                if (status === 'SUBSCRIBED') {
                    console.log('[FaceMatchAlert] Successfully subscribed to notifications channel');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[FaceMatchAlert] Channel error - realtime may not be enabled for notifications table');
                } else if (status === 'TIMED_OUT') {
                    console.error('[FaceMatchAlert] Subscription timed out');
                }
            });

        return () => {
            console.log('[FaceMatchAlert] Unsubscribing from notifications');
            supabase.removeChannel(channel);
        };
    }, [user?.id, handleNewNotification]);

    const dismissAlert = (alertId) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const handleViewDetails = (alert) => {
        dismissAlert(alert.id);
        // Navigate to the matched report's detail page
        // If user's report type is 'missing', the matched report is 'sighting' and vice versa
        if (alert.matchedReportId) {
            const matchedSource = alert.reportType === 'missing' ? 'sighting' : 'missing';
            router.push(`/reports/${alert.matchedReportId}?source=${matchedSource}`);
        } else {
            router.push('/my-report');
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div 
            className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md"
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        >
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className="animate-slide-in-right bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-green-200 dark:border-green-800 overflow-hidden"
                >
                    {/* Celebration Header */}
                    <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 px-4 py-3 relative overflow-hidden">
                        {/* Animated particles */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        animationDelay: `${i * 0.2}s`,
                                        animationDuration: `${2 + Math.random()}s`,
                                    }}
                                />
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-3 relative z-10">
                            {/* Pulsing icon */}
                            <div className="relative">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="absolute inset-0 bg-white/40 rounded-full animate-ping" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg">{t.matchFound}</h3>
                                <p className="text-white/80 text-sm">{t.celebrate}</p>
                            </div>
                            {/* Close button */}
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                            {alert.message || t.matchFoundMessage}
                        </p>
                        
                        {/* Similarity Badge */}
                        {alert.similarity && (
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t.similarity}:</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    alert.similarity >= 90 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                        : alert.similarity >= 80 
                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
                                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                }`}>
                                    {alert.similarity.toFixed(1)}%
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleViewDetails(alert)}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t.viewDetails}
                            </button>
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                            >
                                {t.dismiss}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Custom animation styles */}
            <style jsx>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0) scale(1);
                        opacity: 0.3;
                    }
                    50% {
                        transform: translateY(-20px) scale(1.2);
                        opacity: 0.6;
                    }
                }
                
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out forwards;
                }
                
                .animate-float {
                    animation: float 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
