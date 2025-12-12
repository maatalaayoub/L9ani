"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from "@/context/LanguageContext";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

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
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#101828] pt-28 px-4 pb-12">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* 1. Header Card - Avatar & Summary */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden relative border border-gray-200 dark:border-gray-800">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                    <div className="px-6 pb-6 relative">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-4 space-y-4 sm:space-y-0">
                            {/* Avatar */}
                            <div className="relative group mx-auto sm:mx-0">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-md">
                                    {formData.avatar_url ? (
                                        <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-gray-400">
                                            {formData.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Name & Role */}
                            <div className="flex-1 text-center sm:text-start sm:rtl:text-right sm:ltr:text-left sm:ms-6 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formData.first_name} {formData.last_name}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">@{formData.username || t('defaultUsername')}</p>
                            </div>

                            {/* Edit Toggle */}
                            <div className="mb-2">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        {t('buttons.editProfile')}
                                    </button>
                                ) : (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            {tCommon('buttons.cancel')}
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={loading || !hasChanges || isCheckingUsername || usernameAvailable === false}
                                            className={`px-6 py-2 rounded-full font-medium transition-colors shadow-lg flex items-center gap-2 ${loading || !hasChanges || isCheckingUsername || usernameAvailable === false
                                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                                                : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-green-500/30'
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
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-black/50 rounded-xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('chooseAvatar')}</p>
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {PRESET_AVATARS.map((src, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setFormData({ ...formData, avatar_url: src });
                                                setShowAvatarSelector(false);
                                            }}
                                            className="relative flex-shrink-0 group"
                                        >
                                            <img
                                                src={src}
                                                alt={`Avatar ${idx}`}
                                                className={`w-16 h-16 rounded-full object-cover border-2 transition-all ${formData.avatar_url === src ? 'border-blue-500 scale-110' : 'border-transparent group-hover:border-gray-300 dark:group-hover:border-gray-600'}`}
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
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] p-4 bg-green-500 text-white rounded-lg shadow-2xl animate-in slide-in-from-top-5">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] p-4 bg-red-500 text-white rounded-lg shadow-2xl animate-in slide-in-from-top-5">
                        {error}
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
            </div>

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
