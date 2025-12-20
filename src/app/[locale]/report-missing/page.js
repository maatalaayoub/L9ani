"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import dynamic from 'next/dynamic';
import LoginDialog from '@/components/LoginDialog';
import SelectDropdown from '@/components/SelectDropdown';
import { getCitiesForDropdown } from '@/data/moroccanCities';

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
    const xhrRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');
    
    // Upload progress state
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    
    // Report type selection
    const [reportType, setReportType] = useState('');

    // Form data - includes all possible fields for different types
    const [formData, setFormData] = useState({
        // Person fields
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        healthStatus: '',
        healthDetails: '',
        // Pet fields
        petName: '',
        petType: '',
        petBreed: '',
        petColor: '',
        petSize: '',
        // Document fields
        documentType: '',
        documentNumber: '',
        documentIssuer: '',
        ownerName: '',
        // Electronics fields
        deviceType: '',
        deviceBrand: '',
        deviceModel: '',
        deviceColor: '',
        serialNumber: '',
        // Vehicle fields
        vehicleType: '',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleColor: '',
        vehicleYear: '',
        licensePlate: '',
        // Other item fields
        itemName: '',
        itemDescription: '',
        // Common fields
        city: '',
        lastKnownLocation: '',
        coordinates: { lat: null, lng: null },
        additionalInfo: ''
    });

    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [agreedToLegal, setAgreedToLegal] = useState(false);
    const [currentWarning, setCurrentWarning] = useState('');

    // Load prefill data from chatbot (if redirected from chat)
    useEffect(() => {
        try {
            const prefillData = sessionStorage.getItem('reportPrefill');
            if (prefillData) {
                const { type, data } = JSON.parse(prefillData);
                console.log('[ReportMissing] Loading prefill data:', { type, data });
                
                // Set report type
                if (type) {
                    setReportType(type);
                }
                
                // Map chatbot field names to form field names based on report type
                if (data && typeof data === 'object') {
                    // Base field mapping (common fields)
                    const baseFieldMapping = {
                        firstName: 'firstName',
                        lastName: 'lastName',
                        city: 'city',
                        lastKnownLocation: 'lastKnownLocation',
                        additionalInfo: 'additionalInfo'
                    };
                    
                    // Type-specific field mappings
                    const typeSpecificMappings = {
                        person: {
                            dateOfBirth: 'dateOfBirth',
                            gender: 'gender',
                            healthStatus: 'healthStatus',
                            healthDetails: 'healthDetails'
                        },
                        pet: {
                            petName: 'petName',
                            petType: 'petType',
                            breed: 'petBreed',
                            color: 'petColor',
                            size: 'petSize'
                        },
                        document: {
                            documentType: 'documentType',
                            documentNumber: 'documentNumber',
                            ownerName: 'ownerName',
                            issuingAuthority: 'documentIssuer'
                        },
                        electronics: {
                            deviceType: 'deviceType',
                            brand: 'deviceBrand',
                            model: 'deviceModel',
                            color: 'deviceColor',
                            serialNumber: 'serialNumber'
                        },
                        vehicle: {
                            vehicleType: 'vehicleType',
                            brand: 'vehicleBrand',
                            model: 'vehicleModel',
                            color: 'vehicleColor',
                            year: 'vehicleYear',
                            licensePlate: 'licensePlate'
                        },
                        other: {
                            itemName: 'itemName',
                            itemDescription: 'itemDescription'
                        }
                    };
                    
                    // Combine base mapping with type-specific mapping
                    const fieldMapping = {
                        ...baseFieldMapping,
                        ...(typeSpecificMappings[type] || {})
                    };
                    
                    setFormData(prev => {
                        const newData = { ...prev };
                        for (const [chatbotKey, value] of Object.entries(data)) {
                            // Use mapping if exists, otherwise use same key
                            const formKey = fieldMapping[chatbotKey] || chatbotKey;
                            if (formKey in prev && value) {
                                newData[formKey] = value;
                            }
                        }
                        console.log('[ReportMissing] Mapped form data:', newData);
                        return newData;
                    });
                }
                
                // Clear the prefill data after loading
                sessionStorage.removeItem('reportPrefill');
            }
        } catch (err) {
            console.error('[ReportMissing] Error loading prefill data:', err);
        }
    }, []);

    // Get the first validation error (in order of priority)
    const getFirstValidationError = () => {
        if (!reportType) return t('errors.typeRequired');
        
        // Photos are required only for person and pet
        if ((reportType === 'person' || reportType === 'pet') && photos.length === 0) {
            return t('validation.photo');
        }
        
        // Type-specific validation
        switch (reportType) {
            case 'person':
                if (!formData.firstName.trim()) return t('validation.firstName');
                if (!formData.lastName.trim()) return t('validation.lastName');
                break;
            case 'pet':
                if (!formData.petName.trim()) return t('validation.petName');
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
        
        if (!formData.city.trim()) return t('validation.city');
        if (!formData.lastKnownLocation.trim()) return t('validation.lastKnownLocation');
        if (!agreedToLegal) return t('validation.legalConfirmation');
        return null;
    };

    const genderOptions = [
        { value: 'male', label: t('options.male') },
        { value: 'female', label: t('options.female') }
    ];

    // Pet options
    const petTypeOptions = [
        { value: 'dog', label: t('options.petTypes.dog') },
        { value: 'cat', label: t('options.petTypes.cat') },
        { value: 'bird', label: t('options.petTypes.bird') },
        { value: 'other', label: t('options.petTypes.other') }
    ];

    const petSizeOptions = [
        { value: 'small', label: t('options.petSizes.small') },
        { value: 'medium', label: t('options.petSizes.medium') },
        { value: 'large', label: t('options.petSizes.large') }
    ];

    // Document options
    const documentTypeOptions = [
        { value: 'nationalId', label: t('options.documentTypes.nationalId') },
        { value: 'passport', label: t('options.documentTypes.passport') },
        { value: 'driverLicense', label: t('options.documentTypes.driverLicense') },
        { value: 'residenceCard', label: t('options.documentTypes.residenceCard') },
        { value: 'birthCertificate', label: t('options.documentTypes.birthCertificate') },
        { value: 'diploma', label: t('options.documentTypes.diploma') },
        { value: 'other', label: t('options.documentTypes.other') }
    ];

    // Device options
    const deviceTypeOptions = [
        { value: 'phone', label: t('options.deviceTypes.phone') },
        { value: 'laptop', label: t('options.deviceTypes.laptop') },
        { value: 'tablet', label: t('options.deviceTypes.tablet') },
        { value: 'camera', label: t('options.deviceTypes.camera') },
        { value: 'smartwatch', label: t('options.deviceTypes.smartwatch') },
        { value: 'earbuds', label: t('options.deviceTypes.earbuds') },
        { value: 'other', label: t('options.deviceTypes.other') }
    ];

    const deviceBrandOptions = [
        { value: 'apple', label: t('options.deviceBrands.apple') },
        { value: 'samsung', label: t('options.deviceBrands.samsung') },
        { value: 'huawei', label: t('options.deviceBrands.huawei') },
        { value: 'xiaomi', label: t('options.deviceBrands.xiaomi') },
        { value: 'oppo', label: t('options.deviceBrands.oppo') },
        { value: 'vivo', label: t('options.deviceBrands.vivo') },
        { value: 'realme', label: t('options.deviceBrands.realme') },
        { value: 'oneplus', label: t('options.deviceBrands.oneplus') },
        { value: 'google', label: t('options.deviceBrands.google') },
        { value: 'sony', label: t('options.deviceBrands.sony') },
        { value: 'lg', label: t('options.deviceBrands.lg') },
        { value: 'nokia', label: t('options.deviceBrands.nokia') },
        { value: 'motorola', label: t('options.deviceBrands.motorola') },
        { value: 'asus', label: t('options.deviceBrands.asus') },
        { value: 'lenovo', label: t('options.deviceBrands.lenovo') },
        { value: 'hp', label: t('options.deviceBrands.hp') },
        { value: 'dell', label: t('options.deviceBrands.dell') },
        { value: 'acer', label: t('options.deviceBrands.acer') },
        { value: 'microsoft', label: t('options.deviceBrands.microsoft') },
        { value: 'other', label: t('options.deviceBrands.other') }
    ];

    // Vehicle options
    const vehicleTypeOptions = [
        { value: 'car', label: t('options.vehicleTypes.car') },
        { value: 'motorcycle', label: t('options.vehicleTypes.motorcycle') },
        { value: 'bicycle', label: t('options.vehicleTypes.bicycle') },
        { value: 'scooter', label: t('options.vehicleTypes.scooter') },
        { value: 'other', label: t('options.vehicleTypes.other') }
    ];

    const vehicleBrandOptions = [
        { value: 'toyota', label: t('options.vehicleBrands.toyota') },
        { value: 'honda', label: t('options.vehicleBrands.honda') },
        { value: 'nissan', label: t('options.vehicleBrands.nissan') },
        { value: 'hyundai', label: t('options.vehicleBrands.hyundai') },
        { value: 'kia', label: t('options.vehicleBrands.kia') },
        { value: 'mercedes', label: t('options.vehicleBrands.mercedes') },
        { value: 'bmw', label: t('options.vehicleBrands.bmw') },
        { value: 'audi', label: t('options.vehicleBrands.audi') },
        { value: 'volkswagen', label: t('options.vehicleBrands.volkswagen') },
        { value: 'ford', label: t('options.vehicleBrands.ford') },
        { value: 'chevrolet', label: t('options.vehicleBrands.chevrolet') },
        { value: 'peugeot', label: t('options.vehicleBrands.peugeot') },
        { value: 'renault', label: t('options.vehicleBrands.renault') },
        { value: 'dacia', label: t('options.vehicleBrands.dacia') },
        { value: 'fiat', label: t('options.vehicleBrands.fiat') },
        { value: 'citroen', label: t('options.vehicleBrands.citroen') },
        { value: 'suzuki', label: t('options.vehicleBrands.suzuki') },
        { value: 'mazda', label: t('options.vehicleBrands.mazda') },
        { value: 'mitsubishi', label: t('options.vehicleBrands.mitsubishi') },
        { value: 'other', label: t('options.vehicleBrands.other') }
    ];

    // Color options
    const colorOptions = [
        { value: 'black', label: t('options.colors.black') },
        { value: 'white', label: t('options.colors.white') },
        { value: 'silver', label: t('options.colors.silver') },
        { value: 'gray', label: t('options.colors.gray') },
        { value: 'red', label: t('options.colors.red') },
        { value: 'blue', label: t('options.colors.blue') },
        { value: 'green', label: t('options.colors.green') },
        { value: 'yellow', label: t('options.colors.yellow') },
        { value: 'orange', label: t('options.colors.orange') },
        { value: 'brown', label: t('options.colors.brown') },
        { value: 'gold', label: t('options.colors.gold') },
        { value: 'pink', label: t('options.colors.pink') },
        { value: 'purple', label: t('options.colors.purple') },
        { value: 'other', label: t('options.colors.other') }
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

    // Load prefill data from sessionStorage (from chatbot)
    useEffect(() => {
        try {
            const prefillData = sessionStorage.getItem('reportPrefill');
            if (prefillData) {
                const parsed = JSON.parse(prefillData);
                console.log('[ReportMissing] Loading prefill data:', parsed);
                
                // Set the report type
                if (parsed.type) {
                    setReportType(parsed.type);
                }
                
                // Map chatbot field names to form field names and set form data
                if (parsed.data) {
                    const fieldMapping = {
                        // Person fields
                        firstName: 'firstName',
                        lastName: 'lastName',
                        dateOfBirth: 'dateOfBirth',
                        gender: 'gender',
                        healthStatus: 'healthStatus',
                        healthDetails: 'healthDetails',
                        // Pet fields
                        petName: 'petName',
                        petType: 'petType',
                        breed: 'petBreed',
                        color: 'petColor',
                        size: 'petSize',
                        // Document fields
                        documentType: 'documentType',
                        documentNumber: 'documentNumber',
                        issuingAuthority: 'documentIssuer',
                        ownerName: 'ownerName',
                        // Electronics fields
                        deviceType: 'deviceType',
                        brand: 'deviceBrand',
                        model: 'deviceModel',
                        serialNumber: 'serialNumber',
                        // Vehicle fields
                        vehicleType: 'vehicleType',
                        vehicleBrand: 'vehicleBrand',
                        vehicleModel: 'vehicleModel',
                        vehicleColor: 'vehicleColor',
                        year: 'vehicleYear',
                        licensePlate: 'licensePlate',
                        // Other fields
                        itemName: 'itemName',
                        itemDescription: 'itemDescription',
                        // Common fields
                        city: 'city',
                        lastKnownLocation: 'lastKnownLocation',
                        additionalInfo: 'additionalInfo'
                    };
                    
                    setFormData(prev => {
                        const newData = { ...prev };
                        for (const [chatbotKey, formKey] of Object.entries(fieldMapping)) {
                            if (parsed.data[chatbotKey]) {
                                newData[formKey] = parsed.data[chatbotKey];
                            }
                        }
                        return newData;
                    });
                }
                
                // Clear the prefill data after loading
                sessionStorage.removeItem('reportPrefill');
            }
        } catch (error) {
            console.error('[ReportMissing] Error loading prefill data:', error);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationSelect = (locationData) => {
        setFormData(prev => ({
            ...prev,
            coordinates: { lat: locationData.lat, lng: locationData.lng },
            // Auto-fill last known location with detailed address (city selection is manual)
            lastKnownLocation: locationData.address || prev.lastKnownLocation
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
            // Get auth token
            const token = localStorage.getItem('supabase_token');
            if (!token) {
                setError(t('errors.notLoggedIn') || 'You must be logged in to submit a report');
                setLoading(false);
                setIsUploading(false);
                return;
            }

            // Create FormData for multipart upload
            const submitData = new FormData();
            submitData.append('reportType', reportType);
            submitData.append('city', formData.city);
            submitData.append('lastKnownLocation', formData.lastKnownLocation);
            
            // Type-specific fields
            switch (reportType) {
                case 'person':
                    submitData.append('firstName', formData.firstName);
                    submitData.append('lastName', formData.lastName);
                    if (formData.dateOfBirth) submitData.append('dateOfBirth', formData.dateOfBirth);
                    if (formData.gender) submitData.append('gender', formData.gender);
                    if (formData.healthStatus) submitData.append('healthStatus', formData.healthStatus);
                    if (formData.healthDetails) submitData.append('healthDetails', formData.healthDetails);
                    break;
                case 'pet':
                    submitData.append('petName', formData.petName);
                    submitData.append('petType', formData.petType);
                    if (formData.petBreed) submitData.append('petBreed', formData.petBreed);
                    if (formData.petColor) submitData.append('petColor', formData.petColor);
                    if (formData.petSize) submitData.append('petSize', formData.petSize);
                    break;
                case 'document':
                    submitData.append('documentType', formData.documentType);
                    if (formData.documentNumber) submitData.append('documentNumber', formData.documentNumber);
                    if (formData.documentIssuer) submitData.append('documentIssuer', formData.documentIssuer);
                    if (formData.ownerName) submitData.append('ownerName', formData.ownerName);
                    break;
                case 'electronics':
                    submitData.append('deviceType', formData.deviceType);
                    submitData.append('deviceBrand', formData.deviceBrand);
                    if (formData.deviceModel) submitData.append('deviceModel', formData.deviceModel);
                    if (formData.deviceColor) submitData.append('deviceColor', formData.deviceColor);
                    if (formData.serialNumber) submitData.append('serialNumber', formData.serialNumber);
                    break;
                case 'vehicle':
                    submitData.append('vehicleType', formData.vehicleType);
                    submitData.append('vehicleBrand', formData.vehicleBrand);
                    if (formData.vehicleModel) submitData.append('vehicleModel', formData.vehicleModel);
                    if (formData.vehicleColor) submitData.append('vehicleColor', formData.vehicleColor);
                    if (formData.vehicleYear) submitData.append('vehicleYear', formData.vehicleYear);
                    if (formData.licensePlate) submitData.append('licensePlate', formData.licensePlate);
                    break;
                case 'other':
                    submitData.append('itemName', formData.itemName);
                    if (formData.itemDescription) submitData.append('itemDescription', formData.itemDescription);
                    break;
            }
            
            if (formData.additionalInfo) {
                submitData.append('additionalInfo', formData.additionalInfo);
            }
            if (formData.coordinates?.lat && formData.coordinates?.lng) {
                submitData.append('coordinates', JSON.stringify(formData.coordinates));
            }

            // Add photos
            photos.forEach((photo) => {
                submitData.append('photos', photo);
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
                        if (xhr.status >= 200 && xhr.status < 300) {
                            setUploadProgress(100);
                            resolve(response);
                        } else {
                            reject(new Error(response.error || 'Failed to submit report'));
                        }
                    } catch (e) {
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
                
                xhr.open('POST', '/api/reports');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.send(submitData);
            });

            // Upload complete - hide progress bar and show success message
            setIsUploading(false);
            setUploadProgress(0);
            setLoading(false);
            setMessage(t('success.reportSubmitted'));
            
            // Wait 3 seconds to show success message, then redirect
            setTimeout(() => {
                // Use window.location for reliable redirect with locale
                window.location.href = `/${locale}/my-report`;
            }, 3000);

        } catch (err) {
            console.error('Submit error:', err);
            setError(err.message === 'Upload cancelled' ? '' : t('errors.submitFailed'));
            setIsUploading(false);
            setUploadProgress(0);
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

                {/* Notifications - Error only at top */}

                {error && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">{error}</span>
                        <button 
                            onClick={() => setError('')}
                            className="ml-auto text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section 0: Type Selection */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                {t('types.selectType')} <span className="text-red-500">*</span>
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('types.selectTypeDescription')}</p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {/* Person */}
                                <button
                                    type="button"
                                    onClick={() => setReportType('person')}
                                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                        reportType === 'person'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                        reportType === 'person' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        <svg className={`w-7 h-7 ${reportType === 'person' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <span className={`text-sm font-medium ${reportType === 'person' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t('types.person.title')}
                                    </span>
                                </button>

                                {/* Pet */}
                                <button
                                    type="button"
                                    onClick={() => setReportType('pet')}
                                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                        reportType === 'pet'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                        reportType === 'pet' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        <svg className={`w-7 h-7 ${reportType === 'pet' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="currentColor" viewBox="0 0 512 512">
                                            <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z"/>
                                        </svg>
                                    </div>
                                    <span className={`text-sm font-medium ${reportType === 'pet' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t('types.pet.title')}
                                    </span>
                                </button>

                                {/* Documents */}
                                <button
                                    type="button"
                                    onClick={() => setReportType('document')}
                                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                        reportType === 'document'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                        reportType === 'document' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        <svg className={`w-7 h-7 ${reportType === 'document' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <span className={`text-sm font-medium ${reportType === 'document' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t('types.documents.title')}
                                    </span>
                                </button>

                                {/* Electronics */}
                                <button
                                    type="button"
                                    onClick={() => setReportType('electronics')}
                                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                        reportType === 'electronics'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                        reportType === 'electronics' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        <svg className={`w-7 h-7 ${reportType === 'electronics' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className={`text-sm font-medium ${reportType === 'electronics' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t('types.electronics.title')}
                                    </span>
                                </button>

                                {/* Vehicle */}
                                <button
                                    type="button"
                                    onClick={() => setReportType('vehicle')}
                                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                        reportType === 'vehicle'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                        reportType === 'vehicle' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        <svg className={`w-7 h-7 ${reportType === 'vehicle' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                        </svg>
                                    </div>
                                    <span className={`text-sm font-medium ${reportType === 'vehicle' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t('types.vehicle.title')}
                                    </span>
                                </button>

                                {/* Other */}
                                <button
                                    type="button"
                                    onClick={() => setReportType('other')}
                                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                                        reportType === 'other'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                        reportType === 'other' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                        <svg className={`w-7 h-7 ${reportType === 'other' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                    </div>
                                    <span className={`text-sm font-medium ${reportType === 'other' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {t('types.other.title')}
                                    </span>
                                </button>
                            </div>

                            {/* Warning if no type selected */}
                            {currentWarning === t('validation.reportType') && (
                                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-sm text-amber-700 dark:text-amber-300">{t('validation.reportType')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Only show remaining sections if type is selected */}
                    {reportType && (
                    <>
                    {/* Section 1: Photo Upload */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('sections.photos.title')}
                                {(reportType === 'person' || reportType === 'pet') && <span className="text-red-500">*</span>}
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

                    {/* Section 2: Type-Specific Details */}
                    {reportType === 'person' && (
                        <>
                            {/* Personal Information */}
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

                            {/* Health Status */}
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
                        </>
                    )}

                    {/* Pet Details */}
                    {reportType === 'pet' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 19c-4 0-7-2-7-5 0-2 2-4 4-4 1.5 0 2.5 1 3 2 .5-1 1.5-2 3-2 2 0 4 2 4 4 0 3-3 5-7 5z" />
                                    </svg>
                                    {t('sections.petInfo.title')}
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Pet Name */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.petName')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="petName"
                                            value={formData.petName}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.petName')}
                                        />
                                    </div>

                                    {/* Pet Type */}
                                    <SelectDropdown
                                        value={formData.petType}
                                        onChange={(value) => setFormData(prev => ({ ...prev, petType: value }))}
                                        options={petTypeOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={<>{t('fields.petType')} <span className="text-red-500">*</span></>}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Pet Breed */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.petBreed')}
                                        </label>
                                        <input
                                            type="text"
                                            name="petBreed"
                                            value={formData.petBreed}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.petBreed')}
                                        />
                                    </div>

                                    {/* Pet Color */}
                                    <SelectDropdown
                                        value={formData.petColor}
                                        onChange={(value) => setFormData(prev => ({ ...prev, petColor: value }))}
                                        options={colorOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={t('fields.petColor')}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Pet Size */}
                                    <SelectDropdown
                                        value={formData.petSize}
                                        onChange={(value) => setFormData(prev => ({ ...prev, petSize: value }))}
                                        options={petSizeOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={t('fields.petSize')}
                                        isRTL={isRTL}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Document Details */}
                    {reportType === 'document' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {t('sections.documentInfo.title')}
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Document Type */}
                                    <SelectDropdown
                                        value={formData.documentType}
                                        onChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}
                                        options={documentTypeOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={<>{t('fields.documentType')} <span className="text-red-500">*</span></>}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Document Number */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.documentNumber')}
                                        </label>
                                        <input
                                            type="text"
                                            name="documentNumber"
                                            value={formData.documentNumber}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.documentNumber')}
                                        />
                                    </div>

                                    {/* Document Issuer */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.documentIssuer')}
                                        </label>
                                        <input
                                            type="text"
                                            name="documentIssuer"
                                            value={formData.documentIssuer}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.documentIssuer')}
                                        />
                                    </div>

                                    {/* Owner Name */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.ownerName')}
                                        </label>
                                        <input
                                            type="text"
                                            name="ownerName"
                                            value={formData.ownerName}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.ownerName')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Electronics Details */}
                    {reportType === 'electronics' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    {t('sections.electronicsInfo.title')}
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Device Type */}
                                    <SelectDropdown
                                        value={formData.deviceType}
                                        onChange={(value) => setFormData(prev => ({ ...prev, deviceType: value }))}
                                        options={deviceTypeOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={<>{t('fields.deviceType')} <span className="text-red-500">*</span></>}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Device Brand */}
                                    <SelectDropdown
                                        value={formData.deviceBrand}
                                        onChange={(value) => setFormData(prev => ({ ...prev, deviceBrand: value }))}
                                        options={deviceBrandOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={<>{t('fields.deviceBrand')} <span className="text-red-500">*</span></>}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Device Model */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.deviceModel')}
                                        </label>
                                        <input
                                            type="text"
                                            name="deviceModel"
                                            value={formData.deviceModel}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.deviceModel')}
                                        />
                                    </div>

                                    {/* Device Color */}
                                    <SelectDropdown
                                        value={formData.deviceColor}
                                        onChange={(value) => setFormData(prev => ({ ...prev, deviceColor: value }))}
                                        options={colorOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={t('fields.deviceColor')}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Serial Number */}
                                    <div className="sm:col-span-2">
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.serialNumber')}
                                        </label>
                                        <input
                                            type="text"
                                            name="serialNumber"
                                            value={formData.serialNumber}
                                            onChange={handleChange}
                                            dir="ltr"
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.serialNumber')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vehicle Details */}
                    {reportType === 'vehicle' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    </svg>
                                    {t('sections.vehicleInfo.title')}
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Vehicle Type */}
                                    <SelectDropdown
                                        value={formData.vehicleType}
                                        onChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
                                        options={vehicleTypeOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={<>{t('fields.vehicleType')} <span className="text-red-500">*</span></>}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Vehicle Brand */}
                                    <SelectDropdown
                                        value={formData.vehicleBrand}
                                        onChange={(value) => setFormData(prev => ({ ...prev, vehicleBrand: value }))}
                                        options={vehicleBrandOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={<>{t('fields.vehicleBrand')} <span className="text-red-500">*</span></>}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* Vehicle Model */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.vehicleModel')}
                                        </label>
                                        <input
                                            type="text"
                                            name="vehicleModel"
                                            value={formData.vehicleModel}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.vehicleModel')}
                                        />
                                    </div>

                                    {/* Vehicle Year */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.vehicleYear')}
                                        </label>
                                        <input
                                            type="text"
                                            name="vehicleYear"
                                            value={formData.vehicleYear}
                                            onChange={handleChange}
                                            dir="ltr"
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.vehicleYear')}
                                        />
                                    </div>

                                    {/* Vehicle Color */}
                                    <SelectDropdown
                                        value={formData.vehicleColor}
                                        onChange={(value) => setFormData(prev => ({ ...prev, vehicleColor: value }))}
                                        options={colorOptions}
                                        placeholder={t('options.selectOption')}
                                        searchPlaceholder={t('options.searchOptions')}
                                        label={t('fields.vehicleColor')}
                                        isRTL={isRTL}
                                        allowCustom={true}
                                        customLabel={t('options.customOption')}
                                    />

                                    {/* License Plate */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.licensePlate')}
                                        </label>
                                        <input
                                            type="text"
                                            name="licensePlate"
                                            value={formData.licensePlate}
                                            onChange={handleChange}
                                            dir="ltr"
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.licensePlate')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Item Details */}
                    {reportType === 'other' && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                    {t('sections.otherInfo.title')}
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-5">
                                    {/* Item Name */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.itemName')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="itemName"
                                            value={formData.itemName}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.itemName')}
                                        />
                                    </div>

                                    {/* Item Description */}
                                    <div>
                                        <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {t('fields.itemDescription')}
                                        </label>
                                        <textarea
                                            name="itemDescription"
                                            value={formData.itemDescription}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            rows={4}
                                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.itemDescription')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 4: Location Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
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
                                    myLocationLabel={t('fields.myLocation')}
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
                                <div className="relative z-50">
                                    <label className={`block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                                        ? (t('progress.uploading') || 'Uploading your report...')
                                        : (t('progress.processing') || 'Processing your report...')
                                    }
                                </span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {uploadProgress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
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
                        )}
                    </div>
                    </>
                    )}
                </form>
            </div>
        </div>
    );
}
