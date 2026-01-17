'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { PositionsTable, TradeHistory, PortfolioMetrics } from '@/components/portfolio';
import { usePearWebSocket } from '@/hooks/usePearWebSocket';
import {
  getPositions,
  getTradeHistory,
  getPortfolio,
  getHyperliquidAccountState,
  closePosition,
  isAuthenticated,
  type PearPosition,
  type TradeHistoryEntry,
  type PortfolioMetrics as PortfolioMetricsType,
} from '@/lib/pear-client';

/**
 * Portfolio page component
 * Task 5.3: Create portfolio page with three sections
 * - Open Positions
 * - Trade History
 * - Portfolio Metrics
 *
 * Task 6.6: Integrate WebSocket into portfolio page
 * - Connect on portfolio page mount
 * - Disconnect on portfolio page unmount
 * - Pass WebSocket data to child components
 */
export default function PortfolioPage() {
  // Get connected wallet address
  const { address } = useAccount();

  // Task 6.6: WebSocket hook for real-time updates
  const {
    connectionState,
    positions: wsPositions,
    tradeHistory: wsTradeHistory,
    accountSummary: wsAccountSummary,
    connect,
    disconnect,
  } = usePearWebSocket();

  // State for portfolio data (initial fetch)
  const [positions, setPositions] = useState<PearPosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryEntry[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetricsType | null>(null);
  const [hyperliquidBalance, setHyperliquidBalance] = useState<number>(0);

  // Loading states
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all portfolio data (initial fetch via REST API)
   */
  const fetchPortfolioData = useCallback(async () => {
    // Check if authenticated first
    if (!isAuthenticated()) {
      setPositionsLoading(false);
      setHistoryLoading(false);
      setMetricsLoading(false);
      return;
    }

    setError(null);

    // Fetch positions
    setPositionsLoading(true);
    try {
      const positionsData = await getPositions();
      console.log('[Portfolio] Raw positions response:', positionsData);
      // API returns array directly (only open positions)
      const positionsList = Array.isArray(positionsData) ? positionsData : [];
      console.log('[Portfolio] Positions list:', positionsList);
      // API only returns OPEN positions, no need to filter by status
      setPositions(positionsList);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setPositions([]);
    } finally {
      setPositionsLoading(false);
    }

    // Fetch trade history
    setHistoryLoading(true);
    try {
      const historyData = await getTradeHistory();
      console.log('[Portfolio] Raw trade history response:', historyData);
      // API returns array directly (not { trades: [...] })
      const tradesList = Array.isArray(historyData) ? historyData : [];
      console.log('[Portfolio] Trade history list:', tradesList);
      setTradeHistory(tradesList);
    } catch (err) {
      console.error('Failed to fetch trade history:', err);
      setTradeHistory([]);
    } finally {
      setHistoryLoading(false);
    }

    // Fetch portfolio metrics
    setMetricsLoading(true);
    try {
      const metricsData = await getPortfolio();
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to fetch portfolio metrics:', err);
    } finally {
      setMetricsLoading(false);
    }

    // Fetch Hyperliquid account state for available balance
    if (address) {
      try {
        const hlState = await getHyperliquidAccountState(address);
        if (hlState) {
          setHyperliquidBalance(hlState.withdrawable);
        }
      } catch (err) {
        console.error('Failed to fetch Hyperliquid account state:', err);
      }
    }
  }, [address]);

  /**
   * Handle closing a position
   * Task 5.7: Implement close position functionality
   */
  const handleClosePosition = useCallback(async (positionId: string) => {
    try {
      await closePosition(positionId);
      // Update positions list after successful close
      // WebSocket will also update, but this provides immediate feedback
      setPositions((prev) => prev.filter((p) => p.positionId !== positionId));
    } catch (err) {
      console.error('Failed to close position:', err);
      throw err; // Re-throw so the UI can handle it
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  /**
   * Task 6.6: Connect on portfolio page mount, disconnect on unmount
   */
  useEffect(() => {
    // Only connect if authenticated and wallet is connected
    if (isAuthenticated() && address) {
      connect(address);
    }

    // Disconnect on unmount
    return () => {
      disconnect();
    };
  }, [address, connect, disconnect]);

  /**
   * Task 6.6: Update state from WebSocket data
   * WebSocket provides real-time updates, REST API provides initial data
   */
  useEffect(() => {
    if (wsPositions.length > 0) {
      // API only returns OPEN positions, no need to filter by status
      setPositions(wsPositions);
    }
  }, [wsPositions]);

  useEffect(() => {
    if (wsTradeHistory.length > 0) {
      setTradeHistory(wsTradeHistory);
    }
  }, [wsTradeHistory]);

  useEffect(() => {
    if (wsAccountSummary) {
      setMetrics(wsAccountSummary);
    }
  }, [wsAccountSummary]);

  // Derive display data - use WebSocket data when available (real-time), otherwise REST API data
  // API only returns OPEN positions, no need to filter by status
  const displayPositions = wsPositions.length > 0 ? wsPositions : positions;
  const displayTradeHistory = wsTradeHistory.length > 0 ? wsTradeHistory : tradeHistory;

  // Calculate metrics from positions and trade history if API metrics are empty/zero
  const calculatedMetrics = useMemo(() => {
    if (displayPositions.length === 0 && displayTradeHistory.length === 0 && hyperliquidBalance === 0) return null;

    let totalPositionsValue = 0;
    let totalUnrealizedPnL = 0;
    let totalMarginUsed = 0;

    for (const pos of displayPositions) {
      totalPositionsValue += pos.positionValue ?? pos.size ?? 0;
      totalUnrealizedPnL += pos.unrealizedPnl ?? pos.unrealizedPnL ?? 0;
      totalMarginUsed += pos.marginUsed ?? 0;
    }

    // Calculate realized P&L from trade history
    let totalRealizedPnL = 0;
    for (const trade of displayTradeHistory) {
      totalRealizedPnL += trade.realizedPnl ?? trade.realizedPnL ?? trade.pnl ?? 0;
    }

    return {
      totalPositionsValue: totalPositionsValue,
      availableBalance: hyperliquidBalance, // Use actual Hyperliquid withdrawable balance
      totalUnrealizedPnL: totalUnrealizedPnL,
      totalRealizedPnL: totalRealizedPnL,
      marginUsage: totalPositionsValue > 0 ? totalMarginUsed / totalPositionsValue : 0,
    };
  }, [displayPositions, displayTradeHistory, hyperliquidBalance]);

  // Use calculated metrics if API metrics show zeros but we have positions
  const displayMetrics = useMemo(() => {
    const apiMetrics = wsAccountSummary || metrics;

    // If API returned valid data, use it but override availableBalance with Hyperliquid value
    const apiPositionsValue = apiMetrics?.totalPositionsValue ?? apiMetrics?.totalAccountValue ?? 0;
    if (apiMetrics && (apiPositionsValue > 0 || apiMetrics.totalUnrealizedPnL !== 0)) {
      return {
        ...apiMetrics,
        availableBalance: hyperliquidBalance, // Always use Hyperliquid withdrawable balance
      };
    }

    // Fall back to calculated metrics from positions
    return calculatedMetrics || apiMetrics;
  }, [wsAccountSummary, metrics, calculatedMetrics, hyperliquidBalance]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Portfolio</h2>
            <p className="text-[var(--muted)] mt-1">
              View your open positions, trade history, and portfolio metrics
            </p>
          </div>
          {/* Connection status indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-green-500'
                  : connectionState === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-500'
              }`}
            />
            <span className="text-[var(--muted)]">
              {connectionState === 'connected'
                ? 'Live'
                : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div
          className="card p-4 border-[var(--danger)]"
          style={{ borderColor: 'var(--danger)' }}
        >
          <div className="text-[var(--danger)] font-medium">{error}</div>
          <button
            onClick={fetchPortfolioData}
            className="btn btn-secondary mt-2 py-1 px-3 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Portfolio Metrics Section */}
      <PortfolioMetrics metrics={displayMetrics} isLoading={metricsLoading} />

      {/* Open Positions Section */}
      <PositionsTable
        positions={displayPositions}
        onClosePosition={handleClosePosition}
        isLoading={positionsLoading}
      />

      {/* Trade History Section */}
      <TradeHistory trades={displayTradeHistory} isLoading={historyLoading} />
    </div>
  );
}
