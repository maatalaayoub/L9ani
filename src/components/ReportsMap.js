"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations, useLanguage } from "@/context/LanguageContext";

// Marker colors for different report types and sources
const markerColors = {
    missing: {
        person: { gradient: ['#3b82f6', '#1d4ed8'], center: '#2563eb' },
        pet: { gradient: ['#8b5cf6', '#6d28d9'], center: '#7c3aed' },
        document: { gradient: ['#06b6d4', '#0891b2'], center: '#0e7490' },
        electronics: { gradient: ['#6366f1', '#4f46e5'], center: '#5558e9' },
        vehicle: { gradient: ['#0ea5e9', '#0284c7'], center: '#0369a1' },
        other: { gradient: ['#64748b', '#475569'], center: '#525c6b' }
    },
    sighting: {
        person: { gradient: ['#f97316', '#ea580c'], center: '#f97316' },
        pet: { gradient: ['#f59e0b', '#d97706'], center: '#eab308' },
        document: { gradient: ['#fb923c', '#f97316'], center: '#fb923c' },
        electronics: { gradient: ['#fbbf24', '#f59e0b'], center: '#fbbf24' },
        vehicle: { gradient: ['#fb7185', '#f43f5e'], center: '#fb7185' },
        other: { gradient: ['#a3a3a3', '#737373'], center: '#8b8b8b' }
    }
};

// Create custom marker SVG
function createMarkerSvg(colors, reportType, isSighting) {
    const icon = getTypeIconPath(reportType);
    return `
        <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 32 20 32s20-18 20-32C40 8.954 31.046 0 20 0z" fill="url(#grad-${reportType}-${isSighting ? 's' : 'm'})"/>
            <circle cx="20" cy="18" r="12" fill="white"/>
            <g transform="translate(12, 10)" fill="${colors.center}">
                ${icon}
            </g>
            <defs>
                <linearGradient id="grad-${reportType}-${isSighting ? 's' : 'm'}" x1="0" y1="0" x2="40" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stop-color="${colors.gradient[0]}"/>
                    <stop offset="1" stop-color="${colors.gradient[1]}"/>
                </linearGradient>
            </defs>
        </svg>
    `;
}

// Get icon path for each type
function getTypeIconPath(type) {
    switch (type) {
        case 'person':
            return '<path d="M8 4a3 3 0 100 6 3 3 0 000-6zM8 12c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4z"/>';
        case 'pet':
            return '<path d="M4.5 3.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 7c-2.2 0-4 1.8-4 4 0 1.5.8 2.8 2 3.5V16h4v-1.5c1.2-.7 2-2 2-3.5 0-2.2-1.8-4-4-4z"/>';
        case 'document':
            return '<path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4H4zm5 0v4h4M5 9h6m-6 3h6"/>';
        case 'electronics':
            return '<path d="M5 2a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H5zm3 11a.5.5 0 100-1 .5.5 0 000 1z"/>';
        case 'vehicle':
            return '<path d="M3 6l1.5-3h7L13 6m-10 0h10v5H3V6zm1 6a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>';
        default:
            return '<path d="M8 2L2 5v6l6 3 6-3V5L8 2zm0 2l4 2-4 2-4-2 4-2zm-4 4l4 2v4l-4-2V8zm8 0v4l-4 2V10l4-2z"/>';
    }
}

