"use client";

import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { useAuth } from '@/context/AuthContext';
import ReportsMap from '@/components/ReportsMap';
import ReportsFeed from '@/components/ReportsFeed';
import ShareDialog from '@/components/ShareDialog';

export default function ReportsHomePage() {
    const t = useTranslations('reports');
    const tHome = useTranslations('home');
    const { locale } = useLanguage();
    const { user } = useAuth();
    const isRTL = locale === 'ar';

    // State
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedMapReport, setSelectedMapReport] = useState(null);
    
    // Share dialog state
    const [shareReport, setShareReport] = useState(null);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Fetch reports
    const fetchReports = useCallback(async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const limit = 20;
            const offset = (pageNum - 1) * limit;
            const response = await fetch(`/api/reports/public?limit=${limit}&offset=${offset}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }

            const data = await response.json();
            
            if (append) {
                setReports(prev => [...prev, ...data.reports]);
            } else {
                setReports(data.reports || []);
            }
            
            setHasMore(data.hasMore || false);
            setError(null);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchReports(1);
    }, [fetchReports]);

    // Load more handler
    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchReports(nextPage, true);
    };

    // Share handler
    const handleShare = (report) => {
        setShareReport(report);
        setIsShareOpen(true);
    };

    // Handle report click from map
    const handleReportClick = (report) => {
        // Navigate to report detail page
        window.location.href = `/${locale}/reports/${report.id}?source=${report.source}`;
    };

    // Handle show on map from card
    const handleShowOnMap = (report) => {
        setSelectedMapReport(report);
        // Scroll to map section
        const mapSection = document.querySelector('#map-section');
        if (mapSection) {
            mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] pt-16">
            {/* Hero Section with Quick Actions */}
            <section className="relative bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/10 dark:to-pink-600/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                {t('page.title')}
                            </h1>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">
                                {t('page.description')}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link 
                                href="/report-missing" 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                {tHome('hero.reportMissing')}
                            </Link>
                            <Link 
                                href="/report-sighting" 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:border-orange-500 dark:hover:border-orange-500 transition-all hover:-translate-y-0.5"
                            >
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {tHome('hero.reportSighting')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section id="map-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {t('map.title')}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {locale === 'ar' ? 'انقر على العلامة لعرض التفاصيل' : 'Click on a marker to view details'}
                    </span>
                </div>
                <ReportsMap 
                    reports={reports}
                    onReportClick={handleReportClick}
                    selectedReport={selectedMapReport}
                    height="45vh"
                />
            </section>

            {/* Reports Feed Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
                <ReportsFeed
                    reports={reports}
                    loading={loading}
                    error={error}
                    onShare={handleShare}
                    onShowOnMap={handleShowOnMap}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                />
            </section>

            {/* Share Dialog */}
            <ShareDialog
                isOpen={isShareOpen}
                onClose={() => {
                    setIsShareOpen(false);
                    setShareReport(null);
                }}
                report={shareReport}
            />
        </div>
    );
}
