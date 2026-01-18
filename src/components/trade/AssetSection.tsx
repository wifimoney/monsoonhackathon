'use client';

import { useState } from 'react';
import { AssetRow } from './AssetRow';

/**
 * Interface for an asset in the section
 */
interface Asset {
  symbol: string;
  price: number;
  weight: number;
}

/**
 * Props for AssetSection component
 * Task 3.3: Create src/components/trade/AssetSection.tsx component
 * Task 7.4: Add isLoading prop for skeleton states
 */
interface AssetSectionProps {
  /** Section title (e.g., "Long Assets") */
  title: string;
  /** Number of assets in section */
  count: number;
  /** Array of assets to display */
  assets: Asset[];
  /** Position side - long or short */
  side: 'long' | 'short';
  /** Leverage multiplier for all assets */
  leverage?: number;
  /** Callback when add button is clicked */
  onAddClick: () => void;
  /** Callback when weight changes for an asset */
  onWeightChange: (symbol: string, weight: number) => void;
  /** Callback when an asset is removed */
  onRemove: (symbol: string) => void;
  /** Whether prices are loading - shows skeleton states */
  isLoading?: boolean;
}

/**
 * Skeleton Row for Asset Loading State
 * Task 7.4: Skeleton states for asset rows while loading prices
 */
function AssetRowSkeleton({ side }: { side: 'long' | 'short' }) {
  const bgColor = side === 'long' ? 'bg-emerald-500/10' : 'bg-red-500/10';

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-900 rounded-lg animate-pulse">
      {/* Chevron placeholder */}
      <div className="w-4 h-4 bg-zinc-700 rounded" />
      {/* Icon placeholder */}
      <div className={`w-8 h-8 ${bgColor} rounded-full`} />
      {/* Text placeholder */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-700 rounded w-16" />
        <div className="h-3 bg-zinc-700 rounded w-12" />
      </div>
      {/* Weight placeholder */}
      <div className="h-8 bg-zinc-700 rounded w-16" />
      {/* Remove button placeholder */}
      <div className="w-8 h-8 bg-zinc-700 rounded" />
    </div>
  );
}

/**
 * AssetSection component for displaying a collapsible section of assets.
 *
 * Task 3.3: Create src/components/trade/AssetSection.tsx component
 * - Props: title, count, assets[], side, onAddClick, onSort, onWeightChange, onRemove
 * - Collapsible header: "Long Assets (N)" or "Short Assets (N)"
 * - Sort button (ascending/descending arrows) and "+" add button in header
 * - Maps assets to AssetRow components
 * - Green header accent for long, red for short (matching mockup)
 *
 * Task 7.4: Add loading states with skeleton rows
 */
export function AssetSection({
  title,
  count,
  assets,
  side,
  leverage = 2,
  onAddClick,
  onWeightChange,
  onRemove,
  isLoading = false,
}: AssetSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const borderColor = side === 'long' ? 'border-l-emerald-500' : 'border-l-red-500';
  const textColor = side === 'long' ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div
        data-testid="section-header"
        className={`flex items-center justify-between px-4 py-3 border-l-4 ${borderColor}`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-white font-semibold hover:text-zinc-300 transition-colors"
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
            className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>
            {title} <span className={textColor}>({count})</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* Add button */}
          <button
            data-testid="add-button"
            onClick={onAddClick}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Add token"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Asset rows */}
      {!isCollapsed && (
        <div className="p-2 space-y-2">
          {assets.map((asset) => (
            <AssetRow
              key={asset.symbol}
              symbol={asset.symbol}
              price={asset.price}
              weight={asset.weight}
              leverage={leverage}
              side={side}
              onWeightChange={(weight) => onWeightChange(asset.symbol, weight)}
              onRemove={() => onRemove(asset.symbol)}
              isLoading={isLoading && asset.price === 0}
            />
          ))}
          {/* Show empty state when no assets */}
          {assets.length === 0 && (
            <div className="text-center py-4 text-zinc-500 text-sm">
              Click + to add {side} positions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
