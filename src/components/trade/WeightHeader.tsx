'use client';

/**
 * Props for WeightHeader component
 * Task 3.5: Create src/components/trade/WeightHeader.tsx component
 */
interface WeightHeaderProps {
  /** Total weight of long positions (percentage) */
  longWeight: number;
  /** Total weight of short positions (percentage) */
  shortWeight: number;
  /** Callback when rebalance button is clicked */
  onRebalance: () => void;
}

/**
 * Formats a weight value for display (removes trailing zeros)
 */
function formatWeight(weight: number): string {
  // Round to 1 decimal place
  const rounded = Math.round(weight * 10) / 10;
  // Remove trailing zeros
  return rounded.toString();
}

/**
 * WeightHeader component for displaying overall weight distribution.
 *
 * Task 3.5: Create src/components/trade/WeightHeader.tsx component
 * - Props: longWeight, shortWeight, onRebalance
 * - Display: "Overall: X% / Y%" with green/red coloring
 * - "Rebalance Weight" button/link on right side
 * - Match mockup layout exactly
 */
export function WeightHeader({
  longWeight,
  shortWeight,
  onRebalance,
}: WeightHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">Overall:</span>
        <span data-testid="long-weight" className="text-emerald-500 font-semibold">
          {formatWeight(longWeight)}%
        </span>
        <span className="text-zinc-500">/</span>
        <span data-testid="short-weight" className="text-red-500 font-semibold">
          {formatWeight(shortWeight)}%
        </span>
      </div>

      <button
        onClick={onRebalance}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        Rebalance Weight
      </button>
    </div>
  );
}
