'use client';

import { useState, useEffect, useMemo } from 'react';

/**
 * Interface for a token from the API
 */
interface Token {
  symbol: string;
  name: string;
  dailyVolumeUsd: number;
}

/**
 * Props for TokenSelectModal component
 * Task 3.4: Create src/components/trade/TokenSelectModal.tsx component
 */
interface TokenSelectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when a token is selected */
  onSelect: (symbol: string) => void;
  /** Symbols to exclude from the list (already in basket) */
  excludeSymbols: string[];
}

/**
 * Formats volume as a human-readable string (e.g., "$1.5B", "$500M")
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(1)}B`;
  }
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(0)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * TokenSelectModal component for selecting tokens to add to the basket.
 *
 * Task 3.4: Create src/components/trade/TokenSelectModal.tsx component
 * - Props: isOpen, onClose, onSelect(symbol: string), excludeSymbols[]
 * - Searchable list of available tokens
 * - Fetch from existing /api/ai-trade/tokens endpoint
 * - Display: symbol, name, daily volume (formatted)
 * - Filter out tokens already in basket (excludeSymbols)
 * - Dark modal styling matching existing AuthModal pattern
 */
export function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  excludeSymbols,
}: TokenSelectModalProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tokens when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    const fetchTokens = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai-trade/tokens');
        const data = await response.json();

        if (data.success && data.tokens) {
          setTokens(data.tokens);
        } else {
          setError('Failed to load tokens');
        }
      } catch (err) {
        setError('Failed to load tokens');
        console.error('Error fetching tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [isOpen]);

  // Filter tokens by search query and exclude symbols
  const filteredTokens = useMemo(() => {
    const excludeSet = new Set(excludeSymbols);
    const query = searchQuery.toLowerCase().trim();

    return tokens.filter((token) => {
      // Filter out excluded symbols
      if (excludeSet.has(token.symbol)) {
        return false;
      }

      // Filter by search query
      if (query) {
        return (
          token.symbol.toLowerCase().includes(query) ||
          token.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [tokens, excludeSymbols, searchQuery]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Select Token</h2>
          <button
            data-testid="close-button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Token list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-600 border-t-white" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-zinc-400">No tokens found</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredTokens.map((token) => (
                <button
                  key={token.symbol}
                  data-testid={`token-row-${token.symbol}`}
                  onClick={() => handleSelect(token.symbol)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors text-left"
                >
                  {/* Token icon placeholder */}
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-sm font-bold text-zinc-300">
                      {token.symbol.charAt(0)}
                    </span>
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{token.symbol}</div>
                    <div className="text-sm text-zinc-400 truncate">{token.name}</div>
                  </div>

                  {/* Daily volume */}
                  <div className="text-right">
                    <div className="text-sm text-zinc-400">24h Vol</div>
                    <div className="text-sm font-medium text-white">
                      {formatVolume(token.dailyVolumeUsd)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
