"use client"

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "@/context/LanguageContext";

export default function Contact() {
    const t = useTranslations('contact');
    const tCommon = useTranslations('common');
    
    const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const subjectDropdownRef = useRef(null);

    const subjects = [
        { id: 'reportMissing', label: t('form.subjects.reportMissing') },
        { id: 'reportSighting', label: t('form.subjects.reportSighting') },
        { id: 'techSupport', label: t('form.subjects.techSupport') },
        { id: 'general', label: t('form.subjects.general') },
        { id: 'partnership', label: t('form.subjects.partnership') },
    ];

    // Set default selection
    useEffect(() => {
        if (!selectedSubject) {
            setSelectedSubject(subjects[0]);
        }
    }, [subjects, selectedSubject]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
                setIsSubjectDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#101828] dark:to-[#0a0f1e] pt-24 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Contact Form */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('form.title')}</h2>

                        <form className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {tCommon('labels.name')}
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#101828] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder={tCommon('labels.name')}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {tCommon('labels.email')}
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#101828] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {tCommon('labels.subject')}
                                </label>
                                <div className="relative" ref={subjectDropdownRef}>
                                    {/* Custom Dropdown Button */}
                                    <button
                                        type="button"
                                        onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#101828] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
                                    >
                                        <span className="text-base">
                                            {selectedSubject?.label || subjects[0]?.label}
                                        </span>
                                        <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isSubjectDropdownOpen && (
                                        <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                                            {subjects.map((subject) => (
                                                <button
                                                    key={subject.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSubject(subject);
                                                        setIsSubjectDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center px-4 py-3.5 text-start text-base transition-colors ${
                                                        selectedSubject?.id === subject.id
                                                            ? 'bg-blue-500 text-white'
                                                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                                >
                                                    {subject.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {tCommon('labels.message')}
                                </label>
                                <textarea
                                    id="message"
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#101828] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                                    placeholder={t('form.messagePlaceholder')}
                                ></textarea>
                            </div>

                            <button
                                type="button"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
                            >
                                {t('form.submitButton')}
                            </button>
                        </form>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-6">
                        {/* Emergency Notice */}
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <h3 className="font-bold text-red-900 dark:text-red-300 mb-2">{t('emergency.title')}</h3>
                                    <p className="text-sm text-red-800 dark:text-red-400">
                                        {t('emergency.description')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Methods */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('otherWays.title')}</h3>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('otherWays.email')}</p>
                                        <a href="mailto:support@lqani.ma" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                            support@lqani.ma
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('otherWays.hotline')}</p>
                                        <a href="tel:+1-800-FIND-HELP" className="text-green-600 dark:text-green-400 hover:underline font-medium">
                                            0512345678
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('otherWays.liveChat')}</p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                                            {t('otherWays.availability')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQ Link */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                            <h3 className="text-lg font-bold mb-2">{t('faq.title')}</h3>
                            <p className="text-sm mb-4 opacity-90">
                                {t('faq.description')}
                            </p>
                            <a href="/about" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition">
                                {t('faq.button')}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
