'use client';

import type { PortfolioMetrics as PortfolioMetricsType } from '@/lib/pear-client';

/**
 * Props for PortfolioMetrics component
 * Task 5.6: Display portfolio summary metrics
 */
interface PortfolioMetricsProps {
  /** Portfolio metrics data */
  metrics: PortfolioMetricsType | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Loading skeleton for metrics card
 * Task 5.8: Loading skeletons while fetching data
 */
function MetricSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-[var(--card-border)] rounded mb-2" />
      <div className="h-6 w-32 bg-[var(--card-border)] rounded" />
    </div>
  );
}

/**
 * Format currency value - handles undefined/NaN
 */
function formatCurrency(value: number | undefined | null, showSign = false): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00';
  }

  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!showSign) {
    return `$${formatted}`;
  }

  if (value === 0) return '$0.00';
  return value > 0 ? `+$${formatted}` : `-$${formatted}`;
}

/**
 * Format percentage value (0-1 to 0-100) - handles undefined/NaN
 */
function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Single metric card
 */
function MetricCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)] mb-1">{label}</div>
      <div
        className="text-xl font-mono font-semibold"
        style={{ color: valueColor }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * PortfolioMetrics component
 * Task 5.6: Display portfolio summary metrics
 * - Show: total account value, total unrealized P&L, total realized P&L, margin usage
 * - Use card layout consistent with existing design
 */
export function PortfolioMetrics({
  metrics,
  isLoading,
}: PortfolioMetricsProps) {
  // Task 5.8: Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Portfolio Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <MetricSkeleton />
          </div>
          <div className="card p-4">
            <MetricSkeleton />
          </div>
          <div className="card p-4">
            <MetricSkeleton />
          </div>
          <div className="card p-4">
            <MetricSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Task 5.8: Empty state (no metrics available)
  if (!metrics) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Portfolio Summary</h3>
        <div className="card p-8 text-center">
          <div className="text-[var(--muted)]">Portfolio data unavailable</div>
          <p className="text-sm text-[var(--muted)] mt-2">
            Connect your wallet and authenticate to view your portfolio.
          </p>
        </div>
      </div>
    );
  }

  const unrealizedPnL = metrics.totalUnrealizedPnL ?? 0;
  const realizedPnL = metrics.totalRealizedPnL ?? 0;
  const marginUsage = metrics.marginUsage ?? 0;

  const unrealizedPnLColor =
    unrealizedPnL >= 0 ? 'var(--accent)' : 'var(--danger)';
  const realizedPnLColor =
    realizedPnL >= 0 ? 'var(--accent)' : 'var(--danger)';

  // Margin usage color (warning if > 70%, danger if > 90%)
  const marginUsageColor =
    marginUsage > 0.9
      ? 'var(--danger)'
      : marginUsage > 0.7
      ? '#f59e0b' // warning yellow
      : 'var(--foreground)';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Portfolio Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Account Value"
          value={formatCurrency(metrics.totalAccountValue ?? 0)}
        />
        <MetricCard
          label="Unrealized P&L"
          value={formatCurrency(unrealizedPnL, true)}
          valueColor={unrealizedPnLColor}
        />
        <MetricCard
          label="Realized P&L"
          value={formatCurrency(realizedPnL, true)}
          valueColor={realizedPnLColor}
        />
        <MetricCard
          label="Margin Usage"
          value={formatPercentage(marginUsage)}
          valueColor={marginUsageColor}
        />
      </div>
    </div>
  );
}
