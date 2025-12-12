"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LanguageContext = createContext();

// Helper to get initial locale from path (runs synchronously)
function getInitialLocale(pathname) {
    if (typeof window !== 'undefined') {
        const pathLocale = pathname?.split('/')[1];
        if (pathLocale === 'en' || pathLocale === 'ar') {
            return pathLocale;
        }
        // Fallback to localStorage
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale === 'en' || savedLocale === 'ar') {
            return savedLocale;
        }
    }
    return 'en';
}

// Pre-load translations for both locales
const translationCache = {};

async function loadTranslationsForLocale(locale) {
    if (translationCache[locale]) {
        return translationCache[locale];
    }
    
    const [common, header, footer, about, contact, auth, myreport, profile, settings, home] = await Promise.all([
        import(`../../public/locales/${locale}/common.json`),
        import(`../../public/locales/${locale}/header.json`),
        import(`../../public/locales/${locale}/footer.json`),
        import(`../../public/locales/${locale}/about.json`),
        import(`../../public/locales/${locale}/contact.json`),
        import(`../../public/locales/${locale}/auth.json`),
        import(`../../public/locales/${locale}/myreport.json`),
        import(`../../public/locales/${locale}/profile.json`),
        import(`../../public/locales/${locale}/settings.json`),
        import(`../../public/locales/${locale}/home.json`),
    ]);

    const messages = {
        common: common.default,
        header: header.default,
        footer: footer.default,
        about: about.default,
        contact: contact.default,
        auth: auth.default,
        myreport: myreport.default,
        profile: profile.default,
        settings: settings.default,
        home: home.default,
    };
    
    translationCache[locale] = messages;
    return messages;
}

export function LanguageProvider({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    // Initialize locale from URL path immediately to prevent flash
    const [locale, setLocale] = useState(() => getInitialLocale(pathname));
    const [messages, setMessages] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [isChanging, setIsChanging] = useState(false);

    // Load translations
    useEffect(() => {
        const loadTranslations = async () => {
            try {
                const msgs = await loadTranslationsForLocale(locale);
                setMessages(msgs);
                setIsLoaded(true);
                
                // Pre-load the other locale in background
                const otherLocale = locale === 'en' ? 'ar' : 'en';
                loadTranslationsForLocale(otherLocale).catch(() => {});
            } catch (error) {
                console.error('Failed to load translations:', error);
                setIsLoaded(true);
            }
        };

        loadTranslations();
    }, [locale]);

    // Set document direction and lang immediately on locale change
    useEffect(() => {
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
    }, [locale]);

    // Sync locale from URL path on path changes (not on mount since we handle that in useState)
    useEffect(() => {
        const pathLocale = pathname?.split('/')[1];
        if (pathLocale && (pathLocale === 'en' || pathLocale === 'ar') && pathLocale !== locale) {
            setLocale(pathLocale);
            localStorage.setItem('locale', pathLocale);
        }
    }, [pathname, locale]);

    const changeLocale = useCallback(async (newLocale) => {
        if (newLocale === locale || isChanging) return;
        
        setIsChanging(true);
        
        // Mark that we're changing locale to disable transitions
        document.documentElement.setAttribute('data-changing-locale', 'true');
        
        // Pre-load translations before changing
        try {
            const newMessages = await loadTranslationsForLocale(newLocale);
            
            // Update direction first
            document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = newLocale;
            
            // Update state atomically
            setMessages(newMessages);
            setLocale(newLocale);
            localStorage.setItem('locale', newLocale);
            
            // Navigate using transition for smoother update
            startTransition(() => {
                if (pathname) {
                    const segments = pathname.split('/');
                    if (segments[1] === 'en' || segments[1] === 'ar') {
                        segments[1] = newLocale;
                    }
                    router.replace(segments.join('/') || `/${newLocale}`);
                }
            });
        } catch (error) {
            console.error('Failed to change locale:', error);
        } finally {
            // Remove the changing locale marker after a brief delay
            setTimeout(() => {
                document.documentElement.removeAttribute('data-changing-locale');
                setIsChanging(false);
            }, 150);
        }
    }, [locale, pathname, router, isChanging, startTransition]);

    const t = useCallback((namespace, key) => {
        if (!messages[namespace]) return '';

        const keys = key.split('.');
        let value = messages[namespace];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return '';
            }
        }

        return value || '';
    }, [messages]);

    // Don't render children until translations are loaded to prevent flash
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#101828]" />
        );
    }

    return (
        <LanguageContext.Provider value={{ locale, changeLocale, t, messages, isLoaded, isChanging }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Hook for translations
export function useTranslations(namespace) {
    const { t } = useLanguage();
    return (key) => t(namespace, key);
}
