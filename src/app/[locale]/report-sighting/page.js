"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import Image from 'next/image';
import 'ol/ol.css';

export default function ReportSightingPage() {
    const { user, isAuthLoading } = useAuth();
    const router = useRouter();
    const t = useTranslations('reportSighting');
    const tCommon = useTranslations('common');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const fileInputRef = useRef(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [mapLoaded, setMapLoaded] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: '',
        locationDescription: '',
        coordinates: { lat: null, lng: null },
        additionalInfo: '',
        reporterFirstName: '',
        reporterLastName: ''
    });

    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);

    // Load Leaflet
    useEffect(() => {
        let isMounted = true;
        
        const loadLeaflet = async () => {
            if (typeof window === 'undefined') return;
            
            // Check if Leaflet is already loaded
            if (window.L) {
                if (isMounted) setMapLoaded(true);
                return;
            }

            try {
                // Load Leaflet CSS
                if (!document.querySelector('link[href*="leaflet"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }

                // Load Leaflet JS using a promise to ensure proper loading
                await new Promise((resolve, reject) => {
                    if (document.querySelector('script[src*="leaflet"]')) {
                        // Wait for existing script to load
                        const checkLoaded = setInterval(() => {
                            if (window.L) {
                                clearInterval(checkLoaded);
                                resolve();
                            }
                        }, 100);
                        setTimeout(() => {
                            clearInterval(checkLoaded);
                            reject(new Error('Leaflet loading timeout'));
                        }, 10000);
                    } else {
                        const script = document.createElement('script');
                        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    }
                });
                
                if (isMounted && window.L) {
                    setMapLoaded(true);
                }
            } catch (err) {
                console.error('Error loading Leaflet:', err);
            }
        };

        loadLeaflet();
        
        return () => {
            isMounted = false;
        };
    }, []);

    // Initialize map when loaded
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;
        
        const L = window.L;
        if (!L) return;

        // Detect if mobile device
        const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;

        try {
            // Initialize map centered on Morocco
            const map = L.map(mapRef.current, {
                center: [31.7917, -7.0926],
                zoom: 6,
                scrollWheelZoom: true,
                // Require two fingers to drag on mobile
                dragging: !isMobile,
                tap: !isMobile,
                touchZoom: true
            });

            // Enable dragging with two fingers on mobile
            if (isMobile) {
                map.on('touchstart', function(e) {
                    if (e.originalEvent.touches.length === 1) {
                        map.dragging.disable();
                    } else if (e.originalEvent.touches.length === 2) {
                        map.dragging.enable();
                    }
                });
            }
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(map);

            // Add click handler to place marker
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                
                // Remove existing marker
                if (markerRef.current) {
                    map.removeLayer(markerRef.current);
                }

                // Add new marker
                markerRef.current = L.marker([lat, lng], {
                    draggable: true
                }).addTo(map);

                // Update coordinates
                setFormData(prev => ({
                    ...prev,
                    coordinates: { lat: lat.toFixed(6), lng: lng.toFixed(6) }
                }));

                // Handle marker drag
                markerRef.current.on('dragend', (e) => {
                    const position = e.target.getLatLng();
                    setFormData(prev => ({
                        ...prev,
                        coordinates: { lat: position.lat.toFixed(6), lng: position.lng.toFixed(6) }
                    }));
                });
            });

            mapInstanceRef.current = map;

            // Fix map size after render
            setTimeout(() => {
                map.invalidateSize();
            }, 100);

            // Try to get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 13);
                    },
                    () => {
                        // Geolocation denied or failed, keep default view
                    },
                    { timeout: 10000 }
                );
            }
        } catch (err) {
            console.error('Error initializing map:', err);
        }
    }, [mapLoaded]);

    // Cleanup map on unmount
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

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
        setLoading(true);
        setMessage('');
        setError('');

        // Validation
        if (photos.length === 0) {
            setError(t('errors.photoRequired'));
            setLoading(false);
            return;
        }

        if (!formData.phone) {
            setError(t('errors.phoneRequired'));
            setLoading(false);
            return;
        }

        if (!formData.city || !formData.locationDescription) {
            setError(t('errors.locationRequired'));
            setLoading(false);
            return;
        }

        try {
            // TODO: Implement actual submission logic
            // 1. Upload photos to storage
            // 2. Save sighting report to database
            // 3. Trigger AI matching against missing persons

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            setMessage(t('success.reportSubmitted'));
            
            // Redirect after success
            setTimeout(() => {
                router.push('/');
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
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
                {error && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-lg shadow-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

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
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
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
                                <div 
                                    ref={mapRef} 
                                    className="w-full h-64 sm:h-80 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 relative z-0"
                                    style={{ minHeight: '256px' }}
                                >
                                    {!mapLoaded && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-3"></div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
                                        </div>
                                    )}
                                </div>
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
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {t('fields.city')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                        placeholder={t('placeholders.city')}
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

                    {/* Section 3: Person Details (Very Important if known) */}
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

                    {/* Section 4: Your Contact Information (All in one block) */}
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

                                {/* Name Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Reporter First Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.reporterFirstName')} <span className="text-blue-500">★</span>
                                            <span className="text-xs font-normal text-blue-500 normal-case tracking-normal ms-1">({t('sections.contact.importantIfProvided')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="reporterFirstName"
                                            value={formData.reporterFirstName}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.reporterFirstName')}
                                        />
                                    </div>
                                    {/* Reporter Last Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {t('fields.reporterLastName')} <span className="text-blue-500">★</span>
                                            <span className="text-xs font-normal text-blue-500 normal-case tracking-normal ms-1">({t('sections.contact.importantIfProvided')})</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="reporterLastName"
                                            value={formData.reporterLastName}
                                            onChange={handleChange}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                            placeholder={t('placeholders.reporterLastName')}
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

                    {/* Section 5: Additional Information */}
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

                    {/* Reward Notice - After Additional Info */}
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
                    </div>

                </form>
            </div>
        </div>
    );
}
