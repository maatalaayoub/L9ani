"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

// Color presets for markers
const colorPresets = {
    orange: {
        gradient: ['#fb923c', '#ea580c'],
        center: '#f97316',
        spinner: 'border-orange-500',
        hover: '#f97316'
    },
    blue: {
        gradient: ['#60a5fa', '#2563eb'],
        center: '#3b82f6',
        spinner: 'border-blue-500',
        hover: '#3b82f6'
    }
};

// Reverse geocoding function using Nominatim API
const reverseGeocode = async (lat, lng) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en,ar`,
            {
                headers: {
                    'User-Agent': 'L9ani-App/1.0'
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const address = data.address || {};
        
        // Build detailed address (neighborhood, street, etc.)
        const addressParts = [];
        
        if (address.neighbourhood || address.suburb) {
            addressParts.push(address.neighbourhood || address.suburb);
        }
        if (address.road || address.street) {
            addressParts.push(address.road || address.street);
        }
        if (address.house_number) {
            addressParts.push(address.house_number);
        }
        if (address.hamlet || address.village) {
            if (!addressParts.includes(address.hamlet) && !addressParts.includes(address.village)) {
                addressParts.push(address.hamlet || address.village);
            }
        }
        if (address.quarter) {
            addressParts.push(address.quarter);
        }
        
        // If no detailed parts, use the display name but remove city/country parts
        let detailedAddress = addressParts.join(', ');
        if (!detailedAddress && data.display_name) {
            // Use first parts of display_name (usually more specific)
            const parts = data.display_name.split(', ');
            detailedAddress = parts.slice(0, Math.min(3, parts.length - 2)).join(', ');
        }
        
        return {
            address: detailedAddress,
            fullAddress: data.display_name || ''
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
};

export default function MapPicker({ onLocationSelect, initialCoordinates, markerColor = 'orange', myLocationLabel = 'My Location' }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const leafletRef = useRef(null);
    const customIconRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState(null);
    
    const colors = colorPresets[markerColor] || colorPresets.orange;

    // Handle location selection (extracted for reuse)
    const handleMarkerPlacement = useCallback(async (lat, lng) => {
        const geoData = await reverseGeocode(lat, lng);
        onLocationSelect?.({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            address: geoData?.address || '',
            fullAddress: geoData?.fullAddress || ''
        });
    }, [onLocationSelect]);

    // Function to get current location
    const handleGetMyLocation = useCallback(() => {
        // Clear previous errors
        setLocationError(null);
        
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            console.error('Geolocation is not supported');
            return;
        }

        // Check if we're on HTTPS or localhost
        const isSecure = window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
        
        if (!isSecure) {
            setLocationError('Location access requires HTTPS');
            console.error('Geolocation requires HTTPS');
            return;
        }

        setIsLocating(true);
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log('Location obtained:', { latitude, longitude, accuracy });
                
                const map = mapRef.current;
                const L = leafletRef.current;
                const customIcon = customIconRef.current;

                if (map && L && customIcon) {
                    // Move map to current location with appropriate zoom based on accuracy
                    const zoomLevel = accuracy < 100 ? 17 : accuracy < 500 ? 15 : 13;
                    map.setView([latitude, longitude], zoomLevel);

                    // Add or move marker
                    if (markerRef.current) {
                        markerRef.current.setLatLng([latitude, longitude]);
                    } else {
                        markerRef.current = L.marker([latitude, longitude], {
                            icon: customIcon,
                            draggable: true
                        }).addTo(map);

                        markerRef.current.on('dragend', async (e) => {
                            const pos = e.target.getLatLng();
                            await handleMarkerPlacement(pos.lat, pos.lng);
                        });
                    }

                    // Trigger location select callback
                    await handleMarkerPlacement(latitude, longitude);
                }
                setIsLocating(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setIsLocating(false);
                
                // Provide user-friendly error messages
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location access denied. Please enable location in your browser settings.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information unavailable. Please try again.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out. Please try again.');
                        break;
                    default:
                        setLocationError('Unable to get your location. Please try again.');
                }
            },
            { 
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }, [handleMarkerPlacement]);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        let L;
        let map;

        const initializeMap = async () => {
            try {
                // Import Leaflet
                L = (await import('leaflet')).default;
                
                // Import CSS
                await import('leaflet/dist/leaflet.css');

                if (!mapContainerRef.current || mapRef.current) return;

                // Fix default marker icon issue
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                });

                // Create custom marker with dynamic color
                const customIcon = L.divIcon({
                    className: 'custom-leaflet-marker',
                    html: `
                        <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 28 20 28s20-14 20-28C40 8.954 31.046 0 20 0z" fill="url(#gradient-${markerColor})"/>
                            <circle cx="20" cy="18" r="8" fill="white"/>
                            <circle cx="20" cy="18" r="4" fill="${colors.center}"/>
                            <defs>
                                <linearGradient id="gradient-${markerColor}" x1="0" y1="0" x2="40" y2="48" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="${colors.gradient[0]}"/>
                                    <stop offset="1" stop-color="${colors.gradient[1]}"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    `,
                    iconSize: [40, 48],
                    iconAnchor: [20, 48],
                    popupAnchor: [0, -48]
                });

                // Initialize map
                map = L.map(mapContainerRef.current, {
                    center: initialCoordinates?.lat 
                        ? [parseFloat(initialCoordinates.lat), parseFloat(initialCoordinates.lng)]
                        : [31.7917, -7.0926],
                    zoom: initialCoordinates?.lat ? 13 : 6,
                    zoomControl: true
                });

                mapRef.current = map;
                leafletRef.current = L;
                customIconRef.current = customIcon;

                // Add tile layer - OpenStreetMap
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }).addTo(map);

                // Add initial marker if coordinates exist
                if (initialCoordinates?.lat) {
                    markerRef.current = L.marker(
                        [parseFloat(initialCoordinates.lat), parseFloat(initialCoordinates.lng)],
                        { icon: customIcon, draggable: true }
                    ).addTo(map);

                    markerRef.current.on('dragend', async (e) => {
                        const pos = e.target.getLatLng();
                        const geoData = await reverseGeocode(pos.lat, pos.lng);
                        onLocationSelect?.({
                            lat: pos.lat.toFixed(6),
                            lng: pos.lng.toFixed(6),
                            address: geoData?.address || '',
                            fullAddress: geoData?.fullAddress || ''
                        });
                    });
                }

                // Handle click to add/move marker
                map.on('click', async (e) => {
                    const { lat, lng } = e.latlng;

                    if (markerRef.current) {
                        markerRef.current.setLatLng([lat, lng]);
                    } else {
                        markerRef.current = L.marker([lat, lng], {
                            icon: customIcon,
                            draggable: true
                        }).addTo(map);

                        markerRef.current.on('dragend', async (e) => {
                            const pos = e.target.getLatLng();
                            const geoData = await reverseGeocode(pos.lat, pos.lng);
                            onLocationSelect?.({
                                lat: pos.lat.toFixed(6),
                                lng: pos.lng.toFixed(6),
                                address: geoData?.address || '',
                                fullAddress: geoData?.fullAddress || ''
                            });
                        });
                    }

                    // Perform reverse geocoding
                    const geoData = await reverseGeocode(lat, lng);
                    
                    onLocationSelect?.({
                        lat: lat.toFixed(6),
                        lng: lng.toFixed(6),
                        address: geoData?.address || '',
                        fullAddress: geoData?.fullAddress || ''
                    });
                });

                // Try geolocation
                if (navigator.geolocation && !initialCoordinates?.lat) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            map.setView([position.coords.latitude, position.coords.longitude], 13);
                        },
                        () => {},
                        { timeout: 5000 }
                    );
                }

                setIsReady(true);

                // Ensure map renders correctly
                setTimeout(() => map.invalidateSize(), 100);

            } catch (error) {
                console.error('Map initialization error:', error);
            }
        };

        initializeMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <div className="relative w-full h-64 sm:h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div 
                ref={mapContainerRef} 
                className="w-full h-full z-0"
                style={{ background: '#e5e7eb' }}
            />
            {/* My Location Button */}
            {isReady && (
                <button
                    type="button"
                    onClick={handleGetMyLocation}
                    disabled={isLocating}
                    className={`
                        absolute top-3 right-3 z-[1000] 
                        flex items-center gap-2 px-3 py-2 
                        bg-white dark:bg-gray-800 
                        border border-gray-200 dark:border-gray-600 
                        rounded-lg shadow-md 
                        text-sm font-medium text-gray-700 dark:text-gray-200
                        hover:bg-gray-50 dark:hover:bg-gray-700 
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    title={myLocationLabel}
                >
                    {isLocating ? (
                        <div className={`animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-${markerColor === 'blue' ? 'blue' : 'orange'}-500`}></div>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    )}
                    <span className="hidden sm:inline">{myLocationLabel}</span>
                </button>
            )}
            {/* Location Error Message */}
            {locationError && (
                <div className="absolute top-16 right-3 z-[1000] max-w-[200px] sm:max-w-[280px] px-3 py-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg shadow-md">
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-red-600 dark:text-red-300">{locationError}</p>
                        <button 
                            type="button"
                            onClick={() => setLocationError(null)}
                            className="flex-shrink-0 text-red-400 hover:text-red-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {!isReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${colors.spinner} mb-3`}></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
                </div>
            )}
            <style jsx global>{`
                .custom-leaflet-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .leaflet-control-zoom {
                    border: none !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.15) !important;
                    border-radius: 8px !important;
                    overflow: hidden;
                }
                .leaflet-control-zoom a {
                    width: 32px !important;
                    height: 32px !important;
                    line-height: 32px !important;
                    border: none !important;
                    color: #374151 !important;
                }
                .leaflet-control-zoom a:hover {
                    background: ${colors.hover} !important;
                    color: white !important;
                }
            `}</style>
        </div>
    );
}
