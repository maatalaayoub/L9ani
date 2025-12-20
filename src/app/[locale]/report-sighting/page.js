"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import Image from 'next/image';
import dynamic from 'next/dynamic';
import LoginDialog from '@/components/LoginDialog';
import SelectDropdown from '@/components/SelectDropdown';
import { getCitiesForDropdown } from '@/data/moroccanCities';

// Dynamically import MapPicker to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 sm:h-80 rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
        </div>
    )
});

export default function ReportSightingPage() {
    const { user, isAuthLoading, getAccessToken, profile } = useAuth();
    const router = useRouter();
    const t = useTranslations('reportSighting');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const fileInputRef = useRef(null);
    const xhrRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');
    
    // Upload progress state
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const [reportType, setReportType] = useState('');

    const [formData, setFormData] = useState({
        // Person fields
        firstName: '',
        lastName: '',
        // Pet fields
        petType: '',
        petBreed: '',
        petColor: '',
        petSize: '',
        petCollar: '',
        // Document fields
        documentType: '',
        documentNumber: '',
        ownerName: '',
        // Electronics fields
        deviceType: '',
        deviceBrand: '',
        deviceModel: '',
        deviceColor: '',
        // Vehicle fields
        vehicleType: '',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleColor: '',
        licensePlate: '',
        // Other item fields
        itemName: '',
        itemDescription: '',
        // Common fields
        city: '',
        locationDescription: '',
        coordinates: { lat: null, lng: null },
        additionalInfo: '',
        // Reporter fields
        reporterFirstName: '',
        reporterLastName: '',
        phone: '',
        email: ''
    });

    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [agreedToLegal, setAgreedToLegal] = useState(false);
    const [currentWarning, setCurrentWarning] = useState('');

    // Auto-fill reporter info from user profile
    useEffect(() => {
        if (profile || user) {
            setFormData(prev => ({
                ...prev,
                reporterFirstName: profile?.first_name || '',
                reporterLastName: profile?.last_name || '',
                phone: profile?.phone || '',
                email: user?.email || profile?.email || ''
            }));
        }
    }, [profile, user]);

    // Get the first validation error (in order of priority)
    const getFirstValidationError = () => {
        if (!reportType) return t('validation.reportType');
        
        // Photos are required
        if (photos.length === 0) return t('validation.photo');
        
        // Type-specific validation
        switch (reportType) {
            case 'pet':
                if (!formData.petType) return t('validation.petType');
                break;
            case 'document':
                if (!formData.documentType) return t('validation.documentType');
                break;
            case 'electronics':
                if (!formData.deviceType) return t('validation.deviceType');
                if (!formData.deviceBrand) return t('validation.deviceBrand');
                break;
            case 'vehicle':
                if (!formData.vehicleType) return t('validation.vehicleType');
                if (!formData.vehicleBrand) return t('validation.vehicleBrand');
                break;
            case 'other':
                if (!formData.itemName.trim()) return t('validation.itemName');
                break;
        }

        if (!formData.phone.trim()) return t('validation.phone');
        if (!formData.city.trim()) return t('validation.city');
        if (!formData.locationDescription.trim()) return t('validation.locationDescription');
        if (!agreedToLegal) return t('validation.legalConfirmation');
        return null;
    };

    const handleLocationSelect = (locationData) => {
        setFormData(prev => ({
            ...prev,
            coordinates: { lat: locationData.lat, lng: locationData.lng },
            // Auto-fill location description with detailed address (city selection is manual)
            locationDescription: locationData.address || prev.locationDescription
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
        setError('');

        // Check for validation errors one at a time
        const firstError = getFirstValidationError();
        if (firstError) {
            setCurrentWarning(firstError);
            return;
        }

        // All validations passed, clear warning and proceed
        setCurrentWarning('');
        setError('');
        setMessage('');
        setLoading(true);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Get auth token using the auth context's getAccessToken (handles refresh)
            const token = await getAccessToken();
            console.log('[Sighting Submit] Token exists:', !!token, 'Length:', token?.length);
            if (!token) {
                setError(t('errors.notLoggedIn') || 'You must be logged in to submit a report');
                setLoading(false);
                setIsUploading(false);
                return;
            }

            // Build FormData for the API
            const submitFormData = new FormData();
            
            // Add report type
            submitFormData.append('reportType', reportType);
            
            // Add common fields
            submitFormData.append('city', formData.city);
            submitFormData.append('locationDescription', formData.locationDescription);
            submitFormData.append('coordinates', JSON.stringify(formData.coordinates));
            if (formData.additionalInfo) {
                submitFormData.append('additionalInfo', formData.additionalInfo);
            }
            
            // Add reporter info
            submitFormData.append('reporterFirstName', formData.reporterFirstName);
            submitFormData.append('reporterLastName', formData.reporterLastName);
            submitFormData.append('phone', formData.phone);
            submitFormData.append('email', formData.email);
            
            // Add type-specific fields
            switch (reportType) {
                case 'person':
                    submitFormData.append('firstName', formData.firstName);
                    submitFormData.append('lastName', formData.lastName);
                    break;
                case 'pet':
                    submitFormData.append('petType', formData.petType);
                    submitFormData.append('petBreed', formData.petBreed);
                    submitFormData.append('petColor', formData.petColor);
                    submitFormData.append('petSize', formData.petSize);
                    submitFormData.append('hasCollar', formData.petCollar === 'yes' ? 'true' : 'false');
                    break;
                case 'document':
                    submitFormData.append('documentType', formData.documentType);
                    submitFormData.append('documentNumber', formData.documentNumber);
                    submitFormData.append('ownerName', formData.ownerName);
                    break;
                case 'electronics':
                    submitFormData.append('deviceType', formData.deviceType);
                    submitFormData.append('deviceBrand', formData.deviceBrand);
                    submitFormData.append('deviceModel', formData.deviceModel);
                    submitFormData.append('deviceColor', formData.deviceColor);
                    break;
                case 'vehicle':
                    submitFormData.append('vehicleType', formData.vehicleType);
                    submitFormData.append('vehicleBrand', formData.vehicleBrand);
                    submitFormData.append('vehicleModel', formData.vehicleModel);
                    submitFormData.append('vehicleColor', formData.vehicleColor);
                    submitFormData.append('licensePlate', formData.licensePlate);
                    break;
                case 'other':
                    submitFormData.append('itemName', formData.itemName);
                    submitFormData.append('itemDescription', formData.itemDescription);
                    break;
            }
            
            // Add photos
            photos.forEach(photo => {
                submitFormData.append('photos', photo);
            });

            // Submit to API using XMLHttpRequest for progress tracking
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhrRef.current = xhr;
                let processingInterval = null;
                
                // Track upload progress (0-50% for actual upload)
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        // Upload phase: 0-50%
                        const percentComplete = Math.round((event.loaded / event.total) * 50);
                        setUploadProgress(percentComplete);
                    }
                });
                
                // When upload to server completes, simulate processing progress (50-95%)
                xhr.upload.addEventListener('loadend', () => {
                    let currentProgress = 50;
                    setUploadProgress(50);
                    processingInterval = setInterval(() => {
                        if (currentProgress < 95) {
                            currentProgress += 2;
                            setUploadProgress(currentProgress);
                        }
                    }, 150);
                });
                
                xhr.addEventListener('load', () => {
                    xhrRef.current = null;
                    if (processingInterval) clearInterval(processingInterval);
                    
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('[Sighting Submit] Response status:', xhr.status, 'Response:', response);
                        if (xhr.status >= 200 && xhr.status < 300) {
                            setUploadProgress(100);
                            resolve(response);
                        } else {
                            // Log the specific error for debugging
                            console.error('[Sighting Submit] Error response:', xhr.status, response);
                            reject(new Error(response.error || 'Failed to submit report'));
                        }
                    } catch (e) {
                        console.error('[Sighting Submit] Parse error:', e, 'Response text:', xhr.responseText);
                        reject(new Error('Failed to parse response'));
                    }
                });
                
                xhr.addEventListener('error', () => {
                    xhrRef.current = null;
                    if (processingInterval) clearInterval(processingInterval);
                    reject(new Error('Network error occurred'));
                });
                
                xhr.addEventListener('abort', () => {
                    xhrRef.current = null;
                    if (processingInterval) clearInterval(processingInterval);
                    reject(new Error('Upload cancelled'));
                });
                
                xhr.open('POST', '/api/reports/sighting');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.send(submitFormData);
            });

            // Upload complete - hide progress bar and show success message
            setIsUploading(false);
            setUploadProgress(0);
            setLoading(false);
            setMessage(t('success.reportSubmitted'));
            
            // Wait 3 seconds to show success message, then redirect
            setTimeout(() => {
                window.location.href = `/${locale}/my-report`;
            }, 3000);

        } catch (err) {
            console.error('Submit error:', err);
            setError(err.message === 'Upload cancelled' ? '' : (err.message || t('errors.submitFailed')));
            setIsUploading(false);
            setUploadProgress(0);
            setLoading(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#101828] pt-24 px-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e] flex items-center justify-center px-4 pt-16">
                    <div className="text-center max-w-md">
                        <svg className="w-16 h-16 mx-auto text-orange-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
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
                        href="/" 
                        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
                    >
                        <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('backToHome')}
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Hero Message */}
                <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {t('heroTitle')}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('heroDescription')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Type Selection */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('types.selectType')}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {/* Person */}
                        <button
                            type="button"
                            onClick={() => setReportType('person')}
                            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                reportType === 'person'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                reportType === 'person' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <svg className={`w-7 h-7 ${reportType === 'person' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${reportType === 'person' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t('types.person.title')}
                            </span>
                        </button>

                        {/* Pet */}
                        <button
                            type="button"
                            onClick={() => setReportType('pet')}
                            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                reportType === 'pet'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                reportType === 'pet' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <svg className={`w-7 h-7 ${reportType === 'pet' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} fill="currentColor" viewBox="0 0 512 512">
                                    <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z"/>
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${reportType === 'pet' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t('types.pet.title')}
                            </span>
                        </button>

                        {/* Documents */}
                        <button
                            type="button"
                            onClick={() => setReportType('document')}
                            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                reportType === 'document'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                reportType === 'document' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <svg className={`w-7 h-7 ${reportType === 'document' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${reportType === 'document' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t('types.documents.title')}
                            </span>
                        </button>

                        {/* Electronics */}
                        <button
                            type="button"
                            onClick={() => setReportType('electronics')}
                            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                reportType === 'electronics'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                reportType === 'electronics' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <svg className={`w-7 h-7 ${reportType === 'electronics' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${reportType === 'electronics' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t('types.electronics.title')}
                            </span>
                        </button>

                        {/* Vehicle */}
                        <button
                            type="button"
                            onClick={() => setReportType('vehicle')}
                            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                reportType === 'vehicle'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                reportType === 'vehicle' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <svg className={`w-7 h-7 ${reportType === 'vehicle' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${reportType === 'vehicle' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t('types.vehicle.title')}
                            </span>
                        </button>

                        {/* Other */}
                        <button
                            type="button"
                            onClick={() => setReportType('other')}
                            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                reportType === 'other'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                reportType === 'other' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                                <svg className={`w-7 h-7 ${reportType === 'other' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                            <span className={`text-sm font-medium ${reportType === 'other' ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {t('types.other.title')}
                            </span>
                        </button>
                    </div>
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

                    {/* Only show form if type is selected */}
                    {reportType && (
                    <>
                    {/* Section 1: Photo Upload */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('sections.photos.title')} <span className="text-red-500">*</span>
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.photos.description')}</p>
                        </div>
                        <div className="p-6">
                            {/* Photo Previews */}
                            {photoPreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                                    {photoPreviews.map((preview, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <Image 
                                                src={preview} 
                                                alt={`Preview ${index + 1}`} 
                                                fill
                                                className="object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                unoptimized
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
                                    className="w-full py-8 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all"
                                >
                                    <div className="flex flex-col items-center">
                                        <svg className="w-10 h-10 text-orange-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('sections.photos.uploadButton')}</span>
                                        <span className="text-xs text-gray-400 mt-1">{t('sections.photos.hint')} ({photos.length}/5)</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Location Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('sections.location.title')} <span className="text-red-500">*</span>
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.location.description')}</p>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Interactive Map */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {t('fields.mapLocation')}
                                </label>
                                <MapPicker 
                                    onLocationSelect={handleLocationSelect}
                                    initialCoordinates={formData.coordinates}
                                    myLocationLabel={t('fields.myLocation')}
                                />
                                {formData.coordinates.lat && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        📍 {t('fields.coordinates')}: {formData.coordinates.lat}, {formData.coordinates.lng}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">{t('fields.mapHint')}</p>
                                <p className="text-xs text-orange-500 dark:text-orange-400 mt-1 sm:hidden flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                                    </svg>
                                    {t('fields.mapMobileHint')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* City */}
                                <div className="relative z-50">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {t('fields.city')} <span className="text-red-500">*</span>
                                    </label>
                                    <SelectDropdown
                                        value={formData.city}
                                        onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                                        options={getCitiesForDropdown(locale)}
                                        placeholder={t('placeholders.selectCity')}
                                        searchPlaceholder={t('placeholders.searchCity')}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.addNewCity')}
                                    />
                                </div>

                                {/* Location Description */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {t('fields.locationDescription')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="locationDescription"
                                        value={formData.locationDescription}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.locationDescription')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Type-Specific Details */}
                    {reportType === 'person' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-orange-200 dark:border-orange-900/50 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {t('sections.personDetails.title')}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {t('veryImportant')}
                                </span>
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">{t('sections.personDetails.description')}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t('sections.personDetails.importanceNote')}
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* First Name */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        {t('fields.firstName')} <span className="text-orange-500">★</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.firstName')}
                                    />
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        {t('fields.lastName')} <span className="text-orange-500">★</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.lastName')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Pet Details */}
                    {reportType === 'pet' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 19c-4 0-7-2-7-5 0-2 2-4 4-4 1.5 0 2.5 1 3 2 .5-1 1.5-2 3-2 2 0 4 2 4 4 0 3-3 5-7 5z" />
                                    </svg>
                                    {t('sections.petDetails.title')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.petDetails.description')}</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Pet Type */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.petType')} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="petType"
                                            value={formData.petType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">{t('placeholders.petType')}</option>
                                            <option value="dog">{t('options.petTypes.dog')}</option>
                                            <option value="cat">{t('options.petTypes.cat')}</option>
                                            <option value="bird">{t('options.petTypes.bird')}</option>
                                            <option value="other">{t('options.petTypes.other')}</option>
                                        </select>
                                    </div>

                                    {/* Breed */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.petBreed')}
                                        </label>
                                        <input
                                            type="text"
                                            name="petBreed"
                                            value={formData.petBreed}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                            placeholder={t('placeholders.petBreed')}
                                        />
                                    </div>

                                    {/* Color */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.petColor')}
                                        </label>
                                        <input
                                            type="text"
                                            name="petColor"
                                            value={formData.petColor}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                            placeholder={t('placeholders.petColor')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Document Details */}
                    {reportType === 'document' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {t('sections.documentDetails.title')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.documentDetails.description')}</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Document Type */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.documentType')} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="documentType"
                                            value={formData.documentType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">{t('placeholders.documentType')}</option>
                                            <option value="nationalId">{t('options.documentTypes.nationalId')}</option>
                                            <option value="passport">{t('options.documentTypes.passport')}</option>
                                            <option value="driverLicense">{t('options.documentTypes.driverLicense')}</option>
                                            <option value="other">{t('options.documentTypes.other')}</option>
                                        </select>
                                    </div>

                                    {/* Owner Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.ownerName')}
                                        </label>
                                        <input
                                            type="text"
                                            name="ownerName"
                                            value={formData.ownerName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                            placeholder={t('placeholders.ownerName')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Electronics Details */}
                    {reportType === 'electronics' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    {t('sections.electronicsDetails.title')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.electronicsDetails.description')}</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Device Type */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.deviceType')} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="deviceType"
                                            value={formData.deviceType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">{t('placeholders.deviceType')}</option>
                                            <option value="phone">{t('options.deviceTypes.phone')}</option>
                                            <option value="laptop">{t('options.deviceTypes.laptop')}</option>
                                            <option value="tablet">{t('options.deviceTypes.tablet')}</option>
                                            <option value="other">{t('options.deviceTypes.other')}</option>
                                        </select>
                                    </div>

                                    {/* Brand */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.deviceBrand')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="deviceBrand"
                                            value={formData.deviceBrand}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                            placeholder={t('placeholders.deviceBrand')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vehicle Details */}
                    {reportType === 'vehicle' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    </svg>
                                    {t('sections.vehicleDetails.title')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.vehicleDetails.description')}</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Vehicle Type */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.vehicleType')} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="vehicleType"
                                            value={formData.vehicleType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">{t('placeholders.vehicleType')}</option>
                                            <option value="car">{t('options.vehicleTypes.car')}</option>
                                            <option value="motorcycle">{t('options.vehicleTypes.motorcycle')}</option>
                                            <option value="bicycle">{t('options.vehicleTypes.bicycle')}</option>
                                            <option value="other">{t('options.vehicleTypes.other')}</option>
                                        </select>
                                    </div>

                                    {/* Brand */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.vehicleBrand')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="vehicleBrand"
                                            value={formData.vehicleBrand}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                            placeholder={t('placeholders.vehicleBrand')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Item Details */}
                    {reportType === 'other' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                    {t('sections.otherDetails.title')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.otherDetails.description')}</p>
                            </div>
                            <div className="p-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {t('fields.itemName')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="itemName"
                                        value={formData.itemName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                        placeholder={t('placeholders.itemName')}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 4: Additional Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                                placeholder={t('placeholders.additionalInfo')}
                            />
                        </div>
                    </div>

                    {/* Section 5: Your Contact Information (All in one block) */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {t('sections.contact.title')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('sections.contact.description')}</p>
                        </div>
                        <div className="p-6">
                            {/* All contact fields in one cohesive block */}
                            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-5">
                                {/* Header */}
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('sections.contact.yourDetails')}</span>
                                </div>

                                {/* Name Fields - Auto-filled from profile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Reporter First Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.reporterFirstName')}
                                            <span className="text-xs font-normal text-gray-400 normal-case tracking-normal ms-1">({t('sections.contact.fromAccount')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="reporterFirstName"
                                            value={formData.reporterFirstName}
                                            readOnly
                                            disabled
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 cursor-not-allowed ${isRTL ? 'text-right' : 'text-left'}`}
                                        />
                                    </div>
                                    {/* Reporter Last Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.reporterLastName')}
                                            <span className="text-xs font-normal text-gray-400 normal-case tracking-normal ms-1">({t('sections.contact.fromAccount')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="reporterLastName"
                                            value={formData.reporterLastName}
                                            readOnly
                                            disabled
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 cursor-not-allowed ${isRTL ? 'text-right' : 'text-left'}`}
                                        />
                                    </div>
                                </div>

                                {/* Phone and Email */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Phone */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.phone')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            dir="ltr"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-left"
                                            placeholder={t('placeholders.phone')}
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.email')}
                                            <span className="text-xs font-normal text-gray-400 ms-2">({t('optional')})</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            dir="ltr"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-left"
                                            placeholder={t('placeholders.email')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reward Notice - After Contact Info */}
                    <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-900/30">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-green-800 dark:text-green-300 mb-1">
                                    {t('reward.title')}
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                    {t('reward.description')}
                                </p>
                            </div>
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
                            className="mt-1 w-4 h-4 text-orange-600 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
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

                    {/* Success Message - Shown above submit button */}
                    {message && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-sm">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">{message}</span>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{t('success.redirecting')}</p>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                            </div>
                        </div>
                    )}

                    {/* Upload Progress Bar - Shown during upload */}
                    {isUploading && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {uploadProgress <= 50 
                                        ? (t('progress.uploading') || 'Processing your report...')
                                        : (t('progress.processing') || 'Processing your report...')
                                    }
                                </span>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                    {uploadProgress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {uploadProgress <= 50
                                    ? (t('progress.pleaseWait') || 'Please wait while we upload your information...')
                                    : (t('progress.almostDone') || 'Almost done, please wait...')
                                }
                            </p>
                        </div>
                    )}

                    {/* Buttons - Cancel always visible, Submit hidden during upload */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                if (isUploading && xhrRef.current) {
                                    xhrRef.current.abort();
                                    setIsUploading(false);
                                    setUploadProgress(0);
                                    setLoading(false);
                                } else {
                                    router.back();
                                }
                            }}
                            className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {tCommon('buttons.cancel')}
                        </button>
                        {!isUploading && (
                            <button
                                type="submit"
                                disabled={loading || message}
                                className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/30"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t('buttons.submitting')}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {t('buttons.submitReport')}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    </>
                    )}

                </form>
            </div>
        </div>
    );
}
