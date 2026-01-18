'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hyperliquid API response types
 */
interface HyperliquidAssetMeta {
  name: string;
  szDecimals?: number;
}

interface HyperliquidAssetContext {
  markPx: string;
  dayNtlVlm: string;
}

type HyperliquidMetaAndAssetCtxsResponse = [
  { universe: HyperliquidAssetMeta[] },
  HyperliquidAssetContext[]
];

/**
 * State for the token prices hook
 */
interface TokenPricesState {
  prices: Record<string, number>;
  loading: boolean;
  error: string | null;
}

/**
 * Hyperliquid Info API URL
 */
const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

/**
 * Price refresh interval in milliseconds (5 seconds)
 * Task 2.3: Implement 5-second auto-refresh
 */
const PRICE_REFRESH_INTERVAL_MS = 5000;

/**
 * Custom hook for fetching real-time token prices from Hyperliquid.
 *
 * Task 2.2: Create src/hooks/useTokenPrices.ts hook
 * - State: prices (Record<string, number>), loading, error
 * - Takes array of symbols as input
 * - Fetches from Hyperliquid Info API: POST https://api.hyperliquid.xyz/info with { type: "metaAndAssetCtxs" }
 * - Extract markPx field for each token
 *
 * Task 2.3: Implement 5-second auto-refresh
 * - useEffect with setInterval for 5000ms
 * - Cleanup interval on unmount
 * - Only fetch when symbols array is non-empty
 *
 * @param symbols - Array of token symbols to fetch prices for (e.g., ['BTC', 'ETH'])
 * @returns Object containing prices map, loading state, and error state
 */
export function useTokenPrices(symbols: string[]) {
  const [state, setState] = useState<TokenPricesState>({
    prices: {},
    loading: symbols.length > 0,
    error: null,
  });

  // Ref to track mounted state
  const mountedRef = useRef(true);

  // Ref to track current symbols (avoids stale closure issues)
  const symbolsRef = useRef(symbols);

  // Keep symbolsRef in sync
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  /**
   * Fetch prices from Hyperliquid API
   */
  const fetchPrices = useCallback(async () => {
    const currentSymbols = symbolsRef.current;

    // Don't fetch if no symbols
    if (currentSymbols.length === 0) {
      setState({
        prices: {},
        loading: false,
        error: null,
      });
      return;
    }

    try {
      const response = await fetch(HYPERLIQUID_INFO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      });

      if (!response.ok) {
        throw new Error(`Hyperliquid API error: ${response.status}`);
      }

      const data: HyperliquidMetaAndAssetCtxsResponse = await response.json();
      const [meta, assetContexts] = data;

      // Build a map of symbol -> price for requested symbols only
      const pricesMap: Record<string, number> = {};
      const symbolSet = new Set(currentSymbols);

      for (let i = 0; i < meta.universe.length; i++) {
        const assetMeta = meta.universe[i];
        const assetCtx = assetContexts[i];

        if (!assetCtx) continue;

        // Only include requested symbols
        if (symbolSet.has(assetMeta.name)) {
          pricesMap[assetMeta.name] = parseFloat(assetCtx.markPx);
        }
      }

      // Only update state if component is still mounted
      if (mountedRef.current) {
        setState({
          prices: pricesMap,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch prices',
        }));
      }
    }
  }, []);

  /**
   * Effect to fetch prices initially and set up auto-refresh interval
   */
  useEffect(() => {
    mountedRef.current = true;

    // Don't set up anything if no symbols
    if (symbols.length === 0) {
      setState({
        prices: {},
        loading: false,
        error: null,
      });
      return;
    }

    // Set loading state
    setState((prev) => ({
      ...prev,
      loading: true,
    }));

    // Initial fetch
    fetchPrices();

    // Set up interval for auto-refresh every 5 seconds
    const intervalId = setInterval(() => {
      fetchPrices();
    }, PRICE_REFRESH_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [symbols.join(','), fetchPrices]);

  return {
    prices: state.prices,
    loading: state.loading,
    error: state.error,
  };
}
