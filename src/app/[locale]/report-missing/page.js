"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import dynamic from 'next/dynamic';
import LoginDialog from '@/components/LoginDialog';

// Dynamically import MapPicker to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 sm:h-80 rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
        </div>
    )
});

export default function ReportMissingPage() {
    const { user, isAuthLoading } = useAuth();
    const router = useRouter();
    const t = useTranslations('reportMissing');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const fileInputRef = useRef(null);
    const genderDropdownRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        healthStatus: '',
        healthDetails: '',
        city: '',
        lastKnownLocation: '',
        coordinates: { lat: null, lng: null },
        additionalInfo: ''
    });

    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [agreedToLegal, setAgreedToLegal] = useState(false);
    const [currentWarning, setCurrentWarning] = useState('');

    // Get the first validation error (in order of priority)
    const getFirstValidationError = () => {
        if (photos.length === 0) return t('validation.photo');
        if (!formData.firstName.trim()) return t('validation.firstName');
        if (!formData.lastName.trim()) return t('validation.lastName');
        if (!formData.city.trim()) return t('validation.city');
        if (!formData.lastKnownLocation.trim()) return t('validation.lastKnownLocation');
        if (!agreedToLegal) return t('validation.legalConfirmation');
        return null;
    };

    const genderOptions = [
        { value: 'male', label: t('options.male') },
        { value: 'female', label: t('options.female') }
    ];

    const selectedGender = genderOptions.find(g => g.value === formData.gender);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target)) {
                setIsGenderDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationSelect = (coords) => {
        setFormData(prev => ({
            ...prev,
            coordinates: coords
        }));
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + photos.length > 5) {
            setError(t('errors.maxPhotos'));
            return;
        }

        const newPhotos = [...photos, ...files];
        setPhotos(newPhotos);

        // Create previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPhotoPreviews(prev => [...prev, ...newPreviews]);
    };

    const removePhoto = (index) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        const newPreviews = photoPreviews.filter((_, i) => i !== index);
        
        // Revoke the URL to free memory
        URL.revokeObjectURL(photoPreviews[index]);
        
        setPhotos(newPhotos);
        setPhotoPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage('');

        // Check for validation errors one at a time
        const firstError = getFirstValidationError();
        if (firstError) {
            setCurrentWarning(firstError);
            return;
        }

        // All validations passed, clear warning and proceed
        setCurrentWarning('');
        setLoading(true);

        try {
            // TODO: Implement actual submission logic
            // 1. Upload photos to storage
            // 2. Save report to database
            // 3. Trigger AI matching

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            setMessage(t('success.reportSubmitted'));
            
            // Redirect after success
            setTimeout(() => {
                router.push('/my-report');
            }, 2000);

        } catch (err) {
            console.error('Submit error:', err);
            setError(t('errors.submitFailed'));
        } finally {
            setLoading(false);
        }
    };

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
            <div className="max-w-3xl mx-auto">

                {/* Page Header */}
                <div className="mb-8">
                    <Link 
                        href="/my-report" 
                        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('backToReports')}
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Notifications */}
                {message && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section 1: Photo Upload */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('sections.photos.title')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.photos.description')}</p>
                        </div>
                        <div className="p-6">
                            {/* Photo Previews */}
                            {photoPreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                                    {photoPreviews.map((preview, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img 
                                                src={preview} 
                                                alt={`Preview ${index + 1}`} 
                                                className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1.5 right-1.5 w-7 h-7 text-white hover:text-red-400 rounded-full flex items-center justify-center transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md">
                                                {index + 1}/{photos.length}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload Button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                            {photos.length < 5 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-8 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                                >
                                    <div className="flex flex-col items-center">
                                        <svg className="w-10 h-10 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('sections.photos.uploadButton')}</span>
                                        <span className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('sections.photos.hint')} ({photos.length}/5)</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Personal Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {t('sections.personalInfo.title')}
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* First Name */}
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.firstName')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.firstName')}
                                    />
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.lastName')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.lastName')}
                                    />
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.dateOfBirth')}
                                    </label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                    />
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.gender')}
                                    </label>
                                    <div className="relative" ref={genderDropdownRef}>
                                        {/* Custom Dropdown Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 ${isGenderDropdownOpen ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer`}
                                        >
                                            <span className={`text-sm ${selectedGender ? 'font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {selectedGender ? selectedGender.label : t('options.selectGender')}
                                            </span>
                                            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isGenderDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isGenderDropdownOpen && (
                                            <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                                                {genderOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, gender: option.value }));
                                                            setIsGenderDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center px-4 py-3 text-start text-sm font-medium transition-colors ${
                                                            formData.gender === option.value
                                                                ? 'bg-blue-500 text-white'
                                                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Health Status */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {t('sections.healthStatus.title')}
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Health Status Radio */}
                            <div>
                                <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {t('fields.healthStatus')}
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {['healthy', 'physical', 'mental', 'both'].map((status) => (
                                        <label
                                            key={status}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
                                                formData.healthStatus === status
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="healthStatus"
                                                value={status}
                                                checked={formData.healthStatus === status}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <span className="text-sm font-medium">{t(`options.health.${status}`)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Health Details (conditional) */}
                            {formData.healthStatus && formData.healthStatus !== 'healthy' && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.healthDetails')}
                                    </label>
                                    <textarea
                                        name="healthDetails"
                                        value={formData.healthDetails}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        rows={3}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.healthDetails')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Location Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('sections.location.title')}
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Interactive Map */}
                            <div>
                                <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {t('fields.mapLocation')}
                                </label>
                                <MapPicker 
                                    onLocationSelect={handleLocationSelect}
                                    initialCoordinates={formData.coordinates}
                                    markerColor="blue"
                                />
                                {formData.coordinates.lat && (
                                    <p className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        📍 {t('fields.coordinates')}: {formData.coordinates.lat}, {formData.coordinates.lng}
                                    </p>
                                )}
                                <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('fields.mapHint')}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* City */}
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.city')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.city')}
                                    />
                                </div>

                                {/* Last Known Location */}
                                <div className="sm:col-span-2">
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('fields.lastKnownLocation')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastKnownLocation"
                                        value={formData.lastKnownLocation}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.lastKnownLocation')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Additional Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t('sections.additionalInfo.title')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.additionalInfo.description')}</p>
                        </div>
                        <div className="p-6">
                            <textarea
                                name="additionalInfo"
                                value={formData.additionalInfo}
                                onChange={handleChange}
                                dir={isRTL ? 'rtl' : 'ltr'}
                                rows={5}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                                placeholder={t('placeholders.additionalInfo')}
                            />
                        </div>
                    </div>

                    {/* Legal Confirmation Checkbox */}
                    <div 
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="flex items-start mb-2"
                    >
                        <input
                            type="checkbox"
                            id="legal-confirmation"
                            checked={agreedToLegal}
                            onChange={e => setAgreedToLegal(e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                        />
                        <label htmlFor="legal-confirmation" className={`${isRTL ? 'mr-3' : 'ml-3'} text-sm text-gray-700 dark:text-gray-300 cursor-pointer`}>
                            {t('legalConfirmation')}
                            <span className="text-red-500"> *</span>
                        </label>
                    </div>

                    {/* Validation Warning */}
                    {currentWarning && (
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-lg shadow-sm">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{currentWarning}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {tCommon('buttons.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin"></div>
                                    {t('buttons.submitting')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    {t('buttons.submitReport')}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
