"use client";

import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import LoginDialog from "@/components/LoginDialog";

// Custom hook for scroll animations using Intersection Observer
function useScrollAnimation(options = {}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(element); // Only animate once
                }
            },
            {
                threshold: options.threshold || 0.1,
                rootMargin: options.rootMargin || '0px 0px -50px 0px',
            }
        );

        observer.observe(element);

        return () => {
            if (element) observer.unobserve(element);
        };
    }, [options.threshold, options.rootMargin]);

    return [ref, isVisible];
}

// Animation variants
const animations = {
    fadeUp: (isVisible) => ({
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    }),
    fadeDown: (isVisible) => ({
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-40px)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    }),
    fadeLeft: (isVisible, isRTL) => ({
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : `translateX(${isRTL ? '-60px' : '60px'})`,
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    }),
    fadeRight: (isVisible, isRTL) => ({
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : `translateX(${isRTL ? '60px' : '-60px'})`,
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    }),
    scale: (isVisible) => ({
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    }),
    staggerChild: (isVisible, delay = 0) => ({
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }),
};

function HomePageContent() {
    const t = useTranslations('home');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const searchParams = useSearchParams();

    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [initialTab, setInitialTab] = useState('login');

    // Animation refs for each section
    const [heroRef, heroVisible] = useScrollAnimation({ threshold: 0.1 });
    const [badgeRef, badgeVisible] = useScrollAnimation({ threshold: 0.1 });
    const [statsRef, statsVisible] = useScrollAnimation({ threshold: 0.2 });
    const [howItWorksHeaderRef, howItWorksHeaderVisible] = useScrollAnimation({ threshold: 0.2 });
    const [step1Ref, step1Visible] = useScrollAnimation({ threshold: 0.2 });
    const [step2Ref, step2Visible] = useScrollAnimation({ threshold: 0.2 });
    const [step3Ref, step3Visible] = useScrollAnimation({ threshold: 0.2 });
    const [featuresHeaderRef, featuresHeaderVisible] = useScrollAnimation({ threshold: 0.2 });
    const [featuresContentRef, featuresContentVisible] = useScrollAnimation({ threshold: 0.15 });
    const [featuresIllustrationRef, featuresIllustrationVisible] = useScrollAnimation({ threshold: 0.15 });
    const [impactHeaderRef, impactHeaderVisible] = useScrollAnimation({ threshold: 0.2 });
    const [testimonial1Ref, testimonial1Visible] = useScrollAnimation({ threshold: 0.2 });
    const [testimonial2Ref, testimonial2Visible] = useScrollAnimation({ threshold: 0.2 });
    const [testimonial3Ref, testimonial3Visible] = useScrollAnimation({ threshold: 0.2 });
    const [ctaRef, ctaVisible] = useScrollAnimation({ threshold: 0.2 });
    const [trustRef, trustVisible] = useScrollAnimation({ threshold: 0.3 });

    // Handle URL parameters for login/signup
    useEffect(() => {
        if (searchParams.get('login') === 'true') {
            setInitialTab('login');
            setIsLoginDialogOpen(true);
        } else if (searchParams.get('signup') === 'true') {
            setInitialTab('signup');
            setIsLoginDialogOpen(true);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] overflow-hidden">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/10 dark:to-pink-600/20"></div>
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
                    <div className="text-center max-w-4xl mx-auto" ref={heroRef}>
                        {/* Badge */}
                        <div
                            ref={badgeRef}
                            style={animations.fadeDown(badgeVisible)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-8"
                        >
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('hero.badge')}</span>
                        </div>

                        <h1
                            style={animations.fadeUp(heroVisible)}
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
                        >
                            {t('hero.title')}
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                {t('hero.titleHighlight')}
                            </span>
                        </h1>
                        <p
                            style={{ ...animations.fadeUp(heroVisible), transitionDelay: '0.1s' }}
                            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
                        >
                            {t('hero.subtitle')}
                        </p>

                        {/* CTA Buttons */}
                        <div
                            style={{ ...animations.fadeUp(heroVisible), transitionDelay: '0.2s' }}
                            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
                        >
                            <Link href="/report-missing" className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                {t('hero.reportMissing')}
                            </Link>
                            <Link href="/report-sighting" className="group px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t('hero.reportSighting')}
                            </Link>
                        </div>

                        {/* Stats */}
                        <div
                            ref={statsRef}
                            style={animations.fadeUp(statsVisible)}
                            className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
                        >
                            <div className="text-center" style={animations.staggerChild(statsVisible, 0)}>
                                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">2K+</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('stats.families')}</div>
                            </div>
                            <div className="text-center border-x border-gray-200 dark:border-gray-700" style={animations.staggerChild(statsVisible, 0.1)}>
                                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">15K+</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('stats.photos')}</div>
                            </div>
                            <div className="text-center" style={animations.staggerChild(statsVisible, 0.2)}>
                                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">500+</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('stats.matches')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-white dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div
                        ref={howItWorksHeaderRef}
                        style={animations.fadeUp(howItWorksHeaderVisible)}
                        className="text-center mb-16"
                    >
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">{t('howItWorks.label')}</span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
                            {t('howItWorks.title')}
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {t('howItWorks.subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Step 1 */}
                        <div
                            ref={step1Ref}
                            style={animations.staggerChild(step1Visible, 0)}
                            className="relative group"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-500"></div>
                            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 h-full">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                                    <span className="text-2xl font-bold text-white">1</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    {t('howItWorks.step1.title')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {t('howItWorks.step1.description')}
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div
                            ref={step2Ref}
                            style={animations.staggerChild(step2Visible, 0.15)}
                            className="relative group"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-500"></div>
                            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 h-full">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                                    <span className="text-2xl font-bold text-white">2</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    {t('howItWorks.step2.title')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {t('howItWorks.step2.description')}
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div
                            ref={step3Ref}
                            style={animations.staggerChild(step3Visible, 0.3)}
                            className="relative group"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-500"></div>
                            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 h-full">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                                    <span className="text-2xl font-bold text-white">3</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    {t('howItWorks.step3.title')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {t('howItWorks.step3.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left Content */}
                        <div
                            ref={featuresContentRef}
                            style={animations.fadeRight(featuresContentVisible, isRTL)}
                            className={isRTL ? 'order-2' : ''}
                        >
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">{t('features.label')}</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-6">
                                {t('features.title')}
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                                {t('features.subtitle')}
                            </p>

                            <div className="space-y-6">
                                {/* Feature 1 */}
                                <div className="flex gap-4" style={animations.staggerChild(featuresContentVisible, 0.1)}>
                                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('features.feature1.title')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{t('features.feature1.description')}</p>
                                    </div>
                                </div>

                                {/* Feature 2 */}
                                <div className="flex gap-4" style={animations.staggerChild(featuresContentVisible, 0.2)}>
                                    <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('features.feature2.title')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{t('features.feature2.description')}</p>
                                    </div>
                                </div>

                                {/* Feature 3 */}
                                <div className="flex gap-4" style={animations.staggerChild(featuresContentVisible, 0.3)}>
                                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('features.feature3.title')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{t('features.feature3.description')}</p>
                                    </div>
                                </div>

                                {/* Feature 4 */}
                                <div className="flex gap-4" style={animations.staggerChild(featuresContentVisible, 0.4)}>
                                    <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('features.feature4.title')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{t('features.feature4.description')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right - Illustration */}
                        <div
                            ref={featuresIllustrationRef}
                            style={animations.fadeLeft(featuresIllustrationVisible, isRTL)}
                            className={`relative ${isRTL ? 'order-1' : ''}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-20"></div>
                            <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 sm:p-12">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center" style={animations.scale(featuresIllustrationVisible)}>
                                        <div className="text-4xl mb-2">🔍</div>
                                        <div className="text-white font-semibold">{t('features.card1')}</div>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center" style={{ ...animations.scale(featuresIllustrationVisible), transitionDelay: '0.1s' }}>
                                        <div className="text-4xl mb-2">🤖</div>
                                        <div className="text-white font-semibold">{t('features.card2')}</div>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center" style={{ ...animations.scale(featuresIllustrationVisible), transitionDelay: '0.2s' }}>
                                        <div className="text-4xl mb-2">📍</div>
                                        <div className="text-white font-semibold">{t('features.card3')}</div>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center" style={{ ...animations.scale(featuresIllustrationVisible), transitionDelay: '0.3s' }}>
                                        <div className="text-4xl mb-2">💝</div>
                                        <div className="text-white font-semibold">{t('features.card4')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials / Impact Section */}
            <section className="py-20 bg-white dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div
                        ref={impactHeaderRef}
                        style={animations.fadeUp(impactHeaderVisible)}
                        className="text-center mb-16"
                    >
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">{t('impact.label')}</span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
                            {t('impact.title')}
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {t('impact.subtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Testimonial 1 */}
                        <div
                            ref={testimonial1Ref}
                            style={animations.staggerChild(testimonial1Visible, 0)}
                            className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8"
                        >
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{t('impact.testimonial1.quote')}"</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {t('impact.testimonial1.initial')}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{t('impact.testimonial1.name')}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('impact.testimonial1.location')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div
                            ref={testimonial2Ref}
                            style={animations.staggerChild(testimonial2Visible, 0.15)}
                            className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8"
                        >
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{t('impact.testimonial2.quote')}"</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {t('impact.testimonial2.initial')}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{t('impact.testimonial2.name')}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('impact.testimonial2.location')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 3 */}
                        <div
                            ref={testimonial3Ref}
                            style={animations.staggerChild(testimonial3Visible, 0.3)}
                            className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8"
                        >
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{t('impact.testimonial3.quote')}"</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {t('impact.testimonial3.initial')}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{t('impact.testimonial3.name')}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('impact.testimonial3.location')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div
                        ref={ctaRef}
                        style={animations.scale(ctaVisible)}
                        className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 sm:p-16 text-center"
                    >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                        <div className="relative">
                            <h2
                                style={animations.fadeUp(ctaVisible)}
                                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                            >
                                {t('cta.title')}
                            </h2>
                            <p
                                style={{ ...animations.fadeUp(ctaVisible), transitionDelay: '0.1s' }}
                                className="text-lg text-white/90 mb-8 max-w-2xl mx-auto"
                            >
                                {t('cta.description')}
                            </p>
                            <div
                                style={{ ...animations.fadeUp(ctaVisible), transitionDelay: '0.2s' }}
                                className="flex flex-col sm:flex-row gap-4 justify-center"
                            >
                                <Link href="/report-missing" className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    {t('cta.button1')}
                                </Link>
                                <Link href="/report-sighting" className="px-8 py-4 bg-white/20 text-white border-2 border-white/30 rounded-xl font-semibold text-lg hover:bg-white/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    {t('cta.button2')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="py-12 border-t border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div
                        ref={trustRef}
                        style={animations.fadeUp(trustVisible)}
                        className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-gray-400 dark:text-gray-500"
                    >
                        <div className="flex items-center gap-2" style={animations.staggerChild(trustVisible, 0)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-sm font-medium">{t('trust.secure')}</span>
                        </div>
                        <div className="flex items-center gap-2" style={animations.staggerChild(trustVisible, 0.1)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-sm font-medium">{t('trust.private')}</span>
                        </div>
                        <div className="flex items-center gap-2" style={animations.staggerChild(trustVisible, 0.2)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm font-medium">{t('trust.support')}</span>
                        </div>
                        <div className="flex items-center gap-2" style={animations.staggerChild(trustVisible, 0.3)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">{t('trust.fast')}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Login Dialog */}
            <LoginDialog
                isOpen={isLoginDialogOpen}
                onClose={() => setIsLoginDialogOpen(false)}
                initialTab={initialTab}
            />
        </div>
    );
}

export default function HomePage() {
    return (
        <Suspense fallback={null}>
            <HomePageContent />
        </Suspense>
    );
}
