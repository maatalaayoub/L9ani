"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from "@/context/LanguageContext";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import LoginDialog from '@/components/LoginDialog';

export default function ProfilePage() {
    const { user, profile, isAuthLoading, logout } = useAuth();
    const router = useRouter();
    const t = useTranslations('profile');
    const tCommon = useTranslations('common');

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);

    // Email verification state
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [verifiedSuccess, setVerifiedSuccess] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        avatar_url: ''
    });

    // Email Change State
    const [isEmailChangeModalOpen, setIsEmailChangeModalOpen] = useState(false);
    const [emailChangeStep, setEmailChangeStep] = useState(1); // 1: Input New Email, 2: Verify Code
    const [newEmail, setNewEmail] = useState('');
    const [emailChangeCode, setEmailChangeCode] = useState('');
    const [emailChangeError, setEmailChangeError] = useState('');
    const [isChangingEmail, setIsChangingEmail] = useState(false);

    // Password Setup State (for OAuth users)
    const [showPasswordSetup, setShowPasswordSetup] = useState(false);
    const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password Change State (for users with existing password)
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [changePasswordData, setChangePasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [changePasswordError, setChangePasswordError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    // Forgot Password State
    const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [resetEmailError, setResetEmailError] = useState('');

    // Check if user is OAuth-only (no password set)
    const isOAuthUser = user?.app_metadata?.provider === 'google' || 
                        user?.app_metadata?.providers?.includes('google');
    const hasPassword = profile?.has_password === true;

    // Login Dialog State
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');

    // Track last country code to detect switches
    const lastCountryCode = useRef(null);

    const handlePhoneChange = (value, data) => {
        let shouldClear = false;

        // If country changed from what we last saw
        if (lastCountryCode.current && lastCountryCode.current !== data.countryCode) {
            shouldClear = true;
        }
        // If first interaction and the existing phone doesn't start with the new dial code (implies mismatch/switch)
        else if (!lastCountryCode.current && formData.phone && !formData.phone.startsWith(data.dialCode)) {
            shouldClear = true;
        }

        lastCountryCode.current = data.countryCode;

        if (shouldClear) {
            setFormData(prev => ({ ...prev, phone: data.dialCode }));
        } else {
            setFormData(prev => ({ ...prev, phone: value }));
        }
    };

    const PRESET_AVATARS = [
        '/avatars/avatar1.png',
        '/avatars/avatar2.png',
        '/avatars/avatar3.png',
        '/avatars/avatar4.png',
        '/avatars/avatar5.png',
        '/avatars/avatar6.png'
    ];

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/');
        }
    }, [user, isAuthLoading, router]);

    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                phone: profile.phone || '',
                avatar_url: profile.avatar_url || ''
            });
        }
    }, [profile]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCancel = () => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                phone: profile.phone || '',
                avatar_url: profile.avatar_url || ''
            });
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        setError('');

        try {
            // Update the existing profile (don't use upsert, just update)
            const { error } = await supabase
                .from('profiles')
                .update({
                    username: formData.username,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url
                })
                .eq('auth_user_id', user.id);

            if (error) throw error;

            // Update auth user metadata if first_name or last_name changed
            if (formData.first_name !== profile?.first_name || formData.last_name !== profile?.last_name) {
                const { error: authError } = await supabase.auth.updateUser({
                    data: {
                        firstName: formData.first_name,
                        lastName: formData.last_name,
                        phoneNumber: formData.phone
                    }
                });

                if (authError) {
                    console.error('Auth metadata update error:', authError);
                    // Don't throw - profile is updated, auth metadata is secondary
                }
            }

            setMessage(t('success.profileUpdated'));
            setIsEditing(false); // Exit edit mode

            // Wait a bit then reload to refresh context
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Profile update error:', error);
            if (error.message && error.message.includes('foreign key constraint')) {
                setError(t('errors.sessionInvalid'));
            } else {
                setError(t('errors.updateFailed') + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!verificationCode) return;
        setVerifying(true);
        setMessage('');
        setError('');
        setVerifyError('');

        try {
            // Use Supabase RPC for direct client-to-database verification
            // This bypasses local connectivity issues with the API route
            const { data: success, error: rpcError } = await supabase.rpc('verify_email_with_code', {
                code_input: verificationCode
            });

            if (rpcError) throw rpcError;

            if (!success) {
                // False means the code logic ran but returned false (invalid code)
                throw new Error(t('errors.invalidCode'));
            }

            // Success!!
            setVerifiedSuccess(true);
            setVerifyError('');

            // Reload after showing success message for a bit
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err) {
            console.error('Verification error:', err);
            setVerifyError(err.message || t('errors.verificationFailed'));
            setVerifiedSuccess(false);
        } finally {
            setVerifying(false);
        }
    };

    const handleResendCode = async () => {
        setResending(true);
        setVerifyError('');

        try {
            const { data: newCode, error } = await supabase.rpc('resend_verification_code');
            if (error) throw error;

            console.log('[TESTING] New verification code:', newCode);
            setVerifyError('');
            setResendMessage(t('verify.success.codeResent'));
            setTimeout(() => setResendMessage(''), 3000);
        } catch (err) {
            console.error('Resend error:', err);
            setVerifyError(t('errors.resendFailed'));
        } finally {
            setResending(false);
        }
    };

    // --- Email Change Logic ---
    const handleRequestEmailChange = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            setEmailChangeError(t('errors.invalidEmail'));
            return;
        }
        setIsChangingEmail(true);
        setEmailChangeError('');

        // Check if supabase is initialized
        if (!supabase) {
            setEmailChangeError('Service unavailable. Please try again later.');
            setIsChangingEmail(false);
            return;
        }

        try {
            // 1. Pre-check: Verify email is not taken by another user
            const checkResponse = await fetch('/api/email-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });
            let checkData;
            try {
                checkData = await checkResponse.json();
            } catch (e) {
                throw new Error(`Server Error: ${checkResponse.status} ${checkResponse.statusText}`);
            }

            if (!checkResponse.ok) {
                throw new Error(checkData.message || `Server Error: ${checkResponse.status}`);
            }

            if (!checkData.available) {
                throw new Error(checkData.message || t('errors.emailInUse'));
            }

            // 2. Request Change
            const { data: code, error } = await supabase.rpc('request_email_change', { new_email: newEmail });
            if (error) throw error;

            console.log('[TESTING] Security Code for Email Change:', code);
            // Move to step 2
            setEmailChangeStep(2);
        } catch (err) {
            console.error('Email change request error:', err);
            const errorMessage = err.message || t('errors.requestFailed');
            setEmailChangeError(errorMessage);

            // Check for 48h error
            if (errorMessage.includes('48 hours')) {
                setEmailChangeError(
                    <span>
                        {errorMessage} <br />
                        <a href="mailto:support@lqani.ma" className="text-blue-500 underline hover:text-blue-600 mt-2 inline-block">
                            Contact Support
                        </a>
                    </span>
                );
            }
        } finally {
            setIsChangingEmail(false);
        }
    };

    const handleConfirmEmailChange = async () => {
        if (!emailChangeCode || emailChangeCode.length < 6) return;
        setIsChangingEmail(true);
        setEmailChangeError('');
        try {
            // Call our API route which has admin privileges to update auth.users
            const response = await fetch('/api/auth/confirm-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, code: emailChangeCode })
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || t('errors.updateEmailFailed'));

            // Success
            setEmailChangeStep(3); // Success state

            // Reload page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (err) {
            console.error('Confirm change error:', err);
            setEmailChangeError(err.message || t('errors.verifyCodeFailed'));
        } finally {
            setIsChangingEmail(false);
        }
    };

    // Username Check State
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null); // null = unchecked/unchanged, true = available, false = taken
    const [usernameMessage, setUsernameMessage] = useState('');

    // Debounced Username Check
    useEffect(() => {
        const checkUsername = async () => {
            const username = formData.username?.trim();

            // 1. Safety Check
            if (!user) return;

            // 2. Empty Check (Strict)
            if (!username) {
                setIsCheckingUsername(false);
                setUsernameAvailable(false);
                setUsernameMessage(t('username.empty'));
                return;
            }

            // 3. Unchanged Check (Skip if same as current)
            if (profile && username === profile.username) {
                setIsCheckingUsername(false);
                setUsernameAvailable(null);
                setUsernameMessage('');
                return;
            }

            if (username.length < 3) {
                setIsCheckingUsername(false);
                setUsernameAvailable(false);
                setUsernameMessage(t('username.tooShort'));
                return;
            }

            if (username.length > 20) {
                setIsCheckingUsername(false);
                setUsernameAvailable(false);
                setUsernameMessage(t('username.tooLong'));
                return;
            }

            // Validation Rules
            if (/^\d/.test(username)) {
                setIsCheckingUsername(false);
                setUsernameAvailable(false);
                setUsernameMessage(t('username.startNumber'));
                return;
            }

            if (!/^[a-zA-Z0-9._]+$/.test(username)) {
                setIsCheckingUsername(false);
                setUsernameAvailable(false);
                setUsernameMessage(t('username.invalidChars'));
                return;
            }

            setIsCheckingUsername(true);
            setUsernameAvailable(null);
            setUsernameMessage('');

            try {
                // Call server-side API to check availability (Bypasses RLS)
                const response = await fetch('/api/username-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        userId: user?.id
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'API Error');
                }

                setUsernameAvailable(data.available);
                setUsernameMessage(data.available ? t('username.available') : t('username.taken'));

            } catch (err) {
                console.error('Error checking username:', err);
                setUsernameAvailable(null);
                setUsernameMessage(t('username.verifyError'));
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const timer = setTimeout(checkUsername, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [formData.username, profile, user?.id]);

    // Account Deletion State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/delete-account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!response.ok) throw new Error('Failed to delete account');

            // Success: Logout and redirect
            await logout();
            router.push('/');

        } catch (err) {
            console.error('Delete error:', err);
            setError(t('errors.deleteFailed'));
            setShowDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    // Password validation helper
    const validatePassword = (password) => {
        if (password.length < 8) return t('passwordSetup.errors.tooShort');
        if (!/\d/.test(password)) return t('passwordSetup.errors.noNumber');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return t('passwordSetup.errors.noSymbol');
        return null;
    };

    // Handle password setup for OAuth users
    const handleSetPassword = async () => {
        setPasswordError('');
        
        // Validate password
        const validationError = validatePassword(passwordData.password);
        if (validationError) {
            setPasswordError(validationError);
            return;
        }
        
        if (passwordData.password !== passwordData.confirmPassword) {
            setPasswordError(t('passwordSetup.errors.mismatch'));
            return;
        }

        setIsSettingPassword(true);
        
        try {
            const response = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    password: passwordData.password,
                    confirmPassword: passwordData.confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to set password');
            }

            setPasswordSuccess(true);
            setPasswordData({ password: '', confirmPassword: '' });
            
            // Reload after a delay to refresh profile
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err) {
            console.error('Set password error:', err);
            setPasswordError(t('passwordSetup.errors.failed'));
        } finally {
            setIsSettingPassword(false);
        }
    };

    // Handle password change for users with existing password
    const handleChangePassword = async () => {
        setChangePasswordError('');
        
        // Validate new password
        const validationError = validatePassword(changePasswordData.newPassword);
        if (validationError) {
            setChangePasswordError(validationError.replace('passwordSetup', 'passwordChange'));
            return;
        }
        
        if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
            setChangePasswordError(t('passwordChange.errors.mismatch'));
            return;
        }

        if (!changePasswordData.currentPassword) {
            setChangePasswordError(t('passwordChange.errors.incorrectCurrent'));
            return;
        }

        setIsChangingPassword(true);
        
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email,
                    oldPassword: changePasswordData.currentPassword,
                    newPassword: changePasswordData.newPassword,
                    confirmPassword: changePasswordData.confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('incorrectCurrent');
                }
                throw new Error(data.error || 'Failed to change password');
            }

            setChangePasswordSuccess(true);
            setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            
            // Hide success after 3 seconds
            setTimeout(() => {
                setChangePasswordSuccess(false);
                setShowPasswordChange(false);
            }, 3000);

        } catch (err) {
            console.error('Change password error:', err);
            if (err.message === 'incorrectCurrent') {
                setChangePasswordError(t('passwordChange.errors.incorrectCurrent'));
            } else {
                setChangePasswordError(t('passwordChange.errors.failed'));
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Handle forgot password - send reset link to email
    const handleForgotPassword = async () => {
        setResetEmailError('');
        setIsSendingResetEmail(true);
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                throw error;
            }

            setResetEmailSent(true);
            
            // Hide message after 5 seconds
            setTimeout(() => {
                setResetEmailSent(false);
            }, 5000);

        } catch (err) {
            console.error('Forgot password error:', err);
            setResetEmailError(t('passwordChange.forgotPassword.error'));
        } finally {
            setIsSendingResetEmail(false);
        }
    };

    // Check if form data has changed
    const hasChanges = useMemo(() => {
        if (!profile) return false;

        const normalize = (val) => String(val || '').trim();

        return (
            normalize(formData.username) !== normalize(profile.username) ||
            normalize(formData.first_name) !== normalize(profile.first_name) ||
            normalize(formData.last_name) !== normalize(profile.last_name) ||
            normalize(formData.phone) !== normalize(profile.phone) ||
            normalize(formData.avatar_url) !== normalize(profile.avatar_url)
        );
    }, [formData, profile]);

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#101828] pt-24 px-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e] flex items-center justify-center px-4 pt-16">
                    <div className="text-center max-w-md">
                        <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{tCommon('messages.loginRequired')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">{tCommon('messages.pleaseLogin')}</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setLoginDialogTab('login');
                                    setIsLoginDialogOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                {tCommon('buttons.login')}
                            </button>
                            <button
                                onClick={() => {
                                    setLoginDialogTab('signup');
                                    setIsLoginDialogOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                {tCommon('buttons.createAccount')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <LoginDialog 
                    isOpen={isLoginDialogOpen} 
                    onClose={() => setIsLoginDialogOpen(false)}
                    initialTab={loginDialogTab}
                />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#101828] pt-28 px-4 pb-12">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* 1. Header Card - Avatar & Summary */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                            {/* Avatar */}
                            <div className="relative group flex-shrink-0">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
                                    {formData.avatar_url ? (
                                        <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl sm:text-3xl font-semibold text-gray-500 dark:text-gray-400">
                                            {formData.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Name & Username */}
                            <div className="flex-1 text-center sm:text-start sm:rtl:text-right sm:ltr:text-left min-w-0">
                                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
                                    {formData.first_name} {formData.last_name}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5" dir="ltr">@{formData.username || t('defaultUsername')}</p>
                            </div>

                            {/* Edit Toggle */}
                            <div className="flex-shrink-0 mt-2 sm:mt-0">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        {t('buttons.editProfile')}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            {tCommon('buttons.cancel')}
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={loading || !hasChanges || isCheckingUsername || usernameAvailable === false}
                                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${loading || !hasChanges || isCheckingUsername || usernameAvailable === false
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                                                }`}
                                        >
                                            {loading ? t('buttons.saving') : t('buttons.saveChanges')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Avatar Selector Panel */}
                        {isEditing && showAvatarSelector && (
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('chooseAvatar')}</p>
                                <div className="flex gap-3 overflow-x-auto py-2 px-1">
                                    {PRESET_AVATARS.map((src, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setFormData({ ...formData, avatar_url: src });
                                                setShowAvatarSelector(false);
                                            }}
                                            className="relative flex-shrink-0"
                                        >
                                            <img
                                                src={src}
                                                alt={`Avatar ${idx}`}
                                                className={`w-14 h-14 rounded-full object-cover transition-all ${formData.avatar_url === src ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2 dark:ring-offset-gray-900' : 'hover:opacity-80'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Personal Info */}
                    <div className="col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            {t('sections.personalInfo')}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{tCommon('labels.firstName')}</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        dir="auto"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-start"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white font-medium text-start" dir="auto">{formData.first_name || t('notSet')}</p>
                                )}
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{tCommon('labels.lastName')}</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        dir="auto"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-start"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white font-medium text-start" dir="auto">{formData.last_name || t('notSet')}</p>
                                )}
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{tCommon('labels.username')}</label>
                                {isEditing ? (
                                    <>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={(e) => {
                                                    // Force lowercase and remove spaces for usernames
                                                    const val = e.target.value.toLowerCase().replace(/\s/g, '');
                                                    handleChange({ target: { name: 'username', value: val } });
                                                }}
                                                dir="auto"
                                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-start ltr:pr-10 rtl:pl-10 ${usernameAvailable === false
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                                    : usernameAvailable === true
                                                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-transparent'
                                                    }`}
                                            />

                                            {/* Status Indicators */}
                                            <div className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 flex items-center">
                                                {isCheckingUsername && (
                                                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                )}
                                                {!isCheckingUsername && usernameAvailable === true && (
                                                    <svg className="w-5 h-5 text-green-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                )}
                                                {!isCheckingUsername && usernameAvailable === false && (
                                                    <svg className="w-5 h-5 text-red-500 animate-in zoom-in duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Feedback Message */}
                                        {usernameMessage && !isCheckingUsername && (
                                            <p className={`text-xs mt-1 font-medium text-start ${usernameAvailable === true ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`} dir="auto">
                                                {usernameMessage}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-900 dark:text-white font-medium text-start" dir="auto">@{formData.username || t('notSet')}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{tCommon('labels.phone')}</label>
                                {isEditing ? (
                                    <div className="phone-input-container" dir="ltr">
                                        <PhoneInput
                                            country={'us'}
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            inputClass="!w-full !py-2 !h-[42px] !bg-gray-50 dark:!bg-gray-800 !border !border-gray-200 dark:!border-gray-700 !rounded-lg !text-gray-900 dark:!text-white focus:!ring-2 focus:!ring-indigo-500 focus:!border-transparent !text-base transition-all ltr:!text-left rtl:!text-left"
                                            buttonClass="!bg-gray-50 dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !rounded-l-lg rtl:!rounded-l-none rtl:!rounded-r-lg hover:!bg-gray-100 dark:hover:!bg-gray-700"
                                            dropdownClass="!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !border-gray-200 dark:!border-gray-700 !shadow-xl"
                                            containerClass="!w-full block"
                                            buttonStyle={{ backgroundColor: 'transparent', direction: 'ltr' }}
                                        />
                                    </div>
                                ) : (
                                    <p className="text-gray-900 dark:text-gray-400 font-medium text-start" dir="ltr">
                                        {formData.phone ? `+${formData.phone}` : t('notSet')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Account & Actions */}
                    <div className="space-y-6">
                        {/* Account Details */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                {t('sections.accountStatus')}
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 gap-4">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm shrink-0">{t('labels.userId')}</span>
                                    <span className="text-gray-900 dark:text-white font-medium text-sm text-right truncate select-all" title={profile?.user_id}>
                                        {profile?.user_id || t('notSet')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 gap-4">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm shrink-0">{tCommon('labels.email')}</span>
                                    <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                                        <span className="text-gray-900 dark:text-white font-medium text-sm truncate" title={user.email}>{user.email}</span>
                                        {/* Edit Email Button */}
                                        {!profile?.email_verified && (
                                            <button
                                                onClick={() => setIsVerifyModalOpen(true)}
                                                className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors shrink-0"
                                            >
                                                {t('verify.button')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsEmailChangeModalOpen(true);
                                                setEmailChangeStep(1);
                                                setNewEmail('');
                                                setEmailChangeCode('');
                                                setEmailChangeError('');
                                            }}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-blue-500 transition-colors"
                                            title="Change Email"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                        {profile?.email_verified && (
                                            <span className="text-green-500 shrink-0" title="Verified">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{t('labels.memberSince')}</span>
                                    <span className="text-gray-900 dark:text-white font-medium text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{t('labels.plan')}</span>
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-bold">{t('labels.freeTier')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="w-full py-4 mt-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500/10 dark:text-red-500 dark:border dark:border-red-500/20 dark:hover:bg-red-500 dark:hover:text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 dark:shadow-none dark:hover:shadow-red-900/40 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 group"
                        >
                            <svg className="w-5 h-5 opacity-90 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            <span>{tCommon('buttons.logout')}</span>
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-in slide-in-from-top-5">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{message}</span>
                    </div>
                )}
                {error && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-lg shadow-lg animate-in slide-in-from-top-5">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{error}</span>
                    </div>
                )}
                {/* Verification Modal */}
                {isVerifyModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1A202C] rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">

                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl"></div>

                            {verifiedSuccess ? (
                                <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in duration-300">
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t('verify.success.title')}</h3>
                                    <p className="text-center text-gray-500 dark:text-gray-400">{t('verify.success.description')}</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsVerifyModalOpen(false)}
                                        className="absolute -top-4 -right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>

                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg shadow-blue-500/20">
                                            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('verify.title')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {t('verify.description')}<br />
                                            <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={verificationCode}
                                                onChange={(e) => {
                                                    setVerificationCode(e.target.value.replace(/[^0-9]/g, ''));
                                                    if (verifyError) setVerifyError('');
                                                }}
                                                placeholder="000 000"
                                                className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-300 dark:placeholder-gray-700"
                                            />
                                        </div>

                                        {verifyError && (
                                            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-200 dark:border-red-900/20 animate-in shake">
                                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                {verifyError}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleVerifyEmail}
                                            disabled={verifying || verificationCode.length < 6}
                                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                        >
                                            {verifying ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    {t('verify.verifying')}
                                                </>
                                            ) : t('verify.verifyCode')}
                                        </button>

                                        <div className="text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('verify.didNotReceive')}{' '}
                                                <button
                                                    onClick={handleResendCode}
                                                    disabled={resending}
                                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                                                >
                                                    {resending ? t('verify.sending') : t('verify.clickToResend')}
                                                </button>
                                            </p>
                                            {resendMessage && (
                                                <p className="text-xs text-green-500 dark:text-green-400 mt-1 font-medium animate-in fade-in slide-in-from-bottom-1">
                                                    {resendMessage}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Email Change Modal */}
                {isEmailChangeModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1A202C] rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                            <button
                                onClick={() => setIsEmailChangeModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            {emailChangeStep === 1 && (
                                <>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('emailChange.title')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('emailChange.step1.description')}</p>

                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder={t('emailChange.step1.placeholder')}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                                    />

                                    {emailChangeError && (
                                        <p className="text-sm text-red-500 mb-4">{emailChangeError}</p>
                                    )}

                                    <button
                                        onClick={handleRequestEmailChange}
                                        disabled={isChangingEmail}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center"
                                    >
                                        {isChangingEmail ? t('emailChange.step1.sending') : t('emailChange.step1.button')}
                                    </button>
                                </>
                            )}

                            {emailChangeStep === 2 && (
                                <>
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('emailChange.step2.title')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('emailChange.step2.description')} <span className="font-semibold text-gray-900 dark:text-white">{t('emailChange.step2.currentEmail')}</span> ({user.email}) {t('emailChange.step2.authorize')}
                                        </p>
                                    </div>

                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={emailChangeCode}
                                        onChange={(e) => setEmailChangeCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="000 000"
                                        className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />

                                    {emailChangeError && (
                                        <p className="text-sm text-red-500 mb-4 text-center">{emailChangeError}</p>
                                    )}

                                    <button
                                        onClick={handleConfirmEmailChange}
                                        disabled={isChangingEmail || emailChangeCode.length < 6}
                                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center"
                                    >
                                        {isChangingEmail ? t('emailChange.step2.verifying') : t('emailChange.step2.button')}
                                    </button>
                                </>
                            )}

                            {emailChangeStep === 3 && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('emailChange.step3.title')}</h3>
                                    <p className="text-gray-500 dark:text-gray-400">{t('emailChange.step3.description')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            {/* Password Setup Section (for OAuth users without password) */}
            {isOAuthUser && !hasPassword && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-amber-200 dark:border-amber-900/30 mt-8">
                    <h2 className="text-lg font-bold text-amber-600 dark:text-amber-500 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t('sections.security')}
                    </h2>
                    
                    {/* Banner */}
                    {!showPasswordSetup && !passwordSuccess && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{t('passwordSetup.title')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('passwordSetup.description')}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPasswordSetup(true)}
                                className="w-full sm:w-auto px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-900/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 font-medium transition-colors whitespace-nowrap"
                            >
                                {t('passwordSetup.button')}
                            </button>
                        </div>
                    )}

                    {/* Password Setup Form */}
                    {showPasswordSetup && !passwordSuccess && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('passwordSetup.description')}</p>

                            {/* New Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {t('passwordSetup.newPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.password}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12"
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

                            {/* Confirm Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {t('passwordSetup.confirmPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12 ${
                                            passwordData.confirmPassword && passwordData.password !== passwordData.confirmPassword
                                                ? 'border-red-500'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
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
                                {passwordData.confirmPassword && passwordData.password !== passwordData.confirmPassword && (
                                    <p className="text-sm text-red-500 mt-1">{t('passwordSetup.errors.mismatch')}</p>
                                )}
                            </div>

                            {/* Password Requirements */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('passwordSetup.requirements.title')}</p>
                                <ul className="space-y-1 text-gray-500 dark:text-gray-400">
                                    <li className={`flex items-center gap-2 ${passwordData.password.length >= 8 ? 'text-green-600 dark:text-green-500' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {passwordData.password.length >= 8 
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                            }
                                        </svg>
                                        {t('passwordSetup.requirements.minLength')}
                                    </li>
                                    <li className={`flex items-center gap-2 ${/\d/.test(passwordData.password) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {/\d/.test(passwordData.password)
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                            }
                                        </svg>
                                        {t('passwordSetup.requirements.number')}
                                    </li>
                                    <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.password) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.password)
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                            }
                                        </svg>
                                        {t('passwordSetup.requirements.symbol')}
                                    </li>
                                </ul>
                            </div>

                            {/* Error Message */}
                            {passwordError && (
                                <p className="text-sm text-red-500">{passwordError}</p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowPasswordSetup(false);
                                        setPasswordData({ password: '', confirmPassword: '' });
                                        setPasswordError('');
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    {tCommon('buttons.cancel')}
                                </button>
                                <button
                                    onClick={handleSetPassword}
                                    disabled={isSettingPassword || !passwordData.password || !passwordData.confirmPassword}
                                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSettingPassword ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {t('passwordSetup.setting')}
                                        </>
                                    ) : (
                                        t('passwordSetup.button')
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {passwordSuccess && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-green-600 dark:text-green-500 font-medium">{t('passwordSetup.success')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Password Change Section (for users with existing password) */}
            {hasPassword && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-blue-200 dark:border-blue-900/30 mt-8">
                    <h2 className="text-lg font-bold text-blue-600 dark:text-blue-500 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        {t('sections.security')}
                    </h2>
                    
                    {/* Banner */}
                    {!showPasswordChange && !changePasswordSuccess && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{t('passwordChange.title')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('passwordChange.description')}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPasswordChange(true)}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-500 border border-blue-200 dark:border-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 font-medium transition-colors whitespace-nowrap"
                            >
                                {t('passwordChange.button')}
                            </button>
                        </div>
                    )}

                    {/* Password Change Form */}
                    {showPasswordChange && !changePasswordSuccess && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('passwordChange.description')}</p>
                            
                            {/* Current Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {t('passwordChange.currentPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={changePasswordData.currentPassword}
                                        onChange={(e) => setChangePasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showCurrentPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        )}
                                    </button>
                                </div>
                                {/* Forgot Password Link */}
                                <div className="mt-2 flex flex-col items-end">
                                    {!resetEmailSent ? (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            disabled={isSendingResetEmail}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline disabled:opacity-50"
                                        >
                                            {isSendingResetEmail ? t('passwordChange.forgotPassword.sending') : t('passwordChange.forgotPassword.link')}
                                        </button>
                                    ) : (
                                        <p className="text-sm text-green-600 dark:text-green-500">
                                            {t('passwordChange.forgotPassword.sent')}
                                        </p>
                                    )}
                                    {resetEmailError && (
                                        <p className="text-sm text-red-500 mt-1">{resetEmailError}</p>
                                    )}
                                </div>
                            </div>

                            {/* New Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {t('passwordChange.newPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={changePasswordData.newPassword}
                                        onChange={(e) => setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showNewPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {t('passwordChange.confirmPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmNewPassword ? "text" : "password"}
                                        value={changePasswordData.confirmPassword}
                                        onChange={(e) => setChangePasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ltr:pr-12 rtl:pl-12 ${
                                            changePasswordData.confirmPassword && changePasswordData.newPassword !== changePasswordData.confirmPassword
                                                ? 'border-red-500'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                        className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showConfirmNewPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        )}
                                    </button>
                                </div>
                                {changePasswordData.confirmPassword && changePasswordData.newPassword !== changePasswordData.confirmPassword && (
                                    <p className="text-sm text-red-500 mt-1">{t('passwordChange.errors.mismatch')}</p>
                                )}
                            </div>

                            {/* Password Requirements */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm">
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('passwordChange.requirements.title')}</p>
                                <ul className="space-y-1 text-gray-500 dark:text-gray-400">
                                    <li className={`flex items-center gap-2 ${changePasswordData.newPassword.length >= 8 ? 'text-green-600 dark:text-green-500' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {changePasswordData.newPassword.length >= 8 
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                            }
                                        </svg>
                                        {t('passwordChange.requirements.minLength')}
                                    </li>
                                    <li className={`flex items-center gap-2 ${/\d/.test(changePasswordData.newPassword) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {/\d/.test(changePasswordData.newPassword)
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                            }
                                        </svg>
                                        {t('passwordChange.requirements.number')}
                                    </li>
                                    <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(changePasswordData.newPassword) ? 'text-green-600 dark:text-green-500' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {/[!@#$%^&*(),.?":{}|<>]/.test(changePasswordData.newPassword)
                                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                            }
                                        </svg>
                                        {t('passwordChange.requirements.symbol')}
                                    </li>
                                </ul>
                            </div>

                            {/* Error Message */}
                            {changePasswordError && (
                                <p className="text-sm text-red-500">{changePasswordError}</p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowPasswordChange(false);
                                        setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                        setChangePasswordError('');
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    {tCommon('buttons.cancel')}
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPassword || !changePasswordData.currentPassword || !changePasswordData.newPassword || !changePasswordData.confirmPassword}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isChangingPassword ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {t('passwordChange.changing')}
                                        </>
                                    ) : (
                                        t('passwordChange.button')
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {changePasswordSuccess && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-green-600 dark:text-green-500 font-medium">{t('passwordChange.success')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* 3. Danger Zone */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-red-200 dark:border-red-900/30 mt-8">
                <h2 className="text-lg font-bold text-red-600 dark:text-red-500 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    {t('dangerZone.title')}
                </h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{t('dangerZone.deleteAccount')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('dangerZone.description')}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 font-medium transition-colors whitespace-nowrap"
                    >
                        {t('dangerZone.deleteAccount')}
                    </button>
                </div>
            </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dangerZone.confirmModal.title')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {t('dangerZone.confirmModal.description')} <span className="font-bold text-red-500">{t('dangerZone.confirmModal.irreversible')}</span> {t('dangerZone.confirmModal.suffix')}
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                {tCommon('buttons.cancel')}
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg hover:shadow-red-500/30 transition-all flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t('dangerZone.buttons.deleting')}
                                    </>
                                ) : (
                                    t('dangerZone.buttons.confirm')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
