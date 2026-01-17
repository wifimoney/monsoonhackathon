'use client';

import { useState } from 'react';
import type { PearPosition } from '@/lib/pear-client';

/**
 * Props for PositionsTable component
 * Task 5.4: Display open positions in table/card format
 */
interface PositionsTableProps {
  /** List of open positions */
  positions: PearPosition[];
  /** Callback when user confirms closing a position */
  onClosePosition: (positionId: string) => Promise<void>;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Loading skeleton for positions table
 * Task 5.8: Loading skeletons while fetching data
 */
function PositionSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-6 w-24 bg-[var(--card-border)] rounded" />
        <div className="h-8 w-16 bg-[var(--card-border)] rounded" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="h-4 w-full bg-[var(--card-border)] rounded" />
        <div className="h-4 w-full bg-[var(--card-border)] rounded" />
        <div className="h-4 w-full bg-[var(--card-border)] rounded" />
        <div className="h-4 w-full bg-[var(--card-border)] rounded" />
      </div>
    </div>
  );
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

/**
 * Format percentage value
 */
function formatPercentage(value: number): string {
  const formatted = Math.abs(value).toFixed(2);
  return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

/**
 * Get pair string from position assets
 */
function getPairString(position: PearPosition): string {
  const longStr = position.longAssets.join(',');
  const shortStr = position.shortAssets.join(',');
  return `${longStr}/${shortStr}`;
}

/**
 * Confirmation dialog for closing position
 * Task 5.7: Show confirmation dialog before closing
 */
function CloseConfirmationDialog({
  position,
  onConfirm,
  onCancel,
  isClosing,
}: {
  position: PearPosition;
  onConfirm: () => void;
  onCancel: () => void;
  isClosing: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirm Close Position</h3>
        <p className="text-[var(--muted)] mb-4">
          Are you sure you want to close your{' '}
          <span className="font-mono font-semibold text-[var(--foreground)]">
            {getPairString(position)}
          </span>{' '}
          position?
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-[var(--muted)]">Size:</span>
            <span className="ml-2 font-mono">${position.size?.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[var(--muted)]">Unrealized P&L:</span>
            <span
              className={`ml-2 font-mono ${
                (position.unrealizedPnL ?? 0) >= 0
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--danger)]'
              }`}
            >
              {formatCurrency(position.unrealizedPnL ?? 0)}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary flex-1"
            disabled={isClosing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger flex-1"
            disabled={isClosing}
          >
            {isClosing ? 'Closing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Single position card/row
 */
function PositionCard({
  position,
  onClose,
}: {
  position: PearPosition;
  onClose: (positionId: string) => void;
}) {
  const pnl = position.unrealizedPnL ?? 0;
  const pnlPercent = position.unrealizedPnLPercent ?? 0;
  const isProfitable = pnl >= 0;

  return (
    <div className="card p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-mono font-semibold text-lg">
            {getPairString(position)}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(var(--accent-rgb, 34, 197, 94), 0.2)',
                color: 'var(--accent)',
              }}
            >
              LONG: {position.longAssets.join(', ')}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(var(--danger-rgb, 239, 68, 68), 0.2)',
                color: 'var(--danger)',
              }}
            >
              SHORT: {position.shortAssets.join(', ')}
            </span>
          </div>
        </div>
        <button
          onClick={() => onClose(position.positionId)}
          className="btn btn-secondary py-1.5 px-3 text-sm"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-[var(--muted)] mb-1">Size</div>
          <div className="font-mono">${position.size?.toLocaleString() ?? '-'}</div>
        </div>
        <div>
          <div className="text-[var(--muted)] mb-1">Entry Price</div>
          <div className="font-mono">${position.entryPrice?.toLocaleString() ?? '-'}</div>
        </div>
        <div>
          <div className="text-[var(--muted)] mb-1">Current Price</div>
          <div className="font-mono">${position.currentPrice?.toLocaleString() ?? '-'}</div>
        </div>
        <div>
          <div className="text-[var(--muted)] mb-1">Unrealized P&L</div>
          <div
            className={`font-mono font-semibold ${
              isProfitable ? 'text-[var(--accent)]' : 'text-[var(--danger)]'
            }`}
          >
            {formatCurrency(pnl)}
            <span className="text-xs ml-1">({formatPercentage(pnlPercent)})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PositionsTable component
 * Task 5.4: Display open positions in table/card format
 * - Show: pair, side, size, entry price, current price, unrealized P&L, P&L percentage
 * - Include close button for each position
 */
export function PositionsTable({
  positions,
  onClosePosition,
  isLoading,
}: PositionsTableProps) {
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null);
  const [confirmingPosition, setConfirmingPosition] = useState<PearPosition | null>(
    null
  );
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseClick = (positionId: string) => {
    const position = positions.find((p) => p.positionId === positionId);
    if (position) {
      setConfirmingPosition(position);
    }
  };

  const handleConfirmClose = async () => {
    if (!confirmingPosition) return;

    setIsClosing(true);
    setClosingPositionId(confirmingPosition.positionId);
    try {
      await onClosePosition(confirmingPosition.positionId);
      setConfirmingPosition(null);
    } catch (error) {
      console.error('Failed to close position:', error);
    } finally {
      setIsClosing(false);
      setClosingPositionId(null);
    }
  };

  const handleCancelClose = () => {
    setConfirmingPosition(null);
  };

  // Task 5.8: Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Open Positions</h3>
        <PositionSkeleton />
        <PositionSkeleton />
      </div>
    );
  }

  // Task 5.8: Empty state
  if (positions.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Open Positions</h3>
        <div className="card p-8 text-center">
          <div className="text-[var(--muted)]">No open positions</div>
          <p className="text-sm text-[var(--muted)] mt-2">
            Your open positions will appear here once you execute trades.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Open Positions</h3>
      {positions.map((position) => (
        <PositionCard
          key={position.positionId}
          position={position}
          onClose={handleCloseClick}
        />
      ))}

      {/* Confirmation Dialog */}
      {confirmingPosition && (
        <CloseConfirmationDialog
          position={confirmingPosition}
          onConfirm={handleConfirmClose}
          onCancel={handleCancelClose}
          isClosing={isClosing}
        />
      )}
    </div>
  );
}
