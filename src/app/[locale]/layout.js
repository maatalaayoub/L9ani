import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { ThemeProvider } from 'next-themes';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import '../globals.css';

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

export const metadata = {
    title: 'Lqani.ma',
    description: 'Help reunite families through community-powered photo matching',
};

export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;
    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const fontClass = locale === 'ar' 
        ? `${tajawal.variable} ${geistSans.variable} ${geistMono.variable}` 
        : `${geistSans.variable} ${geistMono.variable}`;

    return (
        <html lang={locale} dir={dir} className={fontClass} suppressHydrationWarning>
            <head>
                {/* Inline script to set direction immediately to prevent flash */}
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
            </head>
            <body className="antialiased">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <NextIntlClientProvider messages={messages}>
                        <LanguageProvider>
                            <AuthProvider>
                                <ScrollToTop />
                                <Header />
                                <main>{children}</main>
                                <Footer />
                            </AuthProvider>
                        </LanguageProvider>
                    </NextIntlClientProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