export default function ReportsMap({ 
    reports = [], 
    onReportClick, 
    selectedReport: externalSelectedReport,
    height = '40vh',
    showControls = true,
    initialCenter = [31.7917, -7.0926], // Morocco center
    initialZoom = 6
}) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const markerClusterRef = useRef(null);
    const leafletRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    // Create popup content for a report
    const createPopupContent = useCallback((report) => {
        const isSighting = report.source === 'sighting';
        const name = getReportName(report);
        const statusColor = isSighting ? '#f97316' : '#3b82f6';
        const statusText = isSighting ? (locale === 'ar' ? 'مشاهدة' : 'Sighting') : (locale === 'ar' ? 'مفقود' : 'Missing');
        const location = report.city || (locale === 'ar' ? 'غير محدد' : 'Unknown');
        const photoUrl = report.photos && report.photos.length > 0 ? report.photos[0] : null;

        return `
            <div style="min-width: 200px; max-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
                ${photoUrl ? `
                    <div style="width: 100%; height: 120px; border-radius: 8px 8px 0 0; overflow: hidden; margin: -10px -10px 10px -10px; width: calc(100% + 20px);">
                        <img src="${photoUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;"/>
                    </div>
                ` : ''}
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; color: white; background: ${statusColor};">
                        <span style="width: 6px; height: 6px; background: white; border-radius: 50%;"></span>
                        ${statusText}
                    </span>
                    <span style="font-size: 11px; color: #6b7280; text-transform: capitalize;">${report.type || report.report_type || 'other'}</span>
                </div>
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #111827;">${name}</h3>
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    </svg>
                    ${location}
                </p>
                <button 
                    onclick="window.dispatchEvent(new CustomEvent('viewReportDetails', { detail: '${report.id}' }))"
                    style="width: 100%; padding: 8px 16px; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='0.9'"
                    onmouseout="this.style.opacity='1'"
                >
                    ${locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </button>
            </div>
        `;
    }, [locale]);

    // Get display name for a report
    function getReportName(report) {
        // Use title from API if available
        if (report.title) {
            return report.title;
        }
        
        const reportType = report.type || report.report_type || 'other';
        
        if (report.details) {
            if (reportType === 'person') {
                return `${report.details.first_name || ''} ${report.details.last_name || ''}`.trim() || (locale === 'ar' ? 'شخص' : 'Person');
            }
            if (reportType === 'pet') {
                return report.details.name || report.details.pet_name || (locale === 'ar' ? 'حيوان أليف' : 'Pet');
            }
            if (reportType === 'document') {
                return report.details.document_type || (locale === 'ar' ? 'وثيقة' : 'Document');
            }
            if (reportType === 'electronics') {
                return `${report.details.brand || ''} ${report.details.model || ''}`.trim() || (locale === 'ar' ? 'إلكترونيات' : 'Electronics');
            }
            if (reportType === 'vehicle') {
                return `${report.details.make || report.details.brand || ''} ${report.details.model || ''}`.trim() || (locale === 'ar' ? 'مركبة' : 'Vehicle');
            }
        }
        return locale === 'ar' ? 'غير معروف' : 'Unknown';
    }

    // Initialize map
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let L;
        let map;

        const initializeMap = async () => {
            try {
                // Import Leaflet
                L = (await import('leaflet')).default;
                await import('leaflet/dist/leaflet.css');
                
                // Import marker cluster
                await import('leaflet.markercluster/dist/MarkerCluster.css');
                await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
                await import('leaflet.markercluster');

                if (!mapContainerRef.current || mapRef.current) return;

                // Fix default marker icon issue
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                });

                // Initialize map
                map = L.map(mapContainerRef.current, {
                    center: initialCenter,
                    zoom: initialZoom,
                    zoomControl: showControls
                });

                mapRef.current = map;
                leafletRef.current = L;

                // Add tile layer
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }).addTo(map);

                // Create marker cluster group
                markerClusterRef.current = L.markerClusterGroup({
                    chunkedLoading: true,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    maxClusterRadius: 50,
                    iconCreateFunction: (cluster) => {
                        const count = cluster.getChildCount();
                        let size = 'small';
                        if (count > 10) size = 'medium';
                        if (count > 50) size = 'large';
                        
                        return L.divIcon({
                            html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
                            className: 'marker-cluster-custom',
                            iconSize: L.point(40, 40)
                        });
                    }
                });

                map.addLayer(markerClusterRef.current);

                setIsReady(true);

                // Ensure map renders correctly
                setTimeout(() => map.invalidateSize(), 100);

            } catch (error) {
                console.error('Map initialization error:', error);
            }
        };

        initializeMap();

        // Listen for view details events from popup
        const handleViewDetails = (e) => {
            const reportId = e.detail;
            const report = reports.find(r => r.id === reportId);
            if (report && onReportClick) {
                onReportClick(report);
            }
        };
        window.addEventListener('viewReportDetails', handleViewDetails);

        return () => {
            window.removeEventListener('viewReportDetails', handleViewDetails);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update markers when reports change
    useEffect(() => {
        if (!isReady || !mapRef.current || !leafletRef.current || !markerClusterRef.current) return;

        const L = leafletRef.current;
        const cluster = markerClusterRef.current;

        // Clear existing markers
        cluster.clearLayers();
        markersRef.current = [];

        // Add new markers
        reports.forEach(report => {
            if (!report.coordinates?.lat || !report.coordinates?.lng) return;

            const lat = parseFloat(report.coordinates.lat);
            const lng = parseFloat(report.coordinates.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            const isSighting = report.source === 'sighting';
            const reportType = report.type || report.report_type || 'other';
            const colors = markerColors[isSighting ? 'sighting' : 'missing'][reportType] || 
                          markerColors[isSighting ? 'sighting' : 'missing'].other;

            const icon = L.divIcon({
                className: 'custom-report-marker',
                html: createMarkerSvg(colors, reportType, isSighting),
                iconSize: [40, 52],
                iconAnchor: [20, 52],
                popupAnchor: [0, -52]
            });

            const marker = L.marker([lat, lng], { icon });
            marker.bindPopup(createPopupContent(report), {
                maxWidth: 300,
                className: 'report-popup'
            });

            marker.on('click', () => {
                setSelectedReport(report);
            });

            cluster.addLayer(marker);
            markersRef.current.push(marker);
        });

        // Fit bounds to show all markers if there are any
        if (markersRef.current.length > 0) {
            const group = L.featureGroup(markersRef.current);
            mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 12 });
        }

    }, [reports, isReady, createPopupContent]);

    // Handle external selected report (from Show on Map button)
    useEffect(() => {
        if (!externalSelectedReport || !isReady || !mapRef.current || !leafletRef.current) return;

        const lat = parseFloat(externalSelectedReport.coordinates?.lat);
        const lng = parseFloat(externalSelectedReport.coordinates?.lng);
        
        if (isNaN(lat) || isNaN(lng)) return;

        // Zoom to the selected report's location
        mapRef.current.flyTo([lat, lng], 15, {
            duration: 1.5
        });

        // Find and open the marker popup
        const marker = markersRef.current.find(m => {
            const pos = m.getLatLng();
            return Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001;
        });

        if (marker) {
            setTimeout(() => {
                marker.openPopup();
            }, 1600); // After fly animation
        }

        setSelectedReport(externalSelectedReport);
    }, [externalSelectedReport, isReady]);

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div 
                ref={mapContainerRef} 
                className="w-full z-0"
                style={{ height, background: '#e5e7eb' }}
            />
            
            {/* Loading State */}
            {!isReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('map.loading')}</span>
                </div>
            )}

            {/* Legend */}
            {isReady && showControls && (
                <div className={`absolute bottom-4 ${locale === 'ar' ? 'right-4' : 'left-4'} z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span className="text-gray-600 dark:text-gray-300">{t('filters.missing')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                            <span className="text-gray-600 dark:text-gray-300">{t('filters.sighting')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Report count */}
            {isReady && reports.length > 0 && (
                <div className={`absolute top-4 ${locale === 'ar' ? 'left-4' : 'right-4'} z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 border border-gray-200 dark:border-gray-700`}>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {reports.length} {locale === 'ar' ? 'بلاغ' : 'reports'}
                    </span>
                </div>
            )}

            {/* Custom styles */}
            <style jsx global>{`
                .custom-report-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .marker-cluster-custom {
                    background: transparent !important;
                }
                .cluster-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    font-weight: 600;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .cluster-small {
                    width: 36px;
                    height: 36px;
                    font-size: 12px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                }
                .cluster-medium {
                    width: 44px;
                    height: 44px;
                    font-size: 14px;
                    background: linear-gradient(135deg, #f97316, #ef4444);
                }
                .cluster-large {
                    width: 52px;
                    height: 52px;
                    font-size: 16px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                }
                .report-popup .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    padding: 0;
                    overflow: hidden;
                }
                .report-popup .leaflet-popup-content {
                    margin: 10px;
                }
                .report-popup .leaflet-popup-tip {
                    background: white;
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
                    background: #3b82f6 !important;
                    color: white !important;
                }
            `}</style>
        </div>
    );
}
