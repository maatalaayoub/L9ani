"use client"

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "@/context/LanguageContext";
import { Link } from '@/i18n/navigation';
import LoginDialog from "@/components/LoginDialog";

export default function MyReport() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [loginDialogTab, setLoginDialogTab] = useState('login');
    const t = useTranslations('myreport');
    const tCommon = useTranslations('common');

    useEffect(() => {
        if (user) {
            fetchReports();
        }
    }, [user]);

    const fetchReports = async () => {
        try {
            // TODO: Replace with actual reports table query
            // const { data, error } = await supabase
            //     .from('missing_person_reports')
            //     .select('*')
            //     .eq('user_id', user.id)
            //     .order('created_at', { ascending: false });

            // if (error) throw error;
            // setReports(data || []);

            // Placeholder data for now
            setReports([]);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
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
                
                <LoginDialog 
                    isOpen={isLoginDialogOpen} 
                    onClose={() => setIsLoginDialogOpen(false)}
                    initialTab={loginDialogTab}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-28 sm:pb-28">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('subtitle')}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
                        <svg className="w-20 h-20 mx-auto text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {t('noReports.title')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            {t('noReports.description')}
                        </p>
                        <Link href="/report-missing" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                            </svg>
                            {t('noReports.button')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reports.map((report) => (
                            <div key={report.id} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-shadow">
                                <div className="aspect-square bg-gray-200 dark:bg-gray-800">
                                    {/* Report photo will go here */}
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {report.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        {t('reportedOn')} {new Date(report.created_at).toLocaleDateString()}
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                            {t('viewDetails')}
                                        </button>
                                        <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                            {t('edit')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
