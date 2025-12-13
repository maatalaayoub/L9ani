import './globals.css';

export const metadata = {
    title: 'Lqani.ma',
    description: 'Help reunite families through community-powered photo matching',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
