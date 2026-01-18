'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { PositionsTable, TradeHistory, PortfolioMetrics } from '@/components/portfolio';
import { usePearWebSocket } from '@/hooks/usePearWebSocket';
import { DataCard } from "@/components/data-card"
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
import { TrendingUp, TrendingDown } from "lucide-react"

/**
 * Get pair string from position assets
 * Handles both array of strings (legacy) and array of PositionAsset objects (current API)
 */
function getPairString(position: PearPosition): string {
  const getLongCoins = () => {
    if (!position.longAssets || position.longAssets.length === 0) return '';
    const first = position.longAssets[0];
    if (typeof first === 'string') {
      return position.longAssets.join(',');
    }
    return position.longAssets.map((a) => (a as { coin: string }).coin).join(',');
  };

  const getShortCoins = () => {
    if (!position.shortAssets || position.shortAssets.length === 0) return '';
    const first = position.shortAssets[0];
    if (typeof first === 'string') {
      return position.shortAssets.join(',');
    }
    return position.shortAssets.map((a) => (a as { coin: string }).coin).join(',');
  };

  const longStr = getLongCoins();
  const shortStr = getShortCoins();

  if (longStr && shortStr) {
    return `${longStr} / ${shortStr}`;
  }
  if (longStr) {
    return `${longStr} Long`;
  }
  if (shortStr) {
    return `${shortStr} Short`;
  }
  return 'Unknown';
}

/**
 * Get leverage from position assets
 * Returns the leverage from the first asset (all assets in a position typically have the same leverage)
 */
function getPositionLeverage(position: PearPosition): number {
  // Try long assets first
  if (position.longAssets && position.longAssets.length > 0) {
    const first = position.longAssets[0];
    if (typeof first !== 'string' && 'leverage' in first) {
      return (first as { leverage: number }).leverage;
    }
  }
  // Try short assets
  if (position.shortAssets && position.shortAssets.length > 0) {
    const first = position.shortAssets[0];
    if (typeof first !== 'string' && 'leverage' in first) {
      return (first as { leverage: number }).leverage;
    }
  }
  return 1; // Default to 1x if not found
}

/**
 * Dashboard Portfolio page
 * Combines portfolio functionality with dashboard styling
 */
export default function DashboardPortfolioPage() {
  // Get connected wallet address
  const { address } = useAccount();

  // WebSocket hook for real-time updates
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
      const positionsList = Array.isArray(positionsData) ? positionsData : [];
      console.log('[Portfolio] Positions list:', positionsList);
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
   */
  const handleClosePosition = useCallback(async (positionId: string) => {
    try {
      await closePosition(positionId);
      setPositions((prev) => prev.filter((p) => p.positionId !== positionId));
    } catch (err) {
      console.error('Failed to close position:', err);
      throw err;
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  // Connect WebSocket on mount, disconnect on unmount
  useEffect(() => {
    if (isAuthenticated() && address) {
      connect(address);
    }
    return () => {
      disconnect();
    };
  }, [address, connect, disconnect]);

  // Update state from WebSocket data
  useEffect(() => {
    if (wsPositions.length > 0) {
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

  // Derive display data
  const displayPositions = wsPositions.length > 0 ? wsPositions : positions;
  const displayTradeHistory = wsTradeHistory.length > 0 ? wsTradeHistory : tradeHistory;

  // Calculate metrics from positions and trade history
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

    let totalRealizedPnL = 0;
    for (const trade of displayTradeHistory) {
      totalRealizedPnL += trade.realizedPnl ?? trade.realizedPnL ?? trade.pnl ?? 0;
    }

    return {
      totalPositionsValue: totalPositionsValue,
      availableBalance: hyperliquidBalance,
      totalUnrealizedPnL: totalUnrealizedPnL,
      totalRealizedPnL: totalRealizedPnL,
      marginUsage: totalPositionsValue > 0 ? totalMarginUsed / totalPositionsValue : 0,
    };
  }, [displayPositions, displayTradeHistory, hyperliquidBalance]);

  // Use calculated metrics if API metrics show zeros but we have positions
  const displayMetrics = useMemo(() => {
    const apiMetrics = wsAccountSummary || metrics;
    const apiPositionsValue = apiMetrics?.totalPositionsValue ?? apiMetrics?.totalAccountValue ?? 0;
    if (apiMetrics && (apiPositionsValue > 0 || apiMetrics.totalUnrealizedPnL !== 0)) {
      return {
        ...apiMetrics,
        availableBalance: hyperliquidBalance,
      };
    }
    return calculatedMetrics || apiMetrics;
  }, [wsAccountSummary, metrics, calculatedMetrics, hyperliquidBalance]);

  // Calculate stats for dashboard cards
  const openPositionsCount = displayPositions.length;
  const totalPnL = displayMetrics?.totalUnrealizedPnL ?? 0;
  const winningTrades = displayTradeHistory.filter(t => (t.realizedPnl ?? t.realizedPnL ?? t.pnl ?? 0) > 0).length;
  const winRate = displayTradeHistory.length > 0 ? Math.round((winningTrades / displayTradeHistory.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DataCard
          title="Open Positions"
          value={openPositionsCount.toString()}
          subtitle="Active trades"
        />
        <DataCard
          title="Unrealized P&L"
          value={`${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Current positions"
        />
        <DataCard
          title="Win Rate"
          value={`${winRate}%`}
          subtitle={`${displayTradeHistory.length} total trades`}
        />
        <DataCard
          title="Available Balance"
          value={`$${hyperliquidBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Withdrawable"
        />
      </div>

      {/* Connection Status & Active Positions */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Active Positions</h2>
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
            <span className="text-muted-foreground">
              {connectionState === 'connected'
                ? 'Live'
                : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="text-red-400 font-medium">{error}</div>
            <button
              onClick={fetchPortfolioData}
              className="mt-2 px-3 py-1 text-sm rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Positions Display */}
        {positionsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-black/30 animate-pulse" />
            ))}
          </div>
        ) : displayPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No open positions
          </div>
        ) : (
          <div className="space-y-4">
            {displayPositions.map((position, i) => {
              const pnl = position.unrealizedPnl ?? position.unrealizedPnL ?? 0;
              const isPositive = pnl >= 0;
              const leverage = getPositionLeverage(position);
              return (
                <div
                  key={position.positionId || i}
                  className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    {isPositive ? (
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-medium text-sm">
                          {getPairString(position)}
                        </p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono">
                          {leverage}x
                        </span>
                      </div>
                      <p className="text-caption font-mono">
                        ${(position.positionValue ?? position.size ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} position
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-mono font-medium text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? '+' : ''}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClosePosition(position.positionId)}
                      className="px-3 py-1 text-xs rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Portfolio Metrics Section */}
      <PortfolioMetrics metrics={displayMetrics} isLoading={metricsLoading} />

      {/* Trade History Section */}
      <TradeHistory trades={displayTradeHistory} isLoading={historyLoading} />
    </div>
  );
}
