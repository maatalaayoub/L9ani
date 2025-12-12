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

    // Forgot Password State
    const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [resetToken, setResetToken] = useState("");

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

                // Check if supabase is initialized
                if (!supabase) {
                    setPasswordError('Service unavailable. Please try again later.');
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
                // Check if supabase is initialized
                if (!supabase) {
                    setPasswordError('Service unavailable. Please try again later.');
                    setIsLoading(false);
                    return;
                }

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

        // Check if supabase is initialized
        if (!supabase) {
            setPasswordError('Service unavailable. Please try again later.');
            setIsLoading(false);
            return;
        }

        try {
            if (forgotPasswordStep === 1) { // Request OTP
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

                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { shouldCreateUser: false }
                });
                if (error) throw error;

                setSuccessMessage(t('success.codeSent'));
                setTimeout(() => {
                    setSuccessMessage("");
                    setForgotPasswordStep(2);
                }, 1500);

            } else if (forgotPasswordStep === 2) { // Verify OTP
                if (!resetToken || resetToken.length < 6) return;

                const { data, error } = await supabase.auth.verifyOtp({
                    email,
                    token: resetToken,
                    type: 'email'
                });

                if (error) throw error;
                if (!data.session) throw new Error(t('errors.authFailed'));

                // If verifying OTP logs us in, we are good to update password
                setForgotPasswordStep(3);

            } else if (forgotPasswordStep === 3) { // Update Password
                if (!password || !confirmPassword) {
                    setPasswordError(t('errors.fillRequired'));
                    setIsLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setPasswordError(t('errors.passwordMismatch'));
                    setIsLoading(false);
                    return;
                }

                const pwdError = validatePassword(password);
                if (pwdError) {
                    setPasswordError(pwdError);
                    setIsLoading(false);
                    return;
                }

                const { error } = await supabase.auth.updateUser({ password: password });
                if (error) throw error;

                setSuccessMessage(t('success.passwordUpdated'));
                setTimeout(() => {
                    setActiveTab("login");
                    setForgotPasswordStep(1);
                    setSuccessMessage("");
                    setPassword("");
                    setConfirmPassword("");
                }, 2000);
            }

        } catch (err) {
            console.error("Forgot Password Error:", err);
            let msg = err.message || 'An error occurred';
            if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
                msg = "Too many attempts. Please wait 60 seconds before trying again.";
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center sm:py-6 sm:px-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md p-6 pb-24 sm:p-8 relative z-10 shadow-none sm:shadow-2xl rounded-none sm:rounded-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto scrollbar-hide">
                <button
                    onClick={() => {
                        if (activeTab === 'forgot_password') {
                            setActiveTab('login');
                            setForgotPasswordStep(1);
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
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        {/* Step 1: Email */}
                        {forgotPasswordStep === 1 && (
                            <div>
                                <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('forgotPassword.emailPlaceholder')}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {/* Step 2: OTP */}
                        {forgotPasswordStep === 2 && (
                            <div>
                                <div className="text-center mb-4">
                                    <p className="text-sm text-gray-500">{t('forgotPassword.codeSent', { email })}</p>
                                </div>
                                <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                    {t('forgotPassword.verificationCode')}
                                </label>
                                <input
                                    type="text"
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    placeholder="123456"
                                    className="w-full text-center text-2xl tracking-widest px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {/* Step 3: New Password */}
                        {forgotPasswordStep === 3 && (
                            <>
                                <div>
                                    <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                        {t('forgotPassword.newPassword')}
                                    </label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 dark:text-white text-sm font-medium mb-2">
                                        {t('forgotPassword.confirmNewPassword')}
                                    </label>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                {password && (
                                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">{t('validations.header')}</p>
                                        <div className="space-y-2">
                                            <ValidationItem isValid={validations.minLength} text={t('validations.minLength')} />
                                            <ValidationItem isValid={validations.hasNumber} text={t('validations.hasNumber')} />
                                            <ValidationItem isValid={validations.hasSymbol} text={t('validations.hasSymbol')} />
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
                                forgotPasswordStep === 1 ? t('forgotPassword.buttons.sendCode') :
                                    forgotPasswordStep === 2 ? t('forgotPassword.buttons.verifyCode') :
                                        t('forgotPassword.buttons.updatePassword')
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("login");
                                setForgotPasswordStep(1);
                                setPasswordError("");
                                setSuccessMessage("");
                            }}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            {t('common.backToLogin')}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                            setForgotPasswordStep(1);
                                            setPasswordError("");
                                            setSuccessMessage("");
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

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors mb-6 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
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

                        {activeTab === "signup" && (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {t('signup.terms.text')}
                                <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">{t('signup.terms.termsOfUse')}</a>
                                {t('signup.terms.and')}
                                <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">{t('signup.terms.privacyPolicy')}</a>.
                                {t('signup.terms.suffix')}
                            </p>
                        )}
                    </form>)}

                {activeTab !== 'forgot_password' && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">{t('common.or')}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-white transition-colors h-12">
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Continue with Google</span>
                            </button>

                            <button className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-white transition-colors h-12">
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                </svg>
                                <span>Continue with Apple</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
