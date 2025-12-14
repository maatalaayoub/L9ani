import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SettingsProvider } from '@/context/SettingsContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import TermsDialogWrapper from '@/components/TermsDialogWrapper';
import { ThemeProvider } from 'next-themes';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

const tajawal = localFont({
    src: [
        {
            path: '../../../public/fonts/Tajawal-ExtraLight.ttf',
            weight: '200',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/Tajawal-Light.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/Tajawal-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/Tajawal-Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/Tajawal-Bold.ttf',
            weight: '700',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/Tajawal-ExtraBold.ttf',
            weight: '800',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/Tajawal-Black.ttf',
            weight: '900',
            style: 'normal',
        },
    ],
    variable: '--font-tajawal',
});

export async function generateMetadata({ params }) {
    const { locale } = await params;
    return {
        title: 'Lqani.ma',
        description: 'Help reunite families through community-powered photo matching',
    };
}

export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;
    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const fontClass = `${tajawal.variable} ${geistSans.variable} ${geistMono.variable}`;
    
    // Apply the appropriate font family class based on locale
    const fontFamilyClass = locale === 'ar' ? 'font-arabic' : 'font-sans';

    return (
        <div lang={locale} dir={dir} className={`${fontClass} ${fontFamilyClass}`}>
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            var path = window.location.pathname;
                            var locale = path.split('/')[1];
                            if (locale === 'ar') {
                                document.documentElement.dir = 'rtl';
                                document.documentElement.lang = 'ar';
                            } else {
                                document.documentElement.dir = 'ltr';
                                document.documentElement.lang = 'en';
                            }
                        })();
                    `,
                }}
            />
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <NextIntlClientProvider messages={messages}>
                    <LanguageProvider>
                        <AuthProvider>
                            <SettingsProvider>
                                <ScrollToTop />
                                <Header />
                                <main>{children}</main>
                                <Footer />
                                <TermsDialogWrapper />
                            </SettingsProvider>
                        </AuthProvider>
                    </LanguageProvider>
                </NextIntlClientProvider>
            </ThemeProvider>
        </div>
    );
}
