"use client";

import { useState, useMemo } from 'react';
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import ReportCard from './ReportCard';
import { moroccanCities } from '@/data/moroccanCities';

export default function ReportsFeed({ 
    reports = [], 
    loading = false, 
    error = null,
    onShare,
    onShowOnMap,
    onLoadMore,
    hasMore = false,
    loadingMore = false
}) {
    const t = useTranslations('reports');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';

    // Filter states
    const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'missing', 'sighting'
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'person', 'pet', etc.
    const [cityFilter, setCityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest'

    // Get unique cities from reports
    const availableCities = useMemo(() => {
        const cities = new Set();
        reports.forEach(r => {
            if (r.city) cities.add(r.city);
        });
        return Array.from(cities).sort();
    }, [reports]);

    // Filter and sort reports
    const filteredReports = useMemo(() => {
        let result = [...reports];

        // Filter by source
        if (sourceFilter !== 'all') {
            result = result.filter(r => r.source === sourceFilter);
        }

        // Filter by type - support both 'type' and 'report_type' field names
        if (typeFilter !== 'all') {
            result = result.filter(r => (r.type || r.report_type) === typeFilter);
        }

        // Filter by city
        if (cityFilter !== 'all') {
            result = result.filter(r => r.city === cityFilter);
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [reports, sourceFilter, typeFilter, cityFilter, sortBy]);

    // Reset filters
    const resetFilters = () => {
        setSourceFilter('all');
        setTypeFilter('all');
        setCityFilter('all');
        setSortBy('newest');
    };

    const hasActiveFilters = sourceFilter !== 'all' || typeFilter !== 'all' || cityFilter !== 'all';

    // Report types for filter
    const reportTypes = [
        { value: 'all', label: t('filters.all') },
        { value: 'person', label: t('filters.person') },
        { value: 'pet', label: t('filters.pet') },
        { value: 'document', label: t('filters.document') },
        { value: 'electronics', label: t('filters.electronics') },
        { value: 'vehicle', label: t('filters.vehicle') },
        { value: 'other', label: t('filters.other') }
    ];

    return (
        <div className="w-full">
            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Source Filter (Missing/Sighting) */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setSourceFilter('all')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                sourceFilter === 'all'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {t('filters.all')}
                        </button>
                        <button
                            onClick={() => setSourceFilter('missing')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                sourceFilter === 'missing'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {t('filters.missing')}
                        </button>
                        <button
                            onClick={() => setSourceFilter('sighting')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                sourceFilter === 'sighting'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {t('filters.sighting')}
                        </button>
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[120px]"
                    >
                        {reportTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>

                    {/* City Filter */}
                    <select
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[120px]"
                    >
                        <option value="all">{t('filters.allCities')}</option>
                        {availableCities.map(city => (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[100px]"
                    >
                        <option value="newest">{t('filters.newest')}</option>
                        <option value="oldest">{t('filters.oldest')}</option>
                    </select>

                    {/* Reset Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t('empty.resetFilters')}
                        </button>
                    )}

                    {/* Results count */}
                    <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} text-sm text-gray-500 dark:text-gray-400`}>
                        {filteredReports.length} {locale === 'ar' ? 'نتيجة' : 'results'}
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <span className="text-gray-500 dark:text-gray-400">{t('loading.reports')}</span>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {t('errors.loadFailed')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('errors.tryAgain')}
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredReports.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {t('empty.title')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                        {t('empty.description')}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t('empty.resetFilters')}
                        </button>
                    )}
                </div>
            )}

            {/* Reports Feed - Single Column Layout */}
            {!loading && !error && filteredReports.length > 0 && (
                <>
                    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                        {filteredReports.map(report => (
                            <ReportCard
                                key={`${report.source}-${report.id}`}
                                report={report}
                                onShare={onShare}
                                onShowOnMap={onShowOnMap}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={onLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                        {t('loading.more')}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {locale === 'ar' ? 'تحميل المزيد' : 'Load More'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
