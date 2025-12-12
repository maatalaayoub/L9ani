"use client";

import { useEffect, useRef, useState } from 'react';

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

export default function MapPicker({ onLocationSelect, initialCoordinates, markerColor = 'orange' }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    
    const colors = colorPresets[markerColor] || colorPresets.orange;

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

                    markerRef.current.on('dragend', (e) => {
                        const pos = e.target.getLatLng();
                        onLocationSelect?.({
                            lat: pos.lat.toFixed(6),
                            lng: pos.lng.toFixed(6)
                        });
                    });
                }

                // Handle click to add/move marker
                map.on('click', (e) => {
                    const { lat, lng } = e.latlng;

                    if (markerRef.current) {
                        markerRef.current.setLatLng([lat, lng]);
                    } else {
                        markerRef.current = L.marker([lat, lng], {
                            icon: customIcon,
                            draggable: true
                        }).addTo(map);

                        markerRef.current.on('dragend', (e) => {
                            const pos = e.target.getLatLng();
                            onLocationSelect?.({
                                lat: pos.lat.toFixed(6),
                                lng: pos.lng.toFixed(6)
                            });
                        });
                    }

                    onLocationSelect?.({
                        lat: lat.toFixed(6),
                        lng: lng.toFixed(6)
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
