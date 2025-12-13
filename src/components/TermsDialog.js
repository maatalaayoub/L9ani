"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link } from '@/i18n/navigation';
import { useTranslations } from '@/context/LanguageContext';

export default function TermsDialog({ isOpen, onAccept }) {
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const { user } = useAuth();
    const [isAccepting, setIsAccepting] = useState(false);
    const [hasRead, setHasRead] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAccept = async () => {
        if (!hasRead) {
            setError(t('terms.mustRead') || 'Please confirm that you have read the terms');
            return;
        }

        setIsAccepting(true);
        setError('');

        try {
            const response = await fetch('/api/user/accept-terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept terms');
            }

            // Call the callback to update local state
            onAccept();
        } catch (err) {
            console.error('Error accepting terms:', err);
            setError(err.message || t('terms.acceptError') || 'Failed to accept terms. Please try again.');
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('terms.title') || 'Terms of Service'}</h2>
                            <p className="text-sm text-white/80">{t('terms.subtitle') || 'Please review and accept to continue'}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {t('terms.welcomeMessage') || 'Welcome to Lqani.ma! Before you continue, please review and accept our Terms of Service and Privacy Policy.'}
                    </p>

                    {/* Terms Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 max-h-48 overflow-y-auto">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {t('terms.point1') || 'You agree to use the platform responsibly and in accordance with applicable laws.'}
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {t('terms.point2') || 'Your personal information will be handled according to our Privacy Policy.'}
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {t('terms.point3') || 'You must not submit false reports or misuse the platform.'}
                            </p>
                        </div>
                    </div>

                    {/* Links to full terms */}
                    <div className="flex flex-wrap gap-4 text-sm">
                        <Link 
                            href="/privacy" 
                            target="_blank"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {t('terms.readPrivacy') || 'Read Privacy Policy'}
                        </Link>
                    </div>

                    {/* Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5">
                            <input
                                type="checkbox"
                                checked={hasRead}
                                onChange={(e) => {
                                    setHasRead(e.target.checked);
                                    if (e.target.checked) setError('');
                                }}
                                className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                hasRead 
                                    ? 'bg-blue-600 border-blue-600' 
                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
                            }`}>
                                {hasRead && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('terms.checkboxLabel') || 'I have read and agree to the Terms of Service and Privacy Policy'}
                        </span>
                    </label>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleAccept}
                        disabled={isAccepting || !hasRead}
                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            hasRead
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {isAccepting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {t('terms.accepting') || 'Accepting...'}
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                {t('terms.acceptButton') || 'Accept and Continue'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
