"use client"

import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';

export default function LanguageSwitcher() {
    const { locale, changeLocale, isChanging } = useLanguage();
    const { setLanguage } = useSettings();
    const { user } = useAuth();

    const handleLanguageChange = async () => {
        if (isChanging) return;
        const newLocale = locale === 'en' ? 'ar' : 'en';
        
        // If user is logged in, use setLanguage to save to database
        // Otherwise, just change the locale locally
        if (user) {
            await setLanguage(newLocale);
        } else {
            changeLocale(newLocale);
        }
    };

    return (
        <button
            onClick={handleLanguageChange}
            disabled={isChanging}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${isChanging ? 'opacity-50 cursor-wait' : ''}`}
            aria-label="Switch language"
        >
            <svg className={`w-4 h-4 ${isChanging ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span className="hidden sm:inline">{locale === 'en' ? 'العربية' : 'English'}</span>
            <span className="sm:hidden">{locale === 'en' ? 'AR' : 'EN'}</span>
        </button>
    );
}
