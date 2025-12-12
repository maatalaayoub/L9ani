"use client"

import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { Link } from "@/i18n/navigation";

export default function About() {
    const t = useTranslations('about');
    const { locale } = useLanguage();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e]">
            <div className="max-w-5xl mx-auto px-6 py-20 sm:py-28">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        {t('hero.title')}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
                        {t('hero.subtitle')}
                    </p>
                </div>

                <div className="space-y-12">
                    {/* Mission Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 sm:p-10 border border-gray-200 dark:border-gray-800 shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{t('mission.title')}</h2>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                            {t('mission.description')}
                        </p>
                    </div>

                    {/* How It Works */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 sm:p-10 border border-gray-200 dark:border-gray-800 shadow-xl">
                        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-8">{t('howItWorks.title')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('howItWorks.step1.title')}</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {t('howItWorks.step1.description')}
                                </p>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('howItWorks.step2.title')}</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {t('howItWorks.step2.description')}
                                </p>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('howItWorks.step3.title')}</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {t('howItWorks.step3.description')}
                                </p>
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('howItWorks.step4.title')}</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {t('howItWorks.step4.description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Our Values */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 sm:p-10 border border-gray-200 dark:border-gray-800 shadow-xl">
                        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-8">{t('values.title')}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('values.privacy.title')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('values.privacy.description')}
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('values.community.title')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('values.community.description')}
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('values.compassion.title')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('values.compassion.description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 sm:p-10 text-center text-white shadow-2xl">
                        <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
                        <p className="text-lg mb-8 opacity-90">
                            {t('cta.description')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/" className="px-8 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-colors shadow-lg">
                                {t('cta.button')}
                            </Link>
                            <Link href="/contact" className="px-8 py-3 bg-blue-700 text-white rounded-full font-semibold hover:bg-blue-800 transition-colors border-2 border-white/20">
                                {locale === 'ar' ? 'اتصل بنا' : 'Contact Us'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
