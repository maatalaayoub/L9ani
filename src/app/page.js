"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RootPage() {
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
