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
function formatCurrency(value: number): string {
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
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Single trade history row
 */
function TradeHistoryRow({ trade }: { trade: TradeHistoryEntry }) {
  const isLong = trade.side === 'LONG';
  const hasPnL = trade.realizedPnL !== 0;
  const isProfitable = trade.realizedPnL > 0;

  return (
    <div className="border-b border-[var(--card-border)] py-3 last:border-0">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <span className="font-mono font-semibold">{trade.pair}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded font-semibold ${
              isLong
                ? 'bg-[rgba(34,197,94,0.2)] text-[var(--accent)]'
                : 'bg-[rgba(239,68,68,0.2)] text-[var(--danger)]'
            }`}
          >
            {trade.side}
          </span>
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
            {formatCurrency(trade.realizedPnL)}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-4">
          <span>Size: <span className="font-mono">${trade.size.toLocaleString()}</span></span>
          <span>Price: <span className="font-mono">${trade.price.toLocaleString()}</span></span>
        </div>
        <span>{formatTimestamp(trade.timestamp)}</span>
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
export function TradeHistory({ trades, isLoading }: TradeHistoryProps) {
  // Sort trades by timestamp (most recent first)
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

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
  if (trades.length === 0) {
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
        {sortedTrades.map((trade) => (
          <TradeHistoryRow key={trade.tradeId} trade={trade} />
        ))}
      </div>
    </div>
  );
}
