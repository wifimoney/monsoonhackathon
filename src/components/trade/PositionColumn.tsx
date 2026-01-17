'use client';

import { useState } from 'react';
import type { Position, RecommendedToken, HyperliquidToken } from '@/types/trade';
import { EditablePositionRow } from './EditablePositionRow';
import { TokenSearchInput } from './TokenSearchInput';

/**
 * Props for PositionColumn component
 */
interface PositionColumnProps {
  /** Column title (LONG or SHORT) */
  side: 'long' | 'short';
  /** Array of positions */
  positions: Position[];
  /** Callback when a position's weight changes */
  onWeightChange: (index: number, weight: number) => void;
  /** Callback when a position is removed */
  onRemove: (index: number) => void;
  /** Callback when a token is added */
  onAdd: (token: Position) => void;
  /** Running total percentage */
  total: number;
  /** Whether total exceeds 100% */
  isValid: boolean;
  /** Validation error message */
  error?: string;
  /** Recommended tokens for search suggestions */
  recommendedTokens?: RecommendedToken[];
  /** Whether remove is allowed (has more than 1 token) */
  canRemove: boolean;
}

/**
 * Column component for displaying and editing positions on one side.
 *
 * Features:
 * - Column header (LONG or SHORT with appropriate color)
 * - List of EditablePositionRow components
 * - Running total display (e.g., "Total: 85%")
 * - Validation error message when total exceeds 100%
 * - Add token button that reveals TokenSearchInput
 *
 * Task 3.6: Create PositionColumn component
 */
export function PositionColumn({
  side,
  positions,
  onWeightChange,
  onRemove,
  onAdd,
  total,
  isValid,
  error,
  recommendedTokens = [],
  canRemove,
}: PositionColumnProps) {
  const [showAddToken, setShowAddToken] = useState(false);

  const headerColor = side === 'long' ? 'var(--accent)' : 'var(--danger)';
  const borderColor = side === 'long' ? 'var(--accent)' : 'var(--danger)';
  const title = side === 'long' ? 'LONG' : 'SHORT';

  // Get symbols already in this column to exclude from search
  const excludeSymbols = positions.map((p) => p.symbol);

  const handleTokenSelect = (token: HyperliquidToken) => {
    const newPosition: Position = {
      symbol: token.symbol,
      name: token.name,
      weight: 0, // Default weight, user will adjust
      dailyVolume: token.dailyVolumeUsd,
    };
    onAdd(newPosition);
    setShowAddToken(false);
  };

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg"
      style={{
        background: 'var(--card)',
        border: `2px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: headerColor }}
        >
          {title}
        </h3>
        <span
          className="text-xs font-mono"
          style={{
            color: isValid ? 'var(--muted)' : 'var(--danger)',
          }}
        >
          Total: {total}%
        </span>
      </div>

      {/* Validation error */}
      {!isValid && error && (
        <div
          className="text-xs px-2 py-1 rounded"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* Position list */}
      <div className="flex flex-col gap-2">
        {positions.length === 0 ? (
          <div className="text-sm italic" style={{ color: 'var(--muted)' }}>
            No positions
          </div>
        ) : (
          positions.map((position, index) => (
            <EditablePositionRow
              key={position.symbol}
              position={position}
              side={side}
              onWeightChange={(weight) => onWeightChange(index, weight)}
              onRemove={() => onRemove(index)}
              isRemoveDisabled={!canRemove}
            />
          ))
        )}
      </div>

      {/* Add token section */}
      {showAddToken ? (
        <div className="mt-2">
          <TokenSearchInput
            onSelect={handleTokenSelect}
            recommendedTokens={recommendedTokens}
            excludeSymbols={excludeSymbols}
            placeholder={`Add ${side} token...`}
          />
          <button
            onClick={() => setShowAddToken(false)}
            className="mt-2 w-full text-xs py-1"
            style={{ color: 'var(--muted)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddToken(true)}
          className="btn btn-secondary text-sm mt-2"
        >
          + Add Token
        </button>
      )}
    </div>
  );
}
