"use client"

import { Link } from "@/i18n/navigation";
import { useTranslations } from "@/context/LanguageContext";

export default function PrivacyPolicy() {
    const t = useTranslations('privacy');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-300">
            <main className="max-w-4xl mx-auto p-6 pt-24 md:p-12 md:pt-28 pb-20">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('lastUpdated')}
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {/* Introduction */}
                    <section className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('sections.introduction.title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {t('sections.introduction.content')}
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('sections.dataCollection.title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            {t('sections.dataCollection.content')}
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                            <li>{t('sections.dataCollection.items.personal')}</li>
                            <li>{t('sections.dataCollection.items.photos')}</li>
                            <li>{t('sections.dataCollection.items.device')}</li>
                            <li>{t('sections.dataCollection.items.usage')}</li>
                        </ul>
                    </section>

                    {/* How We Use Your Information */}
                    <section className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('sections.dataUsage.title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            {t('sections.dataUsage.content')}
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                            <li>{t('sections.dataUsage.items.matching')}</li>
                            <li>{t('sections.dataUsage.items.communication')}</li>
                            <li>{t('sections.dataUsage.items.improvement')}</li>
                            <li>{t('sections.dataUsage.items.security')}</li>
                        </ul>
                    </section>

                    {/* Data Protection */}
                    <section className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('sections.dataProtection.title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {t('sections.dataProtection.content')}
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('sections.yourRights.title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            {t('sections.yourRights.content')}
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                            <li>{t('sections.yourRights.items.access')}</li>
                            <li>{t('sections.yourRights.items.correction')}</li>
                            <li>{t('sections.yourRights.items.deletion')}</li>
                            <li>{t('sections.yourRights.items.portability')}</li>
                        </ul>
                    </section>

                    {/* Contact */}
                    <section className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('sections.contact.title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            {t('sections.contact.content')}
                        </p>
                        <Link 
                            href="/contact" 
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {t('sections.contact.button')}
                        </Link>
                    </section>
                </div>
            </main>
        </div>
    );
}
