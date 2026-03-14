"use client"

import { useState } from "react";
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { Link } from "@/i18n/navigation";

const categories = ['general', 'reports', 'account', 'messaging', 'safety'];
const questionCounts = { general: 3, reports: 4, account: 3, messaging: 2, safety: 2 };

export default function FAQPage() {
    const t = useTranslations('faq');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const [openItem, setOpenItem] = useState(null);
    const [activeCategory, setActiveCategory] = useState('general');

    const toggleItem = (id) => {
        setOpenItem(openItem === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e]">
            <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 sm:pt-28 sm:pb-28" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => { setActiveCategory(cat); setOpenItem(null); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                activeCategory === cat
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {t(`categories.${cat}.title`)}
                        </button>
                    ))}
                </div>

                {/* FAQ Items */}
                <div className="space-y-3">
                    {Array.from({ length: questionCounts[activeCategory] }, (_, i) => {
                        const qKey = `q${i + 1}`;
                        const itemId = `${activeCategory}-${qKey}`;
                        const isOpen = openItem === itemId;

                        return (
                            <div
                                key={itemId}
                                className="bg-white dark:bg-gray-900 rounded-[6px] border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleItem(itemId)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <span className="font-medium text-gray-900 dark:text-white pr-4">
                                        {t(`categories.${activeCategory}.${qKey}.question`)}
                                    </span>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-5 pt-0">
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {t(`categories.${activeCategory}.${qKey}.answer`)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Contact CTA */}
                <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[6px] p-8 text-center text-white">
                    <h2 className="text-2xl font-bold mb-3">{t('contact.title')}</h2>
                    <p className="text-blue-100 mb-6">{t('contact.description')}</p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                        {t('contact.button')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
