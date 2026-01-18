'use client';

/**
 * Props for AssetRow component
 * Task 3.2: Create src/components/trade/AssetRow.tsx component
 * Task 7.4: Add isLoading prop for skeleton states
 */
interface AssetRowProps {
  /** Token symbol (e.g., 'BTC', 'ETH') */
  symbol: string;
  /** Current price in USD */
  price: number;
  /** Weight as a percentage (0-100) */
  weight: number;
  /** Leverage multiplier (default 2) */
  leverage?: number;
  /** Position side - long or short */
  side: 'long' | 'short';
  /** Callback when weight input changes */
  onWeightChange: (weight: number) => void;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Whether the row is in a loading state */
  isLoading?: boolean;
}

/**
 * Formats a price as USD currency string.
 * For prices >= 1: format with commas (e.g., "$94,909")
 * For prices < 1: show full decimal precision (e.g., "$0.21446")
 */
function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  // For small prices, preserve decimal precision
  return `$${price.toString()}`;
}

/**
 * Token icon component that displays a colored circle with the first letter
 * of the token symbol
 */
function TokenIcon({ symbol, side }: { symbol: string; side: 'long' | 'short' }) {
  const bgColor = side === 'long' ? 'bg-emerald-500/20' : 'bg-red-500/20';
  const textColor = side === 'long' ? 'text-emerald-500' : 'text-red-500';

  return (
    <div
      className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}
    >
      <span className={`text-sm font-bold ${textColor}`}>
        {symbol.charAt(0)}
      </span>
    </div>
  );
}

/**
 * Loading Spinner Component for price loading state
 */
function LoadingSpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-zinc-500"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * AssetRow component for displaying a single token in the basket.
 *
 * Task 3.2: Create src/components/trade/AssetRow.tsx component
 * - Props: symbol, price, weight, leverage (default 2), side, onWeightChange, onRemove
 * - Layout: chevron | icon | symbol + 2x badge | price | weight% input | x button
 * - Green text for long side, red text for short side (matching mockup)
 * - Weight input is editable number field with "%" suffix
 * - Format price as USD (e.g., "$94,909" or "$0.21446")
 *
 * Task 7.4: Add loading state with skeleton/spinner for price
 */
export function AssetRow({
  symbol,
  price,
  weight,
  leverage = 2,
  side,
  onWeightChange,
  onRemove,
  isLoading = false,
}: AssetRowProps) {
  const textColor = side === 'long' ? 'text-emerald-500' : 'text-red-500';

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onWeightChange(Math.max(0, Math.min(100, value)));
    } else if (e.target.value === '') {
      onWeightChange(0);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-900 rounded-lg">
      {/* Chevron */}
      <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Token icon */}
      <TokenIcon symbol={symbol} side={side} />

      {/* Symbol and price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{symbol}</span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${textColor}`}
          >
            {leverage}x
          </span>
        </div>
        <div className="text-sm text-zinc-400">
          {isLoading ? (
            <span className="flex items-center gap-1">
              <LoadingSpinner />
              <span className="text-xs">Loading...</span>
            </span>
          ) : (
            formatPrice(price)
          )}
        </div>
      </div>

      {/* Weight input */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={parseFloat(weight.toFixed(2))}
          onChange={handleWeightChange}
          className="w-20 px-2 py-1 text-right font-mono text-sm rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-zinc-500"
        />
        <span className="text-sm text-zinc-400">%</span>
      </div>

      {/* Remove button */}
      <button
        data-testid="remove-button"
        onClick={onRemove}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
        title="Remove token"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
