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
import localFont from 'next/font/local';

// Use local Geist fonts to avoid network dependency on Google Fonts
const geistSans = localFont({
    src: [
        {
            path: '../../../public/fonts/GeistVF.woff2',
            style: 'normal',
        },
    ],
    variable: '--font-geist-sans',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const geistMono = localFont({
    src: [
        {
            path: '../../../public/fonts/GeistMonoVF.woff2',
            style: 'normal',
        },
    ],
    variable: '--font-geist-mono',
    display: 'swap',
    fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
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
    display: 'swap',
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
    
    // For Arabic, use Tajawal font class; for English, use Geist font class
    // We include all font variables but apply the appropriate className
    const fontVariables = `${tajawal.variable} ${geistSans.variable} ${geistMono.variable}`;
    const fontClassName = locale === 'ar' ? tajawal.className : geistSans.className;

    return (
        <div lang={locale} dir={dir} className={`${fontVariables} ${fontClassName}`}>
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
