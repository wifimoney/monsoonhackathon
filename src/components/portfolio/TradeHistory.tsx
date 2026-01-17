'use client';

import type { TradeHistoryEntry } from '@/lib/pear-client';

/**
 * Props for TradeHistory component
 * Task 5.5: Display recent trades list
 */
interface TradeHistoryProps {
  /** List of trade history entries */
  trades: TradeHistoryEntry[];
  /** Loading state */
  isLoading: boolean;
}

/**
 * Loading skeleton for trade history
 * Task 5.8: Loading skeletons while fetching data
 */
function TradeHistorySkeleton() {
  return (
    <div className="border-b border-[var(--card-border)] py-3 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-5 w-20 bg-[var(--card-border)] rounded" />
          <div className="h-5 w-12 bg-[var(--card-border)] rounded" />
        </div>
        <div className="h-5 w-16 bg-[var(--card-border)] rounded" />
      </div>
    </div>
  );
}

/**
 * Format currency value
 */
function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00';
  }
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value === 0) return '$0.00';
  return value > 0 ? `+$${formatted}` : `-$${formatted}`;
}

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(timestamp: string | undefined | null): string {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Get pair string from trade assets
 * Handles closedLongAssets and closedShortAssets from current API
 */
function getTradePairString(trade: TradeHistoryEntry): string {
  // Try to build pair from closedLongAssets/closedShortAssets (current API format)
  const getLongCoins = () => {
    if (trade.closedLongAssets && trade.closedLongAssets.length > 0) {
      return trade.closedLongAssets.map((a) => a.coin).join(',');
    }
    if (trade.positionLongAssets && trade.positionLongAssets.length > 0) {
      return trade.positionLongAssets.join(',');
    }
    return '';
  };

  const getShortCoins = () => {
    if (trade.closedShortAssets && trade.closedShortAssets.length > 0) {
      return trade.closedShortAssets.map((a) => a.coin).join(',');
    }
    if (trade.positionShortAssets && trade.positionShortAssets.length > 0) {
      return trade.positionShortAssets.join(',');
    }
    return '';
  };

  const longStr = getLongCoins();
  const shortStr = getShortCoins();

  if (longStr && shortStr) {
    return `${longStr}/${shortStr}`;
  }

  // Fall back to legacy fields
  return trade.pair ?? trade.symbol ?? trade.asset ?? 'Unknown';
}

/**
 * Single trade history row
 */
function TradeHistoryRow({ trade }: { trade: TradeHistoryEntry }) {
  // Use correct field names: realizedPnl (lowercase), createdAt, totalValue
  const pnl = trade.realizedPnl ?? trade.realizedPnL ?? trade.pnl ?? 0;
  const pnlPercent = trade.realizedPnlPercentage ?? 0;
  const hasPnL = pnl !== 0;
  const isProfitable = pnl > 0;
  const size = trade.totalValue ?? trade.size ?? trade.notional ?? 0;
  const entryValue = trade.totalEntryValue ?? trade.price ?? trade.entryPrice ?? 0;
  const pair = getTradePairString(trade);
  const timestamp = trade.createdAt ?? trade.timestamp ?? trade.time ?? new Date().toISOString();

  // Determine if long or short based on assets
  const hasLongAssets = (trade.closedLongAssets && trade.closedLongAssets.length > 0) ||
                        (trade.positionLongAssets && trade.positionLongAssets.length > 0);
  const hasShortAssets = (trade.closedShortAssets && trade.closedShortAssets.length > 0) ||
                         (trade.positionShortAssets && trade.positionShortAssets.length > 0);

  return (
    <div className="border-b border-[var(--card-border)] py-3 last:border-0">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <span className="font-mono font-semibold">{pair}</span>
          {hasLongAssets && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[rgba(34,197,94,0.2)] text-[var(--accent)]">
              LONG
            </span>
          )}
          {hasShortAssets && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[rgba(239,68,68,0.2)] text-[var(--danger)]">
              SHORT
            </span>
          )}
        </div>
        <div className="text-right">
          <div
            className={`font-mono ${
              hasPnL
                ? isProfitable
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--danger)]'
                : 'text-[var(--muted)]'
            }`}
          >
            {formatCurrency(pnl)}
            {pnlPercent !== 0 && (
              <span className="text-xs ml-1">({pnlPercent.toFixed(2)}%)</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-4">
          <span>Value: <span className="font-mono">${size.toLocaleString()}</span></span>
          <span>Entry: <span className="font-mono">${entryValue.toLocaleString()}</span></span>
        </div>
        <span>{formatTimestamp(timestamp)}</span>
      </div>
    </div>
  );
}

/**
 * TradeHistory component
 * Task 5.5: Display recent trades list
 * - Show: pair, side, size, price, timestamp, realized P&L
 * - Sortable by timestamp (most recent first)
 */
export function TradeHistory({ trades = [], isLoading }: TradeHistoryProps) {
  // Sort trades by timestamp (most recent first)
  // Use createdAt (actual API field) with fallback to timestamp
  const tradesList = Array.isArray(trades) ? trades : [];
  const sortedTrades = [...tradesList].sort((a, b) => {
    const aTime = a.createdAt ?? a.timestamp ?? '';
    const bTime = b.createdAt ?? b.timestamp ?? '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // Task 5.8: Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Trade History</h3>
        <div className="card p-4">
          <TradeHistorySkeleton />
          <TradeHistorySkeleton />
          <TradeHistorySkeleton />
        </div>
      </div>
    );
  }

  // Task 5.8: Empty state
  if (tradesList.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Trade History</h3>
        <div className="card p-8 text-center">
          <div className="text-[var(--muted)]">No trade history</div>
          <p className="text-sm text-[var(--muted)] mt-2">
            Your trade history will appear here once you execute trades.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Trade History</h3>
      <div className="card p-4">
        {sortedTrades.map((trade, index) => (
          <TradeHistoryRow
            key={trade.tradeHistoryId ?? trade.tradeId ?? trade.id ?? `trade-${index}`}
            trade={trade}
          />
        ))}
      </div>
    </div>
  );
}
