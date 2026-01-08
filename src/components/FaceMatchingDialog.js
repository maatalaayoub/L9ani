"use client";

import { useState, useEffect } from 'react';

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
    reportType, // 'missing' or 'sighting'
    faceRecognitionResult, // Result from API { indexed, failed, matches }
    faceRecognitionError, // Error message if face recognition failed
    locale = 'en'
}) {
    const [status, setStatus] = useState('processing'); // processing, complete, error
    const [progress, setProgress] = useState(0);
    
    const isRTL = locale === 'ar';

    // Translations
    const t = {
        en: {
            title: 'Face Recognition Analysis',
            processing: 'Analyzing uploaded photos...',
            extracting: 'Extracting face fingerprints...',
            comparing: 'Comparing with database...',
            complete: 'Analysis Complete',
            matchFound: 'Potential Match Found!',
            matchesFound: 'Potential Matches Found!',
            noMatch: 'No Immediate Match Found',
            noMatchDescription: 'Your report has been saved and the face fingerprint has been stored. You will be notified if a matching report is submitted in the future.',
            similarity: 'Similarity',
            viewMatch: 'View Match Details',
            close: 'Close',
            continue: 'Continue',
            facesIndexed: 'face(s) processed and stored',
            noFaceDetected: 'No face detected in uploaded photos',
            noFaceDescription: 'The system could not detect a clear face in the uploaded photos. The report has been saved, but face matching is not available.',
            error: 'An error occurred during face analysis',
            errorDescription: 'Your report has been saved successfully. Face matching will be retried later.',
            matchedWith: 'Matched with',
            missingReport: 'Missing Person Report',
            sightingReport: 'Sighting Report',
            notifyLater: 'You will receive a notification if a match is found later'
        },
        ar: {
            title: 'تحليل التعرف على الوجه',
            processing: 'جاري تحليل الصور المرفوعة...',
            extracting: 'جاري استخراج بصمة الوجه...',
            comparing: 'جاري المقارنة مع قاعدة البيانات...',
            complete: 'اكتمل التحليل',
            matchFound: 'تم العثور على تطابق محتمل!',
            matchesFound: 'تم العثور على تطابقات محتملة!',
            noMatch: 'لم يتم العثور على تطابق فوري',
            noMatchDescription: 'تم حفظ بلاغك وتخزين بصمة الوجه. سيتم إشعارك إذا تم تقديم بلاغ مطابق في المستقبل.',
            similarity: 'نسبة التشابه',
            viewMatch: 'عرض تفاصيل التطابق',
            close: 'إغلاق',
            continue: 'متابعة',
            facesIndexed: 'وجه/وجوه تمت معالجتها وتخزينها',
            noFaceDetected: 'لم يتم اكتشاف وجه في الصور المرفوعة',
            noFaceDescription: 'لم يتمكن النظام من اكتشاف وجه واضح في الصور المرفوعة. تم حفظ البلاغ، لكن مطابقة الوجه غير متاحة.',
            error: 'حدث خطأ أثناء تحليل الوجه',
            errorDescription: 'تم حفظ بلاغك بنجاح. ستتم إعادة محاولة مطابقة الوجه لاحقاً.',
            matchedWith: 'مطابق مع',
            missingReport: 'بلاغ شخص مفقود',
            sightingReport: 'بلاغ مشاهدة',
            notifyLater: 'ستتلقى إشعاراً إذا تم العثور على تطابق لاحقاً'
        }
    };

    const text = t[locale] || t.en;

    // Simulate progress animation
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
            return;
        }

        // Animate progress while waiting
        setStatus('processing');
        setProgress(0);
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [isOpen, faceRecognitionResult, faceRecognitionError]);

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

    // Get progress message
    const getProgressMessage = () => {
        if (progress < 30) return text.processing;
        if (progress < 60) return text.extracting;
        return text.comparing;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div 
                className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all ${isRTL ? 'rtl' : 'ltr'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-white">{text.title}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {status === 'processing' ? (
                        /* Processing State */
                        <div className="text-center">
                            {/* Animated Face Scanner */}
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-4 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {Math.round(progress)}%
                                </p>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300">{getProgressMessage()}</p>
                        </div>
                    ) : (
                        /* Complete State */
                        <div>
                            {hasMatches ? (
                                /* Matches Found */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {faceRecognitionResult.matches.length === 1 ? text.matchFound : text.matchesFound}
                                    </h3>
                                    
                                    {/* Match Cards */}
                                    <div className="space-y-3 mt-4 max-h-64 overflow-y-auto">
                                        {faceRecognitionResult.matches.map((match, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                                            >
                                                {/* Matched Photo */}
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                                                    {match.matchedPhotoUrl ? (
                                                        <img 
                                                            src={match.matchedPhotoUrl} 
                                                            alt="Matched face"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Match Info */}
                                                <div className="flex-1 text-start">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {text.matchedWith}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                                            {reportType === 'missing' ? text.sightingReport : text.missingReport}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">{text.similarity}:</span>
                                                        <span className={`text-sm font-bold ${
                                                            match.similarity >= 90 ? 'text-green-500' : 
                                                            match.similarity >= 80 ? 'text-yellow-500' : 'text-orange-500'
                                                        }`}>
                                                            {match.similarity.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : hasIndexedFaces ? (
                                /* No Match but Faces Indexed */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {text.noMatch}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                                        {text.noMatchDescription}
                                    </p>
                                    
                                    {/* Indexed Faces Count */}
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {faceRecognitionResult.indexed.length} {text.facesIndexed}
                                        </span>
                                    </div>

                                    <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                                        {text.notifyLater}
                                    </p>
                                </div>
                            ) : allFailed ? (
                                /* No Face Detected */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {text.noFaceDetected}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        {text.noFaceDescription}
                                    </p>
                                </div>
                            ) : (
                                /* Error or Unknown State */
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {text.error}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
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
                            {hasMatches && (
                                <a
                                    href={`/${locale}/my-report?tab=matches`}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
                                >
                                    {text.viewMatch}
                                </a>
                            )}
                            <button
                                onClick={onClose}
                                className={`${hasMatches ? '' : 'flex-1'} px-4 py-2.5 ${
                                    hasMatches 
                                        ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                } text-sm font-medium rounded-lg transition-colors`}
                            >
                                {hasMatches ? text.close : text.continue}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
