"use client"

import { Link } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLanguage, useTranslations } from "@/context/LanguageContext";

export default function Settings() {
    const { theme, setTheme } = useTheme();
    const { locale, changeLocale } = useLanguage();
    const [mounted, setMounted] = useState(false);
    const t = useTranslations('settings');

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-300">
            <main className="max-w-4xl mx-auto p-6 pt-24 md:p-12 md:pt-28">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        {t('title')}
                    </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Appearance Section */}
                    <div className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {t('appearance.title')}
                            </h2>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                    {t('appearance.themePreference')}
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {['light', 'dark', 'system'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setTheme(mode)}
                                            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${theme === mode
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                                                : 'border-transparent bg-gray-50 dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'
                                                }`}
                                        >
                                            {theme === mode && (
                                                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                            )}
                                            <span className={`capitalize font-medium ${theme === mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {t(`appearance.themes.${mode}`)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                    {t('appearance.language')}
                                </label>
                                <div className="relative">
                                    <select
                                        value={locale}
                                        onChange={(e) => changeLocale(e.target.value)}
                                        className="w-full appearance-none ps-4 pe-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                                    >
                                        <option value="en">English (US)</option>
                                        <option value="ar">العربية (Arabic)</option>
                                    </select>
                                    <div className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {t('notifications.title')}
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            <div className="flex items-center justify-between py-4">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {t('notifications.sightingAlerts.title')}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('notifications.sightingAlerts.description')}
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-12 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600 shadow-inner"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between py-4">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {t('notifications.newDeviceLogin.title')}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('notifications.newDeviceLogin.description')}
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-12 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600 shadow-inner"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
