'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { HyperliquidToken, RecommendedToken } from '@/types/trade';

/**
 * Props for TokenSearchInput component
 */
interface TokenSearchInputProps {
  /** Callback when a token is selected */
  onSelect: (token: HyperliquidToken) => void;
  /** Recommended tokens to show as initial suggestions */
  recommendedTokens?: RecommendedToken[];
  /** Symbols to exclude from search results (already added tokens) */
  excludeSymbols: string[];
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * API response structure
 */
interface TokenSearchResponse {
  success: boolean;
  tokens: HyperliquidToken[];
}

/**
 * Token search input component with recommendations.
 *
 * Features:
 * - Search input field with placeholder text
 * - Display recommended tokens as initial suggestions
 * - Show filtered token list as user types
 * - Display "No token exists" when no results
 * - Call onSelect callback when token chosen
 * - Style using existing CSS variables (--card, --card-border)
 *
 * Task 3.4: Create TokenSearchInput component
 */
export function TokenSearchInput({
  onSelect,
  recommendedTokens = [],
  excludeSymbols,
  placeholder = 'Search tokens...',
}: TokenSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HyperliquidToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(true);
  const [allTokens, setAllTokens] = useState<HyperliquidToken[]>([]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Fetch all tokens on mount
   */
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch('/api/ai-trade/tokens');
        if (response.ok) {
          const data: TokenSearchResponse = await response.json();
          if (data.success) {
            setAllTokens(data.tokens);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tokens:', error);
      }
    };

    fetchTokens();
  }, []);

  /**
   * Filter tokens based on query
   */
  const filterTokens = useCallback(
    (tokens: HyperliquidToken[], searchQuery: string): HyperliquidToken[] => {
      // Filter out excluded symbols
      let filtered = tokens.filter((t) => !excludeSymbols.includes(t.symbol));

      // Apply search filter if query exists
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (t) =>
            t.symbol.toLowerCase().includes(lowerQuery) ||
            t.name.toLowerCase().includes(lowerQuery)
        );
      }

      return filtered.slice(0, 10); // Limit results
    },
    [excludeSymbols]
  );

  /**
   * Get recommended tokens filtered by exclusions and query
   */
  const getFilteredRecommendations = useCallback((): HyperliquidToken[] => {
    const lowerQuery = query.toLowerCase().trim();

    return recommendedTokens
      .filter((t) => !excludeSymbols.includes(t.symbol))
      .filter((t) => {
        if (!lowerQuery) return true;
        return (
          t.symbol.toLowerCase().includes(lowerQuery) ||
          t.name.toLowerCase().includes(lowerQuery)
        );
      })
      .map((t) => ({
        symbol: t.symbol,
        name: t.name,
        dailyVolumeUsd: 0, // Recommendations don't have volume
      }));
  }, [recommendedTokens, excludeSymbols, query]);

  /**
   * Perform debounced search
   */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsLoading(true);

      // Filter locally from cached tokens
      const filtered = filterTokens(allTokens, query);
      setResults(filtered);
      setIsLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, allTokens, filterTokens]);

  /**
   * Handle token selection
   */
  const handleSelect = useCallback(
    (token: HyperliquidToken) => {
      onSelect(token);
      setQuery('');
      setShowDropdown(false);
    },
    [onSelect]
  );

  /**
   * Handle input focus
   */
  const handleFocus = () => {
    setShowDropdown(true);
  };

  /**
   * Handle clicking outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combine recommendations with search results
  const filteredRecommendations = getFilteredRecommendations();
  const combinedResults = [...filteredRecommendations];

  // Add search results that aren't already in recommendations
  results.forEach((token) => {
    if (!combinedResults.some((r) => r.symbol === token.symbol)) {
      combinedResults.push(token);
    }
  });

  const hasResults = combinedResults.length > 0;
  const showNoResults = !isLoading && query.trim() && !hasResults;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          color: 'var(--foreground)',
        }}
      />

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg z-10"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}
        >
          {isLoading && (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--muted)' }}>
              Searching...
            </div>
          )}

          {!isLoading && filteredRecommendations.length > 0 && !query.trim() && (
            <div
              className="px-3 py-1 text-xs font-semibold uppercase"
              style={{ color: 'var(--muted)' }}
            >
              Recommended
            </div>
          )}

          {!isLoading &&
            combinedResults.map((token) => {
              const isRecommended = filteredRecommendations.some(
                (r) => r.symbol === token.symbol
              );
              const recommendation = recommendedTokens.find(
                (r) => r.symbol === token.symbol
              );

              return (
                <button
                  key={token.symbol}
                  onClick={() => handleSelect(token)}
                  className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[var(--card-border)] transition-colors"
                  style={{ color: 'var(--foreground)' }}
                >
                  <div className="flex flex-col">
                    <span className="font-mono font-semibold">{token.symbol}</span>
                    {isRecommended && recommendation?.relevance && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {recommendation.relevance}
                      </span>
                    )}
                  </div>
                  {token.dailyVolumeUsd > 0 && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      ${(token.dailyVolumeUsd / 1_000_000).toFixed(1)}M vol
                    </span>
                  )}
                </button>
              );
            })}

          {showNoResults && (
            <div className="px-3 py-3 text-sm text-center" style={{ color: 'var(--muted)' }}>
              No token exists
            </div>
          )}
        </div>
      )}
    </div>
  );
}
