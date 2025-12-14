'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [locale, setLocale] = useState('en');

    // Use ref to track if recovery was validated (avoids stale closure issue)
    const recoveryValidatedRef = useRef(false);

    // Get user's locale preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLocale = localStorage.getItem('locale');
            if (savedLocale && (savedLocale === 'en' || savedLocale === 'ar')) {
                setLocale(savedLocale);
            } else {
                const browserLang = navigator.language?.split('-')[0];
                if (browserLang === 'ar') {
                    setLocale('ar');
                }
            }
        }
    }, []);

    // Translations
    const t = {
        en: {
            title: "Reset Your Password",
            description: "Enter your new password below.",
            newPassword: "New Password",
            confirmPassword: "Confirm Password",
            requirements: {
                title: "Password requirements:",
                minLength: "At least 8 characters",
                number: "At least one number",
                symbol: "At least one special character (!@#$%^&*)"
            },
            button: "Reset Password",
            resetting: "Resetting...",
            success: {
                title: "Password Reset Successfully!",
                description: "Your password has been updated. Redirecting to your profile..."
            },
            invalidLink: {
                title: "Invalid or Expired Link",
                description: "This password reset link is invalid or has expired. Please request a new one."
            },
            errors: {
                mismatch: "Passwords do not match",
                tooShort: "Password must be at least 8 characters",
                noNumber: "Password must contain at least one number",
                noSymbol: "Password must contain at least one special character",
                failed: "Failed to reset password. Please try again."
            },
            backToHome: "Back to Home",
            loading: "Loading..."
        },
        ar: {
            title: "إعادة تعيين كلمة المرور",
            description: "أدخل كلمة المرور الجديدة أدناه.",
            newPassword: "كلمة المرور الجديدة",
            confirmPassword: "تأكيد كلمة المرور",
            requirements: {
                title: "متطلبات كلمة المرور:",
                minLength: "٨ أحرف على الأقل",
                number: "رقم واحد على الأقل",
                symbol: "رمز خاص واحد على الأقل (!@#$%^&*)"
            },
            button: "إعادة تعيين كلمة المرور",
            resetting: "جارٍ إعادة التعيين...",
            success: {
                title: "تم إعادة تعيين كلمة المرور بنجاح!",
                description: "تم تحديث كلمة المرور الخاصة بك. جارٍ التوجيه إلى صفحتك الشخصية..."
            },
            invalidLink: {
                title: "رابط غير صالح أو منتهي الصلاحية",
                description: "رابط إعادة تعيين كلمة المرور هذا غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد."
            },
            errors: {
                mismatch: "كلمات المرور غير متطابقة",
                tooShort: "يجب أن تكون كلمة المرور ٨ أحرف على الأقل",
                noNumber: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل",
                noSymbol: "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل",
                failed: "فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى."
            },
            backToHome: "العودة للرئيسية",
            loading: "جارٍ التحميل..."
        }
    };

    const text = t[locale] || t.en;

    useEffect(() => {
        let mounted = true;


        console.log('[ResetPassword] Page loaded');
        console.log('[ResetPassword] Full URL:', window.location.href);
        console.log('[ResetPassword] Hash:', window.location.hash);
        console.log('[ResetPassword] Search:', window.location.search);
        console.log('[ResetPassword] Pathname:', window.location.pathname);

        // Parse and log all URL parameters for debugging
        if (window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            console.log('[ResetPassword] All query params:');
            for (const [key, value] of urlParams.entries()) {
                console.log(`  ${key}:`, value);
            }
        }


        const handleRecovery = async () => {
            // Set up auth listener FIRST to catch PASSWORD_RECOVERY event
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[ResetPassword] Auth event:', event, 'Has session:', !!session);

                if (!mounted) return;

                if (event === 'PASSWORD_RECOVERY') {
                    console.log('[ResetPassword] PASSWORD_RECOVERY event - allowing access');
                    recoveryValidatedRef.current = true;
                    setIsValidSession(true);
                    setCheckingSession(false);
                } else if (event === 'SIGNED_IN' && session) {
                    // Check if this SIGNED_IN is from a recovery flow
                    const amr = session.user?.amr || [];
                    const hasRecovery = amr.some(a => a.method === 'recovery');
                    console.log('[ResetPassword] SIGNED_IN event, AMR:', amr, 'hasRecovery:', hasRecovery);

                    if (hasRecovery) {
                        recoveryValidatedRef.current = true;
                        setIsValidSession(true);
                        setCheckingSession(false);
                    }
                }
            });

            try {
                const hashParams = window.location.hash;
                const searchParams = window.location.search;

                // FIRST: Check for existing session before any operations
                const { data: currentSessionData } = await supabase.auth.getSession();
                const hasExistingSession = !!currentSessionData?.session;
                console.log('[ResetPassword] Has existing session:', hasExistingSession);

                // Check for errors from API route or Supabase
                if (searchParams) {
                    const urlParams = new URLSearchParams(searchParams);
                    const errorParam = urlParams.get('error');

                    console.log('[ResetPassword] Query params - error:', errorParam);

                    if (errorParam) {
                        console.log('[ResetPassword] Error from API/Supabase:', errorParam);
                        setError('invalid');
                        setCheckingSession(false);
                        window.history.replaceState(null, '', window.location.pathname);
                        return;
                    }
                }

                // Try hash params (older Supabase flow)
                if (hashParams && hashParams.includes('access_token')) {
                    console.log('[ResetPassword] Found tokens in hash');
                    const params = new URLSearchParams(hashParams.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    const type = params.get('type');

                    console.log('[ResetPassword] Token type:', type);

                    // Only accept 'recovery' type tokens
                    if (accessToken && type === 'recovery') {
                        console.log('[ResetPassword] Setting session from recovery tokens');
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || ''
                        });

                        console.log('[ResetPassword] setSession result - error:', error, 'hasSession:', !!data?.session);

                        if (!error && data.session && mounted) {
                            recoveryValidatedRef.current = true;
                            setIsValidSession(true);
                            setCheckingSession(false);
                            window.history.replaceState(null, '', window.location.pathname);
                            return;
                        }
                    }
                }

                // Try query params (some Supabase versions use this)
                if (searchParams && (searchParams.includes('token_hash') || searchParams.includes('type=recovery'))) {
                    console.log('[ResetPassword] Found token_hash or recovery type in query params');
                    // Supabase should auto-detect and process this with detectSessionInUrl
                    // Just wait for the event
                }

                // Wait for Supabase to process (it might auto-detect tokens)
                console.log('[ResetPassword] Waiting for Supabase to process...');
                await new Promise(resolve => setTimeout(resolve, 1500));

                if (recoveryValidatedRef.current) {
                    console.log('[ResetPassword] Already validated via event');
                    return;
                }

                // Check current session
                const { data: { session } } = await supabase.auth.getSession();
                console.log('[ResetPassword] Current session:', session ? 'exists' : 'none');

                if (session && mounted) {
                    const amr = session.user?.amr || [];
                    const isRecoverySession = amr.some(a => a.method === 'recovery');
                    console.log('[ResetPassword] Session AMR:', amr, 'isRecovery:', isRecoverySession);

                    if (isRecoverySession) {
                        recoveryValidatedRef.current = true;
                        setIsValidSession(true);
                        setCheckingSession(false);
                        return;
                    }
                }

                // Give more time
                await new Promise(resolve => setTimeout(resolve, 1500));

                if (mounted && !recoveryValidatedRef.current) {
                    console.log('[ResetPassword] No valid recovery found - showing error');
                    setError('invalid');
                    setCheckingSession(false);
                }

            } catch (err) {
                console.error('[ResetPassword] Error:', err);
                if (mounted) {
                    setError('invalid');
                    setCheckingSession(false);
                }
            }

            return () => {
                subscription?.unsubscribe();
            };
        };

        handleRecovery();

        return () => {
            mounted = false;
        };
    }, []);

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return text.errors.tooShort;
        if (!/\d/.test(pwd)) return text.errors.noNumber;
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return text.errors.noSymbol;
        return null;
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        // Validate password
        const validationError = validatePassword(password);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (password !== confirmPassword) {
            setError(text.errors.mismatch);
            return;
        }

        setLoading(true);

        try {
            // Check if we have a valid session first
            const { data: { session } } = await supabase.auth.getSession();
            console.log('[ResetPassword] Current session before update:', !!session);
            console.log('[ResetPassword] Session user:', session?.user?.email);

            if (!session) {
                console.error('[ResetPassword] No active session found');
                throw new Error('No active session. Please click the reset link again.');
            }

            console.log('[ResetPassword] Attempting to update password...');
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                console.error('[ResetPassword] Update error:', updateError);
                throw updateError;
            }

            console.log('[ResetPassword] Password updated successfully');

            setSuccess(true);

            // Redirect to profile page after success (keep user logged in)
            setTimeout(() => {
                router.push(`/${locale}/profile`);
            }, 2000);

        } catch (err) {
            console.error('[ResetPassword] Password reset error:', err);
            console.error('[ResetPassword] Error message:', err.message);
            console.error('[ResetPassword] Error details:', err);
            setError(err.message || text.errors.failed);
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{text.loading}</p>
                </div>
            </div>
        );
    }

    // Invalid link state - just show error, don't affect user's session
    if (!isValidSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{text.invalidLink.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{text.invalidLink.description}</p>
                    <a
                        href={`/${locale}`}
                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                        {text.backToHome}
                    </a>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{text.success.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{text.success.description}</p>
                </div>
            </div>
        );
    }

    // Reset password form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{text.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">{text.description}</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {text.newPassword}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                style={{ paddingRight: locale === 'ar' ? '1rem' : '3rem', paddingLeft: locale === 'ar' ? '3rem' : '1rem' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                style={{ right: locale === 'ar' ? 'auto' : '0.75rem', left: locale === 'ar' ? '0.75rem' : 'auto' }}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {text.confirmPassword}
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${confirmPassword && password !== confirmPassword
                                    ? 'border-red-500'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                style={{ paddingRight: locale === 'ar' ? '1rem' : '3rem', paddingLeft: locale === 'ar' ? '3rem' : '1rem' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                style={{ right: locale === 'ar' ? 'auto' : '0.75rem', left: locale === 'ar' ? '0.75rem' : 'auto' }}
                            >
                                {showConfirmPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                )}
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-sm text-red-500 mt-1">{text.errors.mismatch}</p>
                        )}
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">{text.requirements.title}</p>
                        <ul className="space-y-1 text-gray-500 dark:text-gray-400">
                            <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-600 dark:text-green-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {password.length >= 8
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    }
                                </svg>
                                {text.requirements.minLength}
                            </li>
                            <li className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/\d/.test(password)
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    }
                                </svg>
                                {text.requirements.number}
                            </li>
                            <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/[!@#$%^&*(),.?":{}|<>]/.test(password)
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    }
                                </svg>
                                {text.requirements.symbol}
                            </li>
                        </ul>
                    </div>

                    {/* Error Message */}
                    {error && error !== 'invalid' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {text.resetting}
                            </>
                        ) : (
                            text.button
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
