'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { HyperliquidToken } from '@/types/trade';

/**
 * Response structure from the tokens API endpoint
 */
interface TokenSearchResponse {
  success: boolean;
  tokens: HyperliquidToken[];
  cached: boolean;
}

/**
 * Hook return type
 */
interface UseTokenSearchReturn {
  /** Search query string */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Filtered token results */
  results: HyperliquidToken[];
  /** Whether search is in progress */
  isLoading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** All available tokens (cached) */
  allTokens: HyperliquidToken[];
}

/**
 * Cache for token list to avoid repeated API calls
 */
let tokenCache: HyperliquidToken[] | null = null;

/**
 * Custom hook for searching tokens from Hyperliquid API.
 *
 * Features:
 * - Fetches tokens from /api/ai-trade/tokens endpoint
 * - Debounces search input (300ms)
 * - Filters by symbol or name
 * - Returns loading, error, and results states
 * - Caches token list for session duration
 *
 * Task 3.2: Create useTokenSearch hook
 */
export function useTokenSearch(): UseTokenSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HyperliquidToken[]>([]);
  const [allTokens, setAllTokens] = useState<HyperliquidToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for debounce timeout
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch all tokens and cache them
   */
  const fetchTokens = useCallback(async () => {
    // Return cached tokens if available
    if (tokenCache) {
      setAllTokens(tokenCache);
      return tokenCache;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-trade/tokens');

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status}`);
      }

      const data: TokenSearchResponse = await response.json();

      if (!data.success) {
        throw new Error('Token fetch was not successful');
      }

      // Cache the tokens
      tokenCache = data.tokens;
      setAllTokens(data.tokens);
      return data.tokens;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tokens';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Filter tokens by query
   */
  const filterTokens = useCallback((tokens: HyperliquidToken[], searchQuery: string): HyperliquidToken[] => {
    if (!searchQuery || searchQuery.trim() === '') {
      return tokens;
    }

    const lowerQuery = searchQuery.toLowerCase().trim();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.name.toLowerCase().includes(lowerQuery)
    );
  }, []);

  /**
   * Perform debounced search
   */
  const debouncedSearch = useCallback(async (searchQuery: string) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set up new debounce
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);

      try {
        // Ensure we have tokens loaded
        let tokens = allTokens;
        if (tokens.length === 0) {
          tokens = await fetchTokens();
        }

        // Filter locally
        const filtered = filterTokens(tokens, searchQuery);
        setResults(filtered);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [allTokens, fetchTokens, filterTokens]);

  /**
   * Handle query changes with debouncing
   */
  useEffect(() => {
    debouncedSearch(query);

    // Cleanup on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debouncedSearch]);

  /**
   * Initial fetch of all tokens
   */
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    allTokens,
  };
}

/**
 * Utility function to clear the token cache (for testing)
 */
export function clearTokenSearchCache() {
  tokenCache = null;
}
