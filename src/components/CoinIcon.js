"use client";

import { useState, useRef, useEffect } from "react";

// Global cache for resolved icon URLs to prevent refetching/flickering
const ICON_CACHE = new Map();

// Generate a deterministic color from a string
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export default function CoinIcon({ symbol, src, alt, className, width, height, ...props }) {
    const s = (symbol || "").toLowerCase();
    const S = (symbol || "").toUpperCase();

    // Prioritized list of sources to try
    const getSources = () => {
        const list = [];

        // 1. Explicit source passed availability
        if (src) list.push(src);

        // 2. GitHub Cryptocurrency Icons (High reliability)
        list.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${s}.png`);

        // 3. Atomic Wallet Icons (Alternative high quality source)
        list.push(`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e675fcd65c/128/color/${s}.png`);

        // 4. CoinCap Icons
        list.push(`https://assets.coincap.io/assets/icons/${s}@2x.png`);

        // 5. Generic Icon Service
        list.push(`https://icon-service.chain.link/${S}.png`);

        return list;
    };

    const sources = getSources();

    // Initialize state
    const [currentSrc, setCurrentSrc] = useState(() => {
        if (ICON_CACHE.has(S)) return ICON_CACHE.get(S);
        return sources[0];
    });

    const [failedAll, setFailedAll] = useState(false);
    const attemptRef = useRef(0);

    const handleError = () => {
        const nextIndex = attemptRef.current + 1;
        if (nextIndex < sources.length) {
            attemptRef.current = nextIndex;
            setCurrentSrc(sources[nextIndex]);
        } else {
            // All failed
            setFailedAll(true);
            // Cache the failure state (null) so we don't retry endlessly
            ICON_CACHE.set(S, null);
        }
    };

    const handleLoad = () => {
        if (!failedAll) {
            ICON_CACHE.set(S, currentSrc);
        }
    };

    // If symbol changes, reset
    useEffect(() => {
        const cached = ICON_CACHE.get(S);
        if (cached === null) {
            setFailedAll(true);
        } else if (cached) {
            setFailedAll(false);
            setCurrentSrc(cached);
            attemptRef.current = sources.length;
        } else {
            setFailedAll(false);
            attemptRef.current = 0;
            setCurrentSrc(sources[0]);
        }
    }, [S, src]);

    if (failedAll || !currentSrc) {
        // Fallback: Colored circle with initials
        const bgColor = stringToColor(S);
        // Ensure strictly 2 chars max
        const initials = S.substring(0, 2);

        return (
            <div
                className={`${className} flex items-center justify-center text-white font-bold text-xs`}
                style={{ backgroundColor: bgColor, width, height, minWidth: width, minHeight: height }}
                title={alt || symbol}
                {...props}
            >
                {initials}
            </div>
        );
    }

    return (
        <img
            src={currentSrc}
            alt={alt || symbol}
            className={`${className} bg-gray-100 dark:bg-zinc-800`} // Add background to image to handle transparent PNGs on dark mode
            width={width}
            height={height}
            onError={handleError}
            onLoad={handleLoad}
            {...props}
        />
    );
}
