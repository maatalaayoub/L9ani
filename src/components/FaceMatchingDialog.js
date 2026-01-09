"use client";

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/**
 * FaceMatchingDialog Component
 * 
 * Shows the progress of face matching after a report is submitted.
 * Displays results including matches found or confirmation that
 * the face fingerprint was stored for future matching.
 */
export default function FaceMatchingDialog({ 
    isOpen, 
    onClose, 
    reportId,
    reportType = 'missing', // 'missing' or 'sighting'
    faceRecognitionResult, // Result from API { indexed, failed, matches }
    faceRecognitionError, // Error message if face recognition failed
    locale = 'en'
}) {
    const [status, setStatus] = useState('searching'); // searching, complete, error
    const [progress, setProgress] = useState(0);
    const [searchPhase, setSearchPhase] = useState(0); // 0: submitting, 1: processing, 2: searching
    const router = useRouter();
    
    const isRTL = locale === 'ar';

    // Translations
    const t = {
        en: {
            title: 'Face Recognition Analysis',
            submitting: 'Report submitted successfully!',
            submittingDesc: 'Now starting face analysis...',
            processing: 'Processing uploaded photos...',
            processingDesc: 'Extracting facial features...',
            searching: 'Searching for matches...',
            searchingDesc: reportType === 'missing' 
                ? 'Comparing with sighting reports database...'
                : 'Comparing with missing persons database...',
            complete: 'Search Complete',
            matchFound: 'Potential Match Found!',
            matchesFound: 'Potential Matches Found!',
            matchFoundDesc: reportType === 'missing'
                ? 'We found a potential match in our sighting reports. This could be a breakthrough!'
                : 'We found a potential match in our missing persons reports!',
            noMatch: 'No Match Found',
            noMatchDesc: reportType === 'missing'
                ? 'No matching faces were found in the sighting reports database. Your report has been stored and you will be notified immediately if someone reports seeing a person matching this description.'
                : 'No matching faces were found in the missing persons database. Your sighting has been stored and the reporter of any matching missing person will be notified immediately.',
            similarity: 'Similarity',
            viewMatch: 'View Match Details',
            viewAllMatches: 'View All Matches',
            continue: 'Continue to My Reports',
            close: 'Close',
            facesIndexed: 'face(s) processed and stored',
            noFaceDetected: 'No Face Detected',
            noFaceDescription: 'The system could not detect a clear face in the uploaded photos. The report has been saved, but automatic face matching is not available. You can still receive matches if someone manually identifies a connection.',
            error: 'Face Analysis Error',
            errorDescription: 'Your report has been saved successfully. Face matching encountered an issue but will be retried automatically.',
            matchedWith: 'Matched with',
            missingReport: 'Missing Person Report',
            sightingReport: 'Sighting Report',
            willNotify: 'You will be notified instantly if a match is found!',
            faceStored: 'Face fingerprint stored successfully'
        },
        ar: {
            title: 'تحليل التعرف على الوجه',
            submitting: 'تم إرسال البلاغ بنجاح!',
            submittingDesc: 'جاري بدء تحليل الوجه...',
            processing: 'جاري معالجة الصور المرفوعة...',
            processingDesc: 'جاري استخراج ملامح الوجه...',
            searching: 'جاري البحث عن تطابق...',
            searchingDesc: reportType === 'missing'
                ? 'جاري المقارنة مع قاعدة بيانات بلاغات المشاهدة...'
                : 'جاري المقارنة مع قاعدة بيانات المفقودين...',
            complete: 'اكتمل البحث',
            matchFound: 'تم العثور على تطابق محتمل!',
            matchesFound: 'تم العثور على تطابقات محتملة!',
            matchFoundDesc: reportType === 'missing'
                ? 'وجدنا تطابقاً محتملاً في بلاغات المشاهدة. قد يكون هذا تقدماً مهماً!'
                : 'وجدنا تطابقاً محتملاً في بلاغات المفقودين!',
            noMatch: 'لم يتم العثور على تطابق',
            noMatchDesc: reportType === 'missing'
                ? 'لم يتم العثور على وجوه مطابقة في قاعدة بيانات المشاهدات. تم حفظ بلاغك وسيتم إشعارك فوراً إذا أبلغ شخص ما عن رؤية شخص يطابق هذا الوصف.'
                : 'لم يتم العثور على وجوه مطابقة في قاعدة بيانات المفقودين. تم حفظ مشاهدتك وسيتم إشعار صاحب أي بلاغ مطابق فوراً.',
            similarity: 'نسبة التشابه',
            viewMatch: 'عرض تفاصيل التطابق',
            viewAllMatches: 'عرض جميع التطابقات',
            continue: 'متابعة إلى بلاغاتي',
            close: 'إغلاق',
            facesIndexed: 'وجه/وجوه تمت معالجتها وتخزينها',
            noFaceDetected: 'لم يتم اكتشاف وجه',
            noFaceDescription: 'لم يتمكن النظام من اكتشاف وجه واضح في الصور المرفوعة. تم حفظ البلاغ، لكن المطابقة التلقائية غير متاحة.',
            error: 'خطأ في تحليل الوجه',
            errorDescription: 'تم حفظ بلاغك بنجاح. واجهت مطابقة الوجه مشكلة لكن ستتم إعادة المحاولة تلقائياً.',
            matchedWith: 'مطابق مع',
            missingReport: 'بلاغ شخص مفقود',
            sightingReport: 'بلاغ مشاهدة',
            willNotify: 'سيتم إشعارك فوراً إذا تم العثور على تطابق!',
            faceStored: 'تم تخزين بصمة الوجه بنجاح'
        }
    };

    const text = t[locale] || t.en;

    // Progress animation with phases
    useEffect(() => {
        if (!isOpen) return;

        // If we have an error, show error state
        if (faceRecognitionError) {
            setStatus('error');
            setProgress(100);
            return;
        }

        // If we already have results, skip to complete
        if (faceRecognitionResult) {
            setStatus('complete');
            setProgress(100);
            setSearchPhase(2);
            return;
        }

        // Animate progress through phases
        setStatus('searching');
        setProgress(0);
        setSearchPhase(0);
        
        // Phase 0: Submitting (0-20%)
        const phase0 = setTimeout(() => setSearchPhase(1), 1000);
        
        // Phase 1: Processing (20-50%)
        const phase1 = setTimeout(() => setSearchPhase(2), 2500);
        
        // Progress animation - uses a ref to avoid dependency on searchPhase
        let currentPhase = 0;
        const interval = setInterval(() => {
            setSearchPhase(prev => {
                currentPhase = prev;
                return prev;
            });
            setProgress(prev => {
                if (prev >= 90) return prev;
                // Slow progress based on phase
                const increment = currentPhase === 0 ? 5 : currentPhase === 1 ? 3 : 2;
                return Math.min(prev + (Math.random() * increment), 90);
            });
        }, 300);

        return () => {
            clearInterval(interval);
            clearTimeout(phase0);
            clearTimeout(phase1);
        };
    }, [isOpen, faceRecognitionResult, faceRecognitionError]); // Removed searchPhase from deps

    // Update status when result arrives
    useEffect(() => {
        if (faceRecognitionError) {
            setProgress(100);
            setStatus('error');
        } else if (faceRecognitionResult) {
            setProgress(100);
            setStatus('complete');
        }
    }, [faceRecognitionResult, faceRecognitionError]);

    if (!isOpen) return null;

    const hasMatches = faceRecognitionResult?.matches?.length > 0;
    const hasIndexedFaces = faceRecognitionResult?.indexed?.length > 0;
    const allFailed = faceRecognitionResult?.failed?.length > 0 && !hasIndexedFaces;

    // Get phase message
    const getPhaseInfo = () => {
        if (searchPhase === 0) return { title: text.submitting, desc: text.submittingDesc };
        if (searchPhase === 1) return { title: text.processing, desc: text.processingDesc };
        return { title: text.searching, desc: text.searchingDesc };
    };

    const handleViewMatches = () => {
        onClose();
        // Navigate to the first matched report's detail page
        if (faceRecognitionResult?.matches?.length > 0) {
            const firstMatch = faceRecognitionResult.matches[0];
            // Determine the source type based on current report type
            // If current report is 'missing', the matched report is 'sighting' and vice versa
            const matchedSource = reportType === 'missing' ? 'sighting' : 'missing';
            router.push(`/reports/${firstMatch.matchedReportId}?source=${matchedSource}`);
        } else {
            router.push('/my-report');
        }
    };

    const handleContinue = () => {
        onClose();
        router.push('/my-report');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div 
                className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all ${isRTL ? 'rtl' : 'ltr'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            {status === 'complete' && hasMatches ? (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </div>
                        <h2 className="text-lg font-semibold text-white">{text.title}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {status === 'searching' ? (
                        /* Searching State */
                        <div className="text-center">
                            {/* Animated Search Scanner */}
                            <div className="relative w-28 h-28 mx-auto mb-6">
                                {/* Outer ring */}
                                <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900/50 rounded-full"></div>
                                {/* Spinning ring */}
                                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
                                {/* Middle ring */}
                                <div className="absolute inset-3 border-2 border-blue-200 dark:border-blue-800 rounded-full"></div>
                                {/* Pulsing center */}
                                <div className="absolute inset-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Phase Info */}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {getPhaseInfo().title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {getPhaseInfo().desc}
                            </p>

                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                    {Math.round(progress)}%
                                </p>
                            </div>
                        </div>
                    ) : status === 'error' ? (
                        /* Error State */
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {text.error}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {text.errorDescription}
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="text-sm">{text.willNotify}</span>
                            </div>
                        </div>
                    ) : (
                        /* Complete State */
                        <div>
                            {hasMatches ? (
                                /* Matches Found */
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center relative">
                                        <div className="absolute inset-0 rounded-full animate-ping bg-green-200 dark:bg-green-800/30 opacity-50"></div>
                                        <svg className="w-10 h-10 text-green-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                                        {faceRecognitionResult.matches.length === 1 ? text.matchFound : text.matchesFound}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                        {text.matchFoundDesc}
                                    </p>
                                    
                                    {/* Match Cards */}
                                    <div className="space-y-3 mt-4 max-h-48 overflow-y-auto">
                                        {faceRecognitionResult.matches.slice(0, 3).map((match, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800"
                                            >
                                                {/* Matched Photo */}
                                                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700 ring-2 ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900">
                                                    {match.matchedPhotoUrl ? (
                                                        <img 
                                                            src={match.matchedPhotoUrl} 
                                                            alt="Matched face"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Match Info */}
                                                <div className="flex-1 text-start">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                                                            {reportType === 'missing' ? text.sightingReport : text.missingReport}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{text.similarity}:</span>
                                                        <span className={`text-sm font-bold ${
                                                            match.similarity >= 90 ? 'text-green-600 dark:text-green-400' : 
                                                            match.similarity >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'
                                                        }`}>
                                                            {match.similarity.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {faceRecognitionResult.matches.length > 3 && (
                                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                            +{faceRecognitionResult.matches.length - 3} more matches
                                        </p>
                                    )}
                                </div>
                            ) : hasIndexedFaces ? (
                                /* No Match but Faces Indexed */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {text.noMatch}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        {text.noMatchDesc}
                                    </p>
                                    
                                    {/* Success indicator */}
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg mb-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {text.faceStored}
                                        </span>
                                    </div>

                                    {/* Notification promise */}
                                    <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        <span className="text-xs">{text.willNotify}</span>
                                    </div>
                                </div>
                            ) : allFailed ? (
                                /* No Face Detected */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {text.noFaceDetected}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {text.noFaceDescription}
                                    </p>
                                </div>
                            ) : (
                                /* Unknown state - treat like error */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {text.error}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {text.errorDescription}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(status === 'complete' || status === 'error') && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-3">
                            {hasMatches ? (
                                <>
                                    <button
                                        onClick={handleViewMatches}
                                        className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {faceRecognitionResult.matches.length > 1 ? text.viewAllMatches : text.viewMatch}
                                    </button>
                                    <button
                                        onClick={handleContinue}
                                        className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {text.close}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleContinue}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {text.continue}
                                    <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
