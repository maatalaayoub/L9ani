"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RootPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Preserve query parameters (especially OAuth code) when redirecting
        const queryString = searchParams.toString();
        const redirectUrl = queryString ? `/en?${queryString}` : '/en';
        router.replace(redirectUrl);
    }, [router, searchParams]);

    return null;
}

export default function RootPage() {
    return (
        <Suspense fallback={null}>
            <RootPageContent />
        </Suspense>
    );
}
