"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from "@/context/LanguageContext";

export default function ResetPasswordPage() {
    const router = useRouter();
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        let mounted = true;
        let recoveryValidated = false;

        const handleRecovery = async () => {
            try {
                // SECURITY: Only allow password reset if we have valid recovery tokens in URL
                // Do NOT allow access just because user has an existing session
                
                const hashParams = window.location.hash;
                console.log('Hash params:', hashParams);
                
                // Check for recovery tokens in URL hash
                if (hashParams && hashParams.includes('access_token')) {
                    const params = new URLSearchParams(hashParams.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    const type = params.get('type');
                    
                    console.log('Token type:', type, 'Access token exists:', !!accessToken);
                    
                    // CRITICAL: Only accept 'recovery' type tokens
                    if (accessToken && type === 'recovery') {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || ''
                        });
                        
                        if (error) {
                            console.error('Session error:', error);
                            if (mounted) {
                                setError(t('resetPassword.errors.invalidLink'));
                                setCheckingSession(false);
                            }
                            return;
                        }
                        
                        if (data.session && mounted) {
                            recoveryValidated = true;
                            setIsValidSession(true);
                            setCheckingSession(false);
                            window.history.replaceState(null, '', window.location.pathname);
                            return;
                        }
                    }
                }
                
                // Listen for PASSWORD_RECOVERY event from Supabase
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('Auth event:', event);
                    
                    if (!mounted) return;
                    
                    // CRITICAL: Only accept PASSWORD_RECOVERY event, not regular SIGNED_IN
                    if (event === 'PASSWORD_RECOVERY') {
                        recoveryValidated = true;
                        setIsValidSession(true);
                        setCheckingSession(false);
                    }
                });

                // Wait for potential PASSWORD_RECOVERY event
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // If no recovery was validated, show invalid link error
                if (!recoveryValidated && mounted) {
                    console.log('No valid recovery token found');
                    setError(t('resetPassword.errors.invalidLink'));
                    setCheckingSession(false);
                }

                return () => {
                    subscription?.unsubscribe();
                };
                
            } catch (err) {
                console.error('Recovery error:', err);
                if (mounted) {
                    setError(t('resetPassword.errors.invalidLink'));
                    setCheckingSession(false);
                }
            }
        };

        handleRecovery();

        return () => {
            mounted = false;
        };
    }, [t]);

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return t('resetPassword.errors.tooShort');
        if (!/\d/.test(pwd)) return t('resetPassword.errors.noNumber');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return t('resetPassword.errors.noSymbol');
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
            setError(t('resetPassword.errors.mismatch'));
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                throw updateError;
            }

            // Update has_password in profiles table
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ has_password: true })
                    .eq('auth_user_id', user.id);
            }

            setSuccess(true);

            // Redirect to profile after 3 seconds
            setTimeout(() => {
                router.push('/profile');
            }, 3000);

        } catch (err) {
            console.error('Reset password error:', err);
            setError(t('resetPassword.errors.failed'));
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isValidSession && !checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('resetPassword.invalidLink.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{t('resetPassword.invalidLink.description')}</p>
                    <Link 
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                        {tCommon('buttons.backToHome')}
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('resetPassword.success.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('resetPassword.success.description')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('resetPassword.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">{t('resetPassword.description')}</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('resetPassword.newPassword')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                            {t('resetPassword.confirmPassword')}
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12 ${
                                    confirmPassword && password !== confirmPassword
                                        ? 'border-red-500'
                                        : 'border-gray-200 dark:border-gray-700'
                                }`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showConfirmPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                )}
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-sm text-red-500 mt-1">{t('resetPassword.errors.mismatch')}</p>
                        )}
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('resetPassword.requirements.title')}</p>
                        <ul className="space-y-1 text-gray-500 dark:text-gray-400">
                            <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-600 dark:text-green-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {password.length >= 8 
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    }
                                </svg>
                                {t('resetPassword.requirements.minLength')}
                            </li>
                            <li className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/\d/.test(password)
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    }
                                </svg>
                                {t('resetPassword.requirements.number')}
                            </li>
                            <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {/[!@#$%^&*(),.?":{}|<>]/.test(password)
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                    }
                                </svg>
                                {t('resetPassword.requirements.symbol')}
                            </li>
                        </ul>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {t('resetPassword.resetting')}
                            </>
                        ) : (
                            t('resetPassword.button')
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
