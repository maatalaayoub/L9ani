"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";

const CryptoContext = createContext();

export function CryptoProvider({ children }) {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cache reference to avoid reloading if we already have data
    const dataFetchedRef = useRef(false);

    const fetchCoins = async () => {
        // If we already have data, don't set loading to true to avoid flicker
        if (!dataFetchedRef.current) {
            setLoading(true);
        }
        setError(null);

        try {
            // Fetching 100 coins with sparkline data, price changes, etc.
            // vs_currency: usd
            // order: market_cap_desc
            // per_page: 100
            // page: 1
            // sparkline: true
            // price_change_percentage: 1h,24h,7d
            const res = await fetch(
                "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=1h,24h,7d"
            );

            if (!res.ok) {
                throw new Error("Failed to fetch data from CoinGecko");
            }

            const data = await res.json();
            setCoins(data);
            dataFetchedRef.current = true;
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            if (loading) setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchCoins();

        // Poll every 60 seconds to respect public API rate limits (usually 10-30 req/min depending on load)
        const interval = setInterval(() => {
            fetchCoins();
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <CryptoContext.Provider value={{ coins, loading, error, refresh: fetchCoins }}>
            {children}
        </CryptoContext.Provider>
    );
}

export function useCrypto() {
    return useContext(CryptoContext);
}
