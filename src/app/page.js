"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkline, SparklineUp, SparklineDown, SparklineNeutral } from "../components/Sparklines";

export default function Home() {
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination / display controls
  const [perPage, setPerPage] = useState(100); // default 100 per list
  const [page, setPage] = useState(1);

  // Ref to store static metadata (logo, market cap, percent fields) so it persists between re-renders without triggering effects
  const staticMapRef = useRef(null);
  // Keep a stable order by popularity (symbol array) so re-renders don't reorder rows
  const orderRef = useRef(null);
  // transient price flash state: { [symbol]: 'up'|'down' }
  const [priceFlash, setPriceFlash] = useState({});
  const flashTimersRef = useRef({});

  // sparklines cache: { [pair]: [numbers] }
  const [sparklines, setSparklines] = useState({});

  useEffect(() => {
    let cancelled = false;

    const STATIC_KEY = 'coinStatic_v1';
    const STATIC_TTL_MS = 1000 * 60 * 60 * 24; // 24h

    // load static metadata from localStorage if present
    const loadStaticCache = () => {
      try {
        const raw = localStorage.getItem(STATIC_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.ts && Date.now() - parsed.ts < STATIC_TTL_MS && parsed.map) {
          return parsed.map;
        }
      } catch (e) {
        // ignore
      }
      return null;
    };

    const saveStaticCache = (map) => {
      try {
        localStorage.setItem(STATIC_KEY, JSON.stringify({ ts: Date.now(), map }));
      } catch (e) {
        // ignore
      }
    };

    const fetchStaticFromCoinGecko = async () => {
      // Fetch top 500 coins from CoinGecko markets endpoint (2 pages of 250)
      try {
        const pages = [1, 2];
        const acc = {};
        for (const page of pages) {
          const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=1h,24h,7d`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const list = await res.json();
          for (const c of list) {
            if (!c.symbol) continue;
            acc[c.symbol.toUpperCase()] = {
              id: c.id,
              name: c.name,
              image: c.image,
              marketCap: c.market_cap || null,
              price: c.current_price || null,
              change1h: c.price_change_percentage_1h_in_currency ?? null,
              change24h: c.price_change_percentage_24h_in_currency ?? null,
              change7d: c.price_change_percentage_7d_in_currency ?? null,
            };
          }
        }
        return acc;
      } catch (err) {
        return null;
      }
    };

    const fetchTickers = async () => {
      setError(null);

      // First, try to populate tickers using cached static data so UI isn't blank
      const cachedStatic = loadStaticCache();
      if (cachedStatic && Object.keys(cachedStatic).length > 0) {
        staticMapRef.current = cachedStatic;
        // Create an initial stub list from static keys (we'll merge live prices shortly)
        const stub = Object.keys(cachedStatic).map((symbol, idx) => ({
          id: idx + 1,
          name: cachedStatic[symbol].name || symbol,
          symbol,
          pair: `${symbol}USDT`,
          price: '—',
          priceRaw: 0,
          h1: cachedStatic[symbol].change1h != null ? `${cachedStatic[symbol].change1h >= 0 ? '+' : ''}${cachedStatic[symbol].change1h.toFixed(2)}%` : '—',
          h24: cachedStatic[symbol].change24h != null ? `${cachedStatic[symbol].change24h >= 0 ? '+' : ''}${cachedStatic[symbol].change24h.toFixed(2)}%` : '—',
          d7: cachedStatic[symbol].change7d != null ? `${cachedStatic[symbol].change7d >= 0 ? '+' : ''}${cachedStatic[symbol].change7d.toFixed(2)}%` : '—',
          volume: '—',
          marketCap: cachedStatic[symbol].marketCap != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cachedStatic[symbol].marketCap) : '—',
          image: cachedStatic[symbol].image || null,
          isUp: true,
          trend: 'neutral',
        }));
        if (!cancelled) {
          setTickers(stub.slice(0, 300)); // show up to 300 until we get live order
        }
      }

      setLoading(true);
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        const data = await res.json();

        const usdt = data.filter(t => typeof t.symbol === 'string' && t.symbol.endsWith('USDT') && !t.symbol.includes('DOWN') && !t.symbol.includes('UP'));
        const map = new Map();
        for (const t of usdt) {
          const base = t.symbol.replace(/USDT$/i, '');
          const existing = map.get(base);
          if (!existing || parseFloat(t.quoteVolume) > parseFloat(existing.quoteVolume)) {
            map.set(base, t);
          }
        }

        // If we don't have static metadata, try to fetch from CoinGecko and cache it
        if (!staticMapRef.current) {
          const staticData = await fetchStaticFromCoinGecko();
          if (staticData) {
            staticMapRef.current = staticData;
            saveStaticCache(staticData);
          }
        }

        // Build a map for new incoming data, keep numeric fields for sorting
        const newMap = new Map();
        for (const [base, t] of Array.from(map.entries())) {
          const price = parseFloat(t.lastPrice || 0);
          const change24 = parseFloat(t.priceChangePercent || 0);
          const volumeRaw = parseFloat(t.quoteVolume || 0);

          const staticMeta = staticMapRef.current ? staticMapRef.current[base.toUpperCase()] : null;
          const change1h = staticMeta?.change1h ?? null;
          const change7d = staticMeta?.change7d ?? null;

          newMap.set(base, {
            symbol: base,
            pair: t.symbol,
            priceRaw: price,
            price: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price),
            h24: `${change24 >= 0 ? '+' : ''}${change24.toFixed(2)}%`,
            d7: change7d != null ? `${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}%` : '—',
            h1: change1h != null ? `${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%` : '—',
            volumeRaw,
            volume: new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(volumeRaw),
            marketCapRaw: staticMeta?.marketCap ?? null,
            marketCap: staticMeta?.marketCap != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(staticMeta.marketCap) : '—',
            image: staticMeta?.image || null,
            name: staticMeta?.name || base,
            isUp: change24 >= 0,
            trend: change24 > 0 ? 'up' : (change24 === 0 ? 'neutral' : 'down')
          });
        }

        // Determine stable order by popularity if not set yet (marketCap desc, fallback quote volume)
        if (!orderRef.current) {
          const popularity = Array.from(newMap.entries()).map(([base, v]) => ({ base, score: v.marketCapRaw ?? v.volumeRaw }));
          popularity.sort((a, b) => (b.score || 0) - (a.score || 0));
          orderRef.current = popularity.map(p => p.base);
        }

        // Merge with previous tickers to preserve immutable fields (name, image) and row identity
        setTickers(prev => {
          const prevMap = Object.fromEntries(prev.map(p => [p.symbol, p]));

          // Build nextTickers following orderRef; append any new symbols not present in orderRef at the end
          const ordered = [];
          const added = new Set();
          const flashes = {};

          for (const base of orderRef.current) {
            const nd = newMap.get(base);
            if (!nd) continue;
            added.add(base);
            const prevEntry = prevMap[base];
            if (prevEntry) {
              // detect price change to trigger flash
              if (typeof prevEntry.priceRaw === 'number' && typeof nd.priceRaw === 'number' && prevEntry.priceRaw !== nd.priceRaw) {
                flashes[base] = nd.priceRaw > prevEntry.priceRaw ? 'up' : 'down';
              }

              // only copy dynamic fields so name/image keep stable
              ordered.push({
                ...prevEntry,
                pair: nd.pair,
                priceRaw: nd.priceRaw,
                price: nd.price,
                h24: nd.h24,
                h1: nd.h1,
                d7: nd.d7,
                volumeRaw: nd.volumeRaw,
                volume: nd.volume,
                marketCapRaw: nd.marketCapRaw,
                marketCap: nd.marketCap,
                isUp: nd.isUp,
                trend: nd.trend
              });
            } else {
              ordered.push({
                id: base,
                name: nd.name,
                symbol: nd.symbol,
                pair: nd.pair,
                image: nd.image,
                priceRaw: nd.priceRaw,
                price: nd.price,
                h24: nd.h24,
                h1: nd.h1,
                d7: nd.d7,
                volumeRaw: nd.volumeRaw,
                volume: nd.volume,
                marketCapRaw: nd.marketCapRaw,
                marketCap: nd.marketCap,
                isUp: nd.isUp,
                trend: nd.trend
              });
            }
          }

          // append any remaining symbols not in orderRef (newly discovered)
          for (const [base, nd] of newMap.entries()) {
            if (added.has(base)) continue;
            const prevEntry = prevMap[base];
            if (prevEntry) {
              if (typeof prevEntry.priceRaw === 'number' && typeof nd.priceRaw === 'number' && prevEntry.priceRaw !== nd.priceRaw) {
                flashes[base] = nd.priceRaw > prevEntry.priceRaw ? 'up' : 'down';
              }
              ordered.push({
                ...prevEntry,
                pair: nd.pair,
                priceRaw: nd.priceRaw,
                price: nd.price,
                h24: nd.h24,
                h1: nd.h1,
                d7: nd.d7,
                volumeRaw: nd.volumeRaw,
                volume: nd.volume,
                marketCapRaw: nd.marketCapRaw,
                marketCap: nd.marketCap,
                isUp: nd.isUp,
                trend: nd.trend
              });
            } else {
              ordered.push({
                id: base,
                name: nd.name,
                symbol: nd.symbol,
                pair: nd.pair,
                image: nd.image,
                priceRaw: nd.priceRaw,
                price: nd.price,
                h24: nd.h24,
                h1: nd.h1,
                d7: nd.d7,
                volumeRaw: nd.volumeRaw,
                volume: nd.volume,
                marketCapRaw: nd.marketCapRaw,
                marketCap: nd.marketCap,
                isUp: nd.isUp,
                trend: nd.trend
              });
            }
          }

          // apply flashes after state update (call setPriceFlash now so it's batched)
          if (Object.keys(flashes).length > 0) {
            setPriceFlash(prevF => ({ ...prevF, ...flashes }));

            // clear previous timers and set new timers to remove flashes
            for (const sym of Object.keys(flashes)) {
              if (flashTimersRef.current[sym]) {
                clearTimeout(flashTimersRef.current[sym]);
              }
              flashTimersRef.current[sym] = setTimeout(() => {
                setPriceFlash(prevF => {
                  const copy = { ...prevF };
                  delete copy[sym];
                  return copy;
                });
                delete flashTimersRef.current[sym];
              }, 800);
            }
          }

          return ordered;
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to fetch');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTickers();

    const interval = setInterval(fetchTickers, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Helper: fetch sparklines (klines) for visible rows, with small concurrency control, cache in sessionStorage for 5 minutes
  // Derived list to display (showing from 0 to page*perPage items)
  const visibleCount = useMemo(() => Math.max(0, page) * perPage, [page, perPage]);
  const visibleTickers = useMemo(() => tickers.slice(0, visibleCount), [tickers, visibleCount]);

  const total = tickers.length;

  useEffect(() => {
    let cancelled = false;
    const SP_KEY_PREFIX = 'spark_';
    const SP_TTL_MS = 1000 * 60 * 5; // 5 minutes

    const loadFromSession = (pair) => {
      try {
        const raw = sessionStorage.getItem(SP_KEY_PREFIX + pair);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.ts && Date.now() - parsed.ts < SP_TTL_MS && Array.isArray(parsed.data)) return parsed.data;
      } catch (e) {}
      return null;
    };

    const saveToSession = (pair, data) => {
      try {
        sessionStorage.setItem(SP_KEY_PREFIX + pair, JSON.stringify({ ts: Date.now(), data }));
      } catch (e) {}
    };

    const fetchKlines = async (pair) => {
      try {
        // 7 days hourly: 168 points
        const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=168`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.json();
        // each item: [openTime, open, high, low, close, ...]
        const closes = arr.map(a => parseFloat(a[4]));
        return closes;
      } catch (e) {
        return null;
      }
    };

    const run = async () => {
      const visiblePairs = visibleTickers.map(t => t.pair).filter(Boolean);
      if (visiblePairs.length === 0) return;

      // batch with concurrency 6
      const concurrency = 6;
      let i = 0;
      const out = {};

      const worker = async () => {
        while (i < visiblePairs.length) {
          const idx = i++;
          const pair = visiblePairs[idx];
          if (cancelled) return;
          const cached = loadFromSession(pair);
          if (cached) {
            out[pair] = cached;
            continue;
          }
          const data = await fetchKlines(pair);
          if (data && data.length) {
            out[pair] = data;
            saveToSession(pair, data);
          }
        }
      };

      const workers = [];
      for (let w = 0; w < concurrency; w++) workers.push(worker());
      await Promise.all(workers);
      if (!cancelled) {
        setSparklines(prev => ({ ...prev, ...out }));
      }
    };

    run();
    return () => {
      cancelled = true;
      // clear any active flash timers
      Object.values(flashTimersRef.current || {}).forEach(tid => clearTimeout(tid));
      flashTimersRef.current = {};
    };
  }, [visibleTickers]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Markets</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Per page</label>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="px-3 py-1 border rounded bg-white dark:bg-black">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={300}>300</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full align-middle table-fixed">
            <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-4 pl-4 text-left whitespace-nowrap w-12">#</th>
                  <th className="py-4 px-6 text-left">Coin</th>
                  <th className="py-4 px-6 text-right w-28">Price</th>
                  <th className="py-4 px-6 text-right w-20">1h</th>
                  <th className="py-4 px-6 text-right w-20">24h</th>
                  <th className="py-4 px-6 text-right w-20">7d</th>
                  <th className="py-4 px-6 text-right w-36">Market Cap</th>
                  <th className="py-4 px-6 text-right w-36">24h Volume</th>
                  <th className="py-4 pr-6 text-right w-36">Last 7 Days</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading && tickers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">Loading markets…</td>
                  </tr>
                )}

              {error && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-500">Error: {error}</td>
                </tr>
              )}

              {!loading && !error && visibleTickers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No markets available</td>
                </tr>
              )}

              {visibleTickers.map((coin, idx) => (
                <tr key={coin.pair} className="group hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                  <td className="py-4 pl-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">{idx + 1}</td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center">
                      {coin.image ? (
                        <img src={coin.image} alt={coin.name} className="w-8 h-8 mr-3 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 mr-3 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-semibold text-gray-600">{coin.symbol.slice(0,2)}</div>
                      )}
                      <div>
                        {(() => {
                          const max = 18;
                          const short = coin.name && coin.name.length > max ? coin.name.slice(0, max) + '…' : coin.name;
                          return <div className="font-semibold text-gray-900 dark:text-white">{short}</div>;
                        })()}
                      </div>
                    </div>
                  </td>
                  <td
                    className={
                      `py-4 px-6 whitespace-nowrap text-right text-sm font-medium font-mono transition-colors duration-500 ` +
                      (priceFlash[coin.symbol] === 'up'
                        ? 'text-green-500'
                        : priceFlash[coin.symbol] === 'down'
                          ? 'text-red-500'
                          : 'text-gray-900 dark:text-white')
                    }
                  >
                    {coin.price}
                  </td>

                  <td className={`py-4 px-6 whitespace-nowrap text-right text-sm font-medium ${coin.h1 && coin.h1.includes('-') ? 'text-red-500' : 'text-green-500'}`}>{coin.h1}</td>

                  <td className={`py-4 px-6 whitespace-nowrap text-right text-sm font-medium ${coin.h24 && coin.h24.includes('-') ? 'text-red-500' : 'text-green-500'}`}>
                    <span className="flex items-center justify-end">{coin.h24}</span>
                  </td>

                  <td className={`py-4 px-6 whitespace-nowrap text-right text-sm font-medium ${coin.d7 && coin.d7.includes('-') ? 'text-red-500' : 'text-green-500'}`}>{coin.d7}</td>

                  <td className="py-4 px-6 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">{coin.marketCap}</td>

                  <td className="py-4 px-6 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">{coin.volume}</td>

                  <td className="py-4 pr-6 whitespace-nowrap text-right w-36">
                    <div className="float-right">
                      {sparklines[coin.pair] ? (
                        <Sparkline data={sparklines[coin.pair]} color={coin.isUp ? '#16c784' : '#ea3943'} width={120} height={36} />
                      ) : (coin.trend === 'up' ? <SparklineUp /> : (coin.trend === 'neutral' ? <SparklineNeutral /> : <SparklineDown />))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination / load more controls */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">Showing {visibleTickers.length} of {total} results</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >Prev</button>

            <button
              onClick={() => setPage(p => p + 1)}
              disabled={visibleTickers.length >= total}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >Load more</button>
          </div>
        </div>
      </main>
    </div>
  );
}
