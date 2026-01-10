"use client";

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { 
    ScanFace, 
    Search, 
    CheckCircle2, 
    AlertCircle, 
    X, 
    ChevronRight, 
    ShieldCheck, 
    UserX,
    Loader2,
    Eye
} from 'lucide-react';

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

    // Set sessionStorage flag when dialog opens/closes to prevent FaceMatchAlert from showing
    useEffect(() => {
        if (isOpen) {
            sessionStorage.setItem('faceMatchingDialogOpen', 'true');
        } else {
            sessionStorage.removeItem('faceMatchingDialogOpen');
        }
        
        // Cleanup on unmount
        return () => {
            sessionStorage.removeItem('faceMatchingDialogOpen');
        };
    }, [isOpen]);

    // Translations
    const t = {
        en: {
            title: 'Face Analysis',
            submitting: 'Secure Submission',
            submittingDesc: 'Encrypting and uploading report data...',
            processing: 'Biometric Processing',
            processingDesc: 'Extracting secure facial fingerprints...',
            searching: 'Database Search',
            searchingDesc: reportType === 'missing' 
                ? 'Cross-referencing with sighting reports...'
                : 'Cross-referencing with missing persons...',
            complete: 'Analysis Complete',
            matchFound: 'Potential Match Found',
            matchesFound: 'Potential Matches Found',
            matchFoundDesc: reportType === 'missing'
                ? 'We found a potential match in our sighting database.'
                : 'We found a potential match in our missing persons database.',
            noMatch: 'No Immediate Match',
            noMatchDesc: reportType === 'missing'
                ? 'Your report is now active. We will instantly notify you when a matching sighting is reported.'
                : 'The sighting is now active. We will instantly notify the reporter when a match is found.',
            similarity: 'Match Confidence',
            viewMatch: 'View Match Details',
            viewAllMatches: 'View All Matches',
            continue: 'Go to My Reports',
            close: 'Close',
            facesIndexed: 'Face indexed securely',
            noFaceDetected: 'No Face Detected',
            noFaceDescription: 'We couldn\'t detect a clear face. The report is saved, but automatic matching is disabled.',
            error: 'Analysis Paused',
            errorDescription: 'Report saved. Face analysis will retry automatically in the background.',
            matchedWith: 'Matches with',
            missingReport: 'Missing Person',
            sightingReport: 'Sighting',
            willNotify: 'Active Monitoring Enabled',
            faceStored: 'Biometric fingerprint stored'
        },
        ar: {
            title: 'تحليل الوجه',
            submitting: 'إرسال آمن',
            submittingDesc: 'جاري تشفير ورفع بيانات البلاغ...',
            processing: 'المعالجة البيومترية',
            processingDesc: 'جاري استخراج بصمة الوجه...',
            searching: 'بحث في قاعدة البيانات',
            searchingDesc: reportType === 'missing' 
                ? 'مقارنة مع سجلات المشاهدات...'
                : 'مقارنة مع سجلات المفقودين...',
            complete: 'اكتمل التحليل',
            matchFound: 'تم العثور على تطابق',
            matchesFound: 'تطابقات محتملة',
            matchFoundDesc: reportType === 'missing'
                ? 'وجدنا تطابقاً محتملاً في قاعدة بيانات المشاهدات.'
                : 'وجدنا تطابقاً محتملاً في قاعدة بيانات المفقودين.',
            noMatch: 'لا يوجد تطابق فوري',
            noMatchDesc: reportType === 'missing'
                ? 'بلاغك نشط الآن. سنقوم بإشعارك فوراً عند الإبلاغ عن مشاهدة مطابقة.'
                : 'المشاهدة نشطة الآن. سنقوم بإشعار صاحب البلاغ فوراً عند العثور على تطابق.',
            similarity: 'نسبة التطابق',
            viewMatch: 'عرض التفاصيل',
            viewAllMatches: 'عرض التطابقات',
            continue: 'الذهاب إلى بلاغاتي',
            close: 'إغلاق',
            facesIndexed: 'تمت فهرسة الوجه بأمان',
            noFaceDetected: 'لم يتم اكتشاف وجه',
            noFaceDescription: 'لم نتمكن من كشف وجه واضح. تم حفظ البلاغ، لكن المطابقة التلقائية غير مفعلة.',
            error: 'توقف التحليل مؤقتاً',
            errorDescription: 'تم حفظ البلاغ. ستتم إعادة محاولة تحليل الوجه تلقائياً.',
            matchedWith: 'مطابق مع',
            missingReport: 'مفقود',
            sightingReport: 'مشاهدة',
            willNotify: 'المراقبة النشطة مفعلة',
            faceStored: 'تم تخزين البصمة البيومترية'
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
    const getPhaseContent = () => {
        if (searchPhase === 0) return { 
            title: text.submitting, 
            desc: text.submittingDesc,
            icon: <ShieldCheck className="w-12 h-12 text-blue-500 animate-pulse" />
        };
        if (searchPhase === 1) return { 
            title: text.processing, 
            desc: text.processingDesc,
            icon: <ScanFace className="w-12 h-12 text-indigo-500 animate-pulse" />
        };
        return { 
            title: text.searching, 
            desc: text.searchingDesc,
            icon: <Search className="w-12 h-12 text-purple-500 animate-pulse" />
        };
    };

    const handleViewMatches = (match = null) => {
        // Use provided match or fall back to first match
        const targetMatch = match || faceRecognitionResult?.matches?.[0];
        
        console.log('[FaceMatchingDialog] handleViewMatches called, targetMatch:', targetMatch);
        
        if (targetMatch && targetMatch.matchedReportId) {
            // Use the matchedReportType from the result, or determine from current report type
            const matchedSource = targetMatch.matchedReportType || (reportType === 'missing' ? 'sighting' : 'missing');
            
            // Build URL with access token if available
            let url = `/reports/${targetMatch.matchedReportId}?source=${matchedSource}`;
            if (targetMatch.accessToken) {
                url += `&match_token=${targetMatch.accessToken}`;
            }
            
            console.log('[FaceMatchingDialog] Navigating to URL:', url);
            
            // Use the localized router.push - same as notification handler
            router.push(url);
        } else {
            console.log('[FaceMatchingDialog] No valid target match, calling onClose');
            onClose();
        }
    };

    const handleContinue = () => {
        onClose();
        router.push('/my-report');
    };

    const phase = getPhaseContent();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
            <div 
                className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full overflow-hidden transform transition-all border border-gray-100 dark:border-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Close button (only visible when complete/error) */}
                {(status === 'complete' || status === 'error') && (
                    <button 
                        onClick={handleContinue}
                        className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100/50 dark:bg-gray-800/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* Main Content Area */}
                <div className="p-8">
                    {status === 'searching' ? (
                        /* Searching State */
                        <div className="flex flex-col items-center text-center space-y-8 py-4">
                            {/* Animated Scanner Visual */}
                            <div className="relative">
                                {/* Outer Glow */}
                                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
                                
                                <div className="relative w-24 h-24 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-700 shadow-inner">
                                    {phase.icon}
                                    
                                    {/* Scanning Line Animation */}
                                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                                        <div className="h-1/2 w-full bg-gradient-to-b from-transparent to-blue-500/10 border-b-2 border-blue-500/50 animate-[scan_2s_ease-in-out_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 max-w-xs mx-auto">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {phase.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {phase.desc}
                                </p>
                            </div>

                            {/* Refined Progress Bar */}
                            <div className="w-full space-y-2">
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 font-medium">
                                    <span>{Math.round(progress)}%</span>
                                    <span className="animate-pulse">Processing...</span>
                                </div>
                            </div>
                        </div>
                    ) : status === 'error' ? (
                        /* Error State */
                        <div className="text-center py-6">
                            <div className="w-20 h-20 mx-auto mb-6 bg-orange-50 dark:bg-orange-900/10 rounded-full flex items-center justify-center ring-8 ring-orange-50/50 dark:ring-orange-900/5">
                                <AlertCircle className="w-10 h-10 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {text.error}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                                {text.errorDescription}
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs font-semibold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {text.willNotify}
                            </div>
                        </div>
                    ) : (
                        /* Complete State */
                        <div className="py-2">
                            {hasMatches ? (
                                /* Matches Found */
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-green-50 dark:bg-green-900/10 rounded-full flex items-center justify-center ring-8 ring-green-50/50 dark:ring-green-900/5 relative">
                                        <div className="absolute inset-0 rounded-full animate-ping bg-green-500/20"></div>
                                        <CheckCircle2 className="w-10 h-10 text-green-500 relative z-10" />
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                        {faceRecognitionResult.matches.length === 1 ? text.matchFound : text.matchesFound}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                                        {text.matchFoundDesc}
                                    </p>
                                    
                                    {/* Match Cards - Scrollable if many */}
                                    <div className="space-y-3 mb-8 max-h-[240px] overflow-y-auto custom-scrollbar px-1">
                                        {faceRecognitionResult.matches.slice(0, 3).map((match, index) => (
                                            <div 
                                                key={index}
                                                className="group flex items-center gap-4 p-3 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all cursor-pointer"
                                                onClick={() => handleViewMatches(match)}
                                            >
                                                {/* Matched Photo */}
                                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-700 shadow-sm relative group-hover:scale-105 transition-transform">
                                                    {match.matchedPhotoUrl ? (
                                                        <img 
                                                            src={match.matchedPhotoUrl} 
                                                            alt="Match"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <UserX className="w-6 h-6 text-gray-400" />
                                                        </div>
                                                    )}
                                                    {/* Similarity Badge Over Image */}
                                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-[2px] py-0.5 text-center">
                                                        <span className="text-[10px] font-bold text-white">
                                                            {match.similarity.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Match Info */}
                                                <div className="flex-1 text-start">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full capitalize">
                                                            {reportType === 'missing' ? text.sightingReport : text.missingReport}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                        {text.matchFoundDesc}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <button
                                        onClick={() => handleViewMatches()}
                                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {faceRecognitionResult.matches.length > 1 ? text.viewAllMatches : text.viewMatch}
                                        <ChevronRight className={`w-4 h-4 transition-transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                                    </button>
                                </div>
                            ) : hasIndexedFaces ? (
                                /* No Match but Indexed (Success) */
                                <div className="text-center py-4">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center ring-8 ring-blue-50/50 dark:ring-blue-900/5">
                                        <ShieldCheck className="w-10 h-10 text-blue-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {text.noMatch}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
                                        {text.noMatchDesc}
                                    </p>
                                    
                                    <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 mb-8 flex items-center gap-3 text-start">
                                        <div className="bg-white dark:bg-green-900/30 p-2 rounded-lg shadow-sm">
                                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                                                {text.faceStored}
                                            </h4>
                                            <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-0.5">
                                                {text.willNotify}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleContinue}
                                        className="w-full py-3.5 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-sm font-semibold rounded-xl transition-all"
                                    >
                                        {text.continue}
                                    </button>
                                </div>
                            ) : allFailed ? (
                                /* No Face Detected */
                                <div className="text-center py-4">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center ring-8 ring-gray-50 dark:ring-gray-700/50">
                                        <UserX className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {text.noFaceDetected}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                                        {text.noFaceDescription}
                                    </p>
                                    <button
                                        onClick={handleContinue}
                                        className="w-full py-3.5 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-sm font-semibold rounded-xl transition-all"
                                    >
                                        {text.continue}
                                    </button>
                                </div>
                            ) : (
                                /* Generic Error */
                                <div className="text-center py-4">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center">
                                        <X className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {text.error}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                                        {text.errorDescription}
                                    </p>
                                    <button
                                        onClick={handleContinue}
                                        className="w-full py-3.5 bg-gray-900 dark:bg-gray-700 text-white text-sm font-semibold rounded-xl"
                                    >
                                        {text.close}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Custom Scan Animation Style */}
            <style jsx>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(-100%); }
                    50% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
}
