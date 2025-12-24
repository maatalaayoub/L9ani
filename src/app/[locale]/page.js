"use client";

import { Suspense } from 'react';
import { useAuth } from "@/context/AuthContext";
import LandingPage from "@/components/pages/LandingPage";
import ReportsHomePage from "@/components/pages/ReportsHomePage";

function HomePageContent() {
    const { user, loading } = useAuth();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0f1e]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // If user is logged in, show the reports homepage
    if (user) {
        return <ReportsHomePage />;
    }

    // If not logged in, show the landing page
    return <LandingPage />;
}

export default function HomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0f1e]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <HomePageContent />
        </Suspense>
    );
}
