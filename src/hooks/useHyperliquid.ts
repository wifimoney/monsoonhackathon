import { useState, useEffect } from 'react';

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info';

export interface OrderBookLevel {
    px: string; // price
    sz: string; // size
    n: number;  // number of orders
}

export interface OrderBookData {
    coin: string;
    levels: [OrderBookLevel[], OrderBookLevel[]]; // [bids, asks]
    time: number;
}

export function useOrderBook(asset: string = 'ETH') {
    const [data, setData] = useState<OrderBookData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchOrderBook = async () => {
            try {
                const response = await fetch(HYPERLIQUID_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'l2Book',
                        coin: asset,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch orderbook');
                }

                const result = await response.json();
                if (isMounted) {
                    // Hyperliquid returns levels as [bids, asks]
                    setData(result as OrderBookData);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Error fetching orderbook:', err);
                    setError('Failed to fetch orderbook data');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        // Initial fetch
        fetchOrderBook();

        // Poll every 5 seconds
        const intervalId = setInterval(fetchOrderBook, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [asset]);

    return { data, isLoading, error };
}

export function useTicker(asset: string = 'ETH') {
    const [price, setPrice] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchTicker = async () => {
            try {
                const response = await fetch(HYPERLIQUID_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'allMids' })
                });
                const data = await response.json();
                if (isMounted && data[asset]) {
                    setPrice(data[asset]);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchTicker();
        const interval = setInterval(fetchTicker, 5000);
        return () => { isMounted = false; clearInterval(interval); };
    }, [asset]);

    return { price };
}
