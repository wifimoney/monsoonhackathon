'use client';

import type { Position } from '@/types/trade';

/**
 * Props for EditablePositionRow component
 */
interface EditablePositionRowProps {
  /** The position to display */
  position: Position;
  /** Which side this position belongs to */
  side: 'long' | 'short';
  /** Callback when weight is changed */
  onWeightChange: (weight: number) => void;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Whether the remove button is disabled (last token on side) */
  isRemoveDisabled: boolean;
}

/**
 * Editable row for a single position in the modification modal.
 *
 * Features:
 * - Display token symbol and name
 * - Editable percentage input (number field, 0-100)
 * - Remove button (X icon) with disabled state for last token
 * - Style with border matching side (--accent for LONG, --danger for SHORT)
 *
 * Task 3.5: Create EditablePositionRow component
 */
export function EditablePositionRow({
  position,
  side,
  onWeightChange,
  onRemove,
  isRemoveDisabled,
}: EditablePositionRowProps) {
  const borderColor = side === 'long' ? 'var(--accent)' : 'var(--danger)';

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onWeightChange(Math.max(0, Math.min(100, value)));
    } else if (e.target.value === '') {
      onWeightChange(0);
    }
  };

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg"
      style={{
        background: 'var(--background)',
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Token info */}
      <div className="flex-1 min-w-0">
        <div className="font-mono font-semibold text-sm truncate">
          {position.symbol}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
          {position.name}
        </div>
      </div>

      {/* Percentage input */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="100"
          value={position.weight}
          onChange={handleWeightChange}
          className="w-16 px-2 py-1 text-right font-mono text-sm rounded"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            color: 'var(--foreground)',
          }}
        />
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          %
        </span>
      </div>

      {/* Remove button */}
      <button
        data-testid="remove-token-button"
        onClick={onRemove}
        disabled={isRemoveDisabled}
        className="p-1.5 rounded-lg transition-colors"
        style={{
          background: isRemoveDisabled ? 'transparent' : 'var(--card)',
          color: isRemoveDisabled ? 'var(--muted)' : 'var(--danger)',
          cursor: isRemoveDisabled ? 'not-allowed' : 'pointer',
          opacity: isRemoveDisabled ? 0.4 : 1,
        }}
        title={isRemoveDisabled ? 'Cannot remove last token' : 'Remove token'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
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
