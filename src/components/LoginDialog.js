"use client"

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/lib/supabase";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { useTranslations } from "@/context/LanguageContext";

export default function LoginDialog({ isOpen, onClose, initialTab = "login" }) {
    const t = useTranslations('auth');
    const [activeTab, setActiveTab] = useState(initialTab);
    const { login } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Lock body scroll when dialog is open
    useEffect(() => {
        if (isOpen) {
            // Save current scroll position and lock body
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        };
    }, [isOpen]);

    const [fromSignupSuccess, setFromSignupSuccess] = useState(false);

    // Reset form state when switching tabs, unless coming from successful signup
    useEffect(() => {
        if (!fromSignupSuccess) {
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setFirstName("");
            setLastName("");
            setPhoneNumber("");
            setPasswordError("");
            setSuccessMessage("");
            setAgreedToTerms(false);
            setShowEmailFields(false);
        } else {
            // Reset the flag after one switch
            setFromSignupSuccess(false);
        }
    }, [activeTab, isOpen]);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showEmailFields, setShowEmailFields] = useState(false);

    // Forgot Password State
    const [resetEmailSent, setResetEmailSent] = useState(false);

    // Track last country code for phone input
    const lastCountryCode = useRef(null);

    const handlePhoneChange = (value, data) => {
        let shouldClear = false;

        // If country changed from what we last saw
        if (lastCountryCode.current && lastCountryCode.current !== data.countryCode) {
            shouldClear = true;
        }
        // If first interaction and existing phone not matching new dial code (switch)
        else if (!lastCountryCode.current && phoneNumber && !phoneNumber.startsWith(data.dialCode)) {
            shouldClear = true;
        }

        lastCountryCode.current = data.countryCode;

        if (shouldClear) {
            setPhoneNumber(data.dialCode);
        } else {
            setPhoneNumber(value);
        }
    };

    // Password validation states
    const [validations, setValidations] = useState({
        minLength: false,
        hasNumber: false,
        hasSymbol: false,
        noWeakPattern: false,
        passwordsMatch: false,
    });

    useEffect(() => {
        if (activeTab === "signup" && password) {
            setValidations({
                minLength: password.length >= 8,
                hasNumber: /\d/.test(password),
                hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                noWeakPattern: !checkWeakPatterns(password),
                passwordsMatch: confirmPassword ? password === confirmPassword : false,
            });
        }
    }, [password, confirmPassword, activeTab]);

    const checkWeakPatterns = (pwd) => {
        const weakPatterns = [
            /123/, /234/, /345/, /456/, /567/, /678/, /789/,
            /abc/i, /bcd/i, /cde/i, /def/i, /efg/i, /fgh/i,
            /ghi/i, /hij/i, /ijk/i, /jkl/i, /klm/i, /lmn/i,
            /mno/i, /nop/i, /opq/i, /pqr/i, /qrs/i, /rst/i,
            /stu/i, /tuv/i, /uvw/i, /vwx/i, /wxy/i, /xyz/i,
        ];
        return weakPatterns.some(pattern => pattern.test(pwd));
    };

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return t('validations.minLength');
        if (!/\d/.test(pwd)) return t('validations.hasNumber');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return t('validations.hasSymbol');
        if (checkWeakPatterns(pwd)) return t('errors.weakPassword');
        return "";
    };

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    if (!isOpen) return null;

    // Google OAuth Login Handler
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setPasswordError("");

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Supabase will redirect here after Google auth completes
                    // The Supabase JS client will automatically handle the session
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;

            // The user will be redirected to Google for authentication
            // No need to close the dialog here as the page will redirect
        } catch (err) {
            console.error("Google login error:", err);
            setPasswordError(err.message || t('errors.authFailed') || 'Failed to sign in with Google');
            setIsLoading(false);
        }
    };

    const handleAuth = async (endpoint, payload) => {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) {
                    const errorMsg = data.error || data.message || 'Authentication failed';

                    // Specific Supabase error mapping
                    if (errorMsg === "Invalid login credentials" || errorMsg.includes("curr_user_not_found")) {
                        throw new Error(t('errors.authFailed'));
                    }
                    if (errorMsg.includes("fetch failed") || errorMsg.includes("Failed to fetch")) {
                        throw new Error("Unable to connect to verification server. Please try again.");
                    }

                    throw new Error(errorMsg);
                }
                return data;
            } else {
                const text = await response.text();
                throw new Error(t('errors.serverError'));
            }
        } catch (err) {
            let message = err.message;
            // Handle client-side fetch errors
            if (message === "Failed to fetch" || message.includes("fetch failed")) {
                message = "Network error: Unable to connect to server.";
            }
            setPasswordError(message);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setSuccessMessage("");
        setIsLoading(true);

        // Check if Supabase is initialized
        if (!supabase) {
            setPasswordError(t('errors.serviceUnavailable') || 'Service unavailable. Please try again later.');
            setIsLoading(false);
            return;
        }

        try {
            if (activeTab === "signup") {
                if (!firstName || !lastName || !phoneNumber || !email || !password || !confirmPassword) {
                    setPasswordError(t('errors.fillRequired'));
                    setIsLoading(false);
                    return;
                }

                // Phone Validation
                // react-phone-input-2 returns numbers without '+', but libphonenumber-js expects '+' for international format
                // We strip all non-digits (including spaces) to ensure robust validation as requested by user
                const cleanPhone = phoneNumber.replace(/\D/g, '');
                const formattedPhone = '+' + cleanPhone;

                if (!isValidPhoneNumber(formattedPhone)) {
                    setPasswordError(t('errors.invalidPhone'));
                    setIsLoading(false);
                    return;
                }

                const pwdError = validatePassword(password);
                if (pwdError) {
                    setPasswordError(pwdError);
                    setIsLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setPasswordError(t('errors.passwordMismatch'));
                    setIsLoading(false);
                    return;
                }

                if (!agreedToTerms) {
                    setPasswordError(t('errors.termsRequired'));
                    setIsLoading(false);
                    return;
                }

                // Check if email already exists using our custom RPC
                const { data: emailExists, error: checkError } = await supabase.rpc('check_email_exists', {
                    email_input: email
                });

                if (checkError) {
                    console.error("Email check failed:", checkError);
                    // We continue if the check fails to allow Supabase to handle it, 
                    // or you could block it. Blocking usually better for 'reject account creation' request.
                    // But if RPC fails (e.g. network), signUp might also fail.
                }

                if (emailExists) {
                    setPasswordError(t('errors.emailInUse'));
                    setIsLoading(false);
                    return;
                }

                // Use Supabase Client-Side Auth directly
                // (Bypassing server-side API due to network timeout issues)
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            firstName,
                            lastName,
                            phoneNumber
                        }
                    }
                });

                if (error) {
                    throw error;
                }

                if (data.user) {
                    // Create profile manually since database trigger is blocked by Supabase
                    try {
                        // Generate username
                        const baseUsername = firstName && lastName
                            ? (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '')
                            : firstName
                                ? firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
                                : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                        const username = baseUsername + Math.floor(Math.random() * 9000 + 1000);
                        const verificationCode = Math.floor(Math.random() * 900000 + 100000).toString();

                        // Insert profile
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .insert({
                                auth_user_id: data.user.id,
                                username: username,
                                email: email,
                                first_name: firstName || '',
                                last_name: lastName || '',
                                phone: phoneNumber || '',
                                email_verified: false,
                                email_verified_code: verificationCode
                            });

                        if (profileError) {
                            console.error('Profile creation error:', profileError);
                            // Don't throw - user is created, profile can be created later
                        }
                    } catch (profileErr) {
                        console.error('Error creating profile:', profileErr);
                        // Don't throw - user is created, profile can be created later
                    }

                    setSuccessMessage(t('success.accountCreated'));
                    setFromSignupSuccess(true);
                    setTimeout(() => {
                        setActiveTab("login");
                        setSuccessMessage("");
                        setConfirmPassword("");
                    }, 2000);
                }
            } else {
                // Use Supabase Client-Side Auth directly
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    throw error;
                }

                if (data.session && data.user) {
                    await login(data.session, data.user);
                    onClose();
                }
            }
        } catch (error) {
            // Handle login/signup errors
            if (error.message === "Invalid login credentials" || error.message?.includes("invalid_credentials")) {
                setPasswordError(t('errors.invalidCredentials'));
            } else if (error.message?.includes("Email not confirmed")) {
                setPasswordError(t('errors.emailNotConfirmed'));
            } else {
                setPasswordError(error.message || t('errors.authFailed'));
            }
        } finally {
            // Only stop loading if we didn't succeed (result is null) OR if we are waiting for a timeout (signup success) which handles its own state
            // Actually, simplest is to just always stop loading here, unless we unmount.
            // But for signup success, we might want to keep loading? No, we show success message.
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setSuccessMessage("");
        setIsLoading(true);

        try {
            if (!email) {
                setPasswordError(t('errors.fillRequired'));
                setIsLoading(false);
                return;
            }

            // Check if email exists first using our RPC to save rate limits
            const { data: emailExists } = await supabase.rpc('check_email_exists', {
                email_input: email
            });

            if (!emailExists) {
                setPasswordError(t('errors.noAccount'));
                setIsLoading(false);
                return;
            }

            // Send password reset email with link
            // Redirect to API route which handles PKCE code exchange on server-side
            // This avoids the code_verifier issue that causes 400 errors
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/api/auth/reset-password`,
            });

            if (error) throw error;

            setResetEmailSent(true);
            setSuccessMessage(t('forgotPassword.linkSent'));

        } catch (err) {
            console.error("Forgot Password Error:", err);
            let msg = err.message || 'An error occurred';
            if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
                msg = t('errors.tooManyRequests');
            }
            setPasswordError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const ValidationItem = ({ isValid, text }) => (
        <div className="flex items-center space-x-2 text-sm">
            {isValid ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <div className="w-4 h-4 border border-gray-300 rounded-full dark:border-gray-600"></div>
            )}
            <span className={isValid ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                {text}
            </span>
        </div>
    );

    return (
        <div className="fixed inset-0 top-16 bottom-16 sm:top-0 sm:bottom-0 z-[55] sm:z-[60] flex items-center justify-center sm:py-6 sm:px-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md p-6 pb-8 sm:p-8 relative z-10 shadow-none sm:shadow-2xl rounded-none sm:rounded-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto scrollbar-hide">
                <button
                    onClick={() => {
                        if (activeTab === 'forgot_password') {
                            setActiveTab('login');
                            setResetEmailSent(false);
                            setSuccessMessage('');
                            setPasswordError('');
                        } else {
                            onClose();
                        }
                    }}
                    className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {activeTab === 'login' ? t('login.title') : activeTab === 'forgot_password' ? t('forgotPassword.title') : t('signup.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {activeTab === 'login' && t('login.subtitle')}
                        {activeTab === 'signup' && t('signup.subtitle')}
                        {activeTab === 'forgot_password' && t('forgotPassword.subtitle')}
                    </p>
                </div>

                {activeTab !== 'forgot_password' && (
                    <div className="flex mb-8 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "login"
                                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            onClick={() => setActiveTab("login")}
                        >
                            {t('common.tabs.login')}
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "signup"
                                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            onClick={() => setActiveTab("signup")}
                        >
                            {t('common.tabs.signup')}
                        </button>
                    </div>
                )}

                {activeTab === 'forgot_password' ? (
                    <div className="space-y-4">
                        {!resetEmailSent ? (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                {/* Email Input */}
                                <div className="text-center mb-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('forgotPassword.description')}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                        {t('login.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('forgotPassword.emailPlaceholder')}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                {passwordError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        t('forgotPassword.buttons.sendLink')
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("login");
                                        setPasswordError("");
                                        setResetEmailSent(false);
                                    }}
                                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {t('common.backToLogin')}
                                </button>
                            </form>
                        ) : (
                            /* Success state - email sent */
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {t('forgotPassword.emailSentTitle')}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('forgotPassword.emailSentDescription', { email })}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("login");
                                        setResetEmailSent(false);
                                        setEmail("");
                                    }}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    {t('common.backToLogin')}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Social Login Buttons - Always show first */}
                        <div className="space-y-3 mb-6">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-white transition-colors h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>{t('buttons.continueWithGoogle') || 'Continue with Google'}</span>
                            </button>

                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-white transition-colors h-12"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                </svg>
                                <span>{t('buttons.continueWithApple') || 'Continue with Apple'}</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">{t('common.or')}</span>
                            </div>
                        </div>

                        {/* Email Login Toggle Button - Only for login tab */}
                        {activeTab === "login" && !showEmailFields && (
                            <button
                                type="button"
                                onClick={() => setShowEmailFields(true)}
                                className="w-full flex items-center justify-center gap-3 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-white transition-colors h-12"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{t('buttons.continueWithEmail') || 'Continue with Email'}</span>
                            </button>
                        )}

                        {/* Email/Password Form - Always visible for signup, animated reveal for login */}
                        <div 
                            className={`email-form-container ${
                                activeTab === "signup" || showEmailFields 
                                    ? 'expanded' 
                                    : ''
                            }`}
                        >
                            <div className="email-form-inner">
                            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                                {activeTab === "signup" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                                {t('signup.firstName')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder={t('signup.placeholderFirstName')}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                                {t('signup.lastName')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder={t('signup.placeholderLastName')}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "signup" && (
                                    <div>
                                        <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                            {t('signup.phone')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="phone-input-container" dir="ltr">
                                            <PhoneInput
                                                country={'ma'}
                                                value={phoneNumber}
                                                onChange={handlePhoneChange}
                                                inputClass="!w-full !py-3 !h-[46px] !bg-gray-50 dark:!bg-slate-800 !border !border-gray-200 dark:!border-slate-700 !rounded-lg !text-gray-900 dark:!text-white placeholder-gray-400 dark:placeholder-gray-500 !text-sm focus:!outline-none focus:!ring-2 focus:!ring-blue-500 focus:!border-transparent"
                                                buttonClass="!bg-gray-50 dark:!bg-slate-800 !border-gray-200 dark:!border-slate-700 !rounded-l-lg hover:!bg-gray-100 dark:hover:!bg-slate-700"
                                                dropdownClass="!bg-white dark:!bg-slate-900 !text-gray-900 dark:!text-white !border-gray-200 dark:!border-slate-700 !shadow-xl"
                                                containerClass="!w-full"
                                                buttonStyle={{ backgroundColor: 'transparent' }}
                                            />
                                        </div>
                                    </div>
                                )}

                        <div>
                            <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                {t('login.email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('forgotPassword.emailPlaceholder')}
                                required
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                {t('signup.password')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError("");
                                    }}
                                    placeholder={t('login.placeholder')}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute ltr:right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {/* Forgot Password Link */}
                            {activeTab === "login" && (
                                <div className="flex justify-end mt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab("forgot_password");
                                            setPasswordError("");
                                            setSuccessMessage("");
                                            setResetEmailSent(false);
                                        }}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                    >
                                        {t('login.forgotPassword')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {activeTab === "signup" && (
                            <>
                                <div className="mb-6">
                                    <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                        {t('signup.confirmPassword')} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                setPasswordError("");
                                            }}
                                            placeholder={t('signup.confirmPasswordPlaceholder')}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute ltr:right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {password && (
                                    <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">Password Requirements:</p>
                                        <div className="space-y-2">
                                            <ValidationItem isValid={validations.minLength} text="At least 8 characters" />
                                            <ValidationItem isValid={validations.hasNumber} text="Contains a number" />
                                            <ValidationItem isValid={validations.hasSymbol} text="Contains a symbol (!@#$%...)" />
                                            <ValidationItem isValid={validations.noWeakPattern} text={t('validations.noWeakPattern')} />
                                            {confirmPassword && (
                                                <ValidationItem isValid={validations.passwordsMatch} text={t('validations.passwordsMatch')} />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                                <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                            </div>
                        )}

                        {passwordError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                            </div>
                        )}

                        {activeTab === "signup" && (
                            <div className="mb-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('signup.terms.text')}
                                        <a href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline">{t('signup.terms.termsOfUse')}</a>
                                        {t('signup.terms.and')}
                                        <a href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline">{t('signup.terms.privacyPolicy')}</a>
                                        <span className="text-red-500"> *</span>
                                    </span>
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                activeTab === "login" ? t('login.button') : t('signup.button')
                            )}
                        </button>
                    </form>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
