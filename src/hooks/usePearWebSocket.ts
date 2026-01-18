'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getStoredTokens } from '@/lib/pear-client';
import type {
  PearPosition,
  TradeHistoryEntry,
  PortfolioMetrics,
} from '@/lib/pear-client';

/**
 * WebSocket URL for Pear Protocol
 * Task 6.2: Connect to wss://hl-v2.pearprotocol.io/ws
 */
const WEBSOCKET_URL = 'wss://hl-v2.pearprotocol.io/ws';

/**
 * Task 6.3: Channels to subscribe to
 */
const CHANNELS = ['positions', 'trade-histories', 'account-summary'] as const;

/**
 * Task 6.5: Reconnection configuration
 * Exponential backoff: 1s, 2s, 4s, 8s, max 30s
 */
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

/**
 * Connection states
 * Task 6.2: Manage connection state: connected, connecting, disconnected
 */
export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

/**
 * WebSocket message structure
 */
interface WebSocketMessage {
  channel: string;
  data: unknown;
}

/**
 * Position update message data
 * Note: API may return array directly or { positions: [...] }
 */
interface PositionUpdateData {
  positions: PearPosition[];
}

/**
 * Trade history update message data
 * Note: API may return array directly or { trades: [...] }
 */
interface TradeHistoryUpdateData {
  trades: TradeHistoryEntry[];
}

/**
 * Account summary update message data
 * Note: API may return different field names, handler normalizes to PortfolioMetrics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AccountSummaryUpdateData {
  totalAccountValue?: number;
  totalUnrealizedPnL?: number;
  totalRealizedPnL?: number;
  marginUsage?: number;
}

/**
 * Custom hook for managing Pear Protocol WebSocket connections
 *
 * Task 6.2: Create src/hooks/usePearWebSocket.ts
 * - Connect to wss://hl-v2.pearprotocol.io/ws
 * - Include JWT token in WebSocket connection for authentication
 * - Manage connection state: connected, connecting, disconnected
 *
 * Task 6.3: Implement channel subscriptions
 * - Subscribe to "positions" channel for position updates
 * - Subscribe to "trade-histories" channel for trade history updates
 * - Subscribe to "account-summary" channel for portfolio metrics
 *
 * Task 6.4: Implement message handling
 * - Parse WebSocket messages by channel type
 * - Update React state on position updates (live P&L)
 * - Update state on trade history updates
 * - Update state on account summary updates
 *
 * Task 6.5: Implement reconnection logic
 * - Handle disconnect events
 * - Implement exponential backoff (1s, 2s, 4s, 8s, max 30s)
 * - Auto-reconnect and re-subscribe to channels
 */
export function usePearWebSocket() {
  // Connection state
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');

  // Data states
  const [positions, setPositions] = useState<PearPosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryEntry[]>([]);
  const [accountSummary, setAccountSummary] = useState<PortfolioMetrics | null>(
    null
  );

  // Refs for WebSocket management (avoids stale closures)
  const wsRef = useRef<WebSocket | null>(null);
  const addressRef = useRef<string | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  /**
   * Calculate reconnection delay with exponential backoff
   * Task 6.5: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
   */
  const getReconnectDelay = useCallback(() => {
    const delay =
      RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptRef.current);
    return Math.min(delay, RECONNECT_MAX_DELAY_MS);
  }, []);

  /**
   * Send subscription message to WebSocket
   * Task 6.3: Subscribe to channels on connection
   */
  const sendSubscription = useCallback((address: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const subscriptionMessage = {
        action: 'subscribe',
        address: address,
        channels: [...CHANNELS],
      };
      wsRef.current.send(JSON.stringify(subscriptionMessage));
    }
  }, []);

  /**
   * Handle incoming WebSocket messages
   * Task 6.4: Parse messages by channel type and update state
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      console.log('[WebSocket] Received message:', message.channel, message.data);

      switch (message.channel) {
        case 'positions': {
          // Task 6.4: Update React state on position updates (live P&L)
          // API returns array directly or { positions: [...] }
          const positionData = message.data;
          console.log('[WebSocket] Position data:', positionData);
          if (Array.isArray(positionData)) {
            setPositions(positionData as PearPosition[]);
          } else if ((positionData as PositionUpdateData)?.positions) {
            setPositions((positionData as PositionUpdateData).positions);
          }
          break;
        }

        case 'trade-histories': {
          // Task 6.4: Update state on trade history updates
          // API returns array directly or { trades: [...] }
          const tradeData = message.data;
          console.log('[WebSocket] Trade history data:', tradeData);
          if (Array.isArray(tradeData)) {
            setTradeHistory(tradeData as TradeHistoryEntry[]);
          } else if ((tradeData as TradeHistoryUpdateData)?.trades) {
            setTradeHistory((tradeData as TradeHistoryUpdateData).trades);
          }
          break;
        }

        case 'account-summary': {
          // Task 6.4: Update state on account summary updates
          const summaryData = message.data as Record<string, unknown>;
          console.log('[WebSocket] Account summary data:', summaryData);
          if (summaryData) {
            // Handle nested 'overall' structure (same as /portfolio API)
            const overall = summaryData.overall as Record<string, unknown> | undefined;
            const data = overall || summaryData;

            // Calculate realized P&L from winning/losing if available
            const totalWinningUsd = (data.totalWinningUsd as number) ?? 0;
            const totalLosingUsd = (data.totalLosingUsd as number) ?? 0;
            const calculatedRealizedPnL = totalWinningUsd - totalLosingUsd;

            const positionsValue = (data.totalPositionsValue as number) ??
                                   (data.totalAccountValue as number) ??
                                   (data.accountValue as number) ??
                                   (data.currentOpenInterest as number) ?? 0;

            setAccountSummary({
              totalPositionsValue: positionsValue,
              availableBalance: (data.availableBalance as number) ?? 0,
              totalUnrealizedPnL: (data.totalUnrealizedPnL as number) ??
                                  (data.unrealizedPnL as number) ??
                                  (data.unrealizedPnl as number) ?? 0,
              totalRealizedPnL: (data.totalRealizedPnL as number) ??
                                (data.realizedPnL as number) ??
                                (data.realizedPnl as number) ??
                                (totalWinningUsd || totalLosingUsd ? calculatedRealizedPnL : 0),
              marginUsage: (data.marginUsage as number) ??
                           (data.marginRatio as number) ?? 0,
            });
          }
          break;
        }

        default:
          // Unknown channel - ignore
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);

  /**
   * Attempt to reconnect with exponential backoff
   * Task 6.5: Auto-reconnect and re-subscribe to channels
   */
  const attemptReconnect = useCallback(() => {
    if (!shouldReconnectRef.current || !addressRef.current) {
      return;
    }

    const delay = getReconnectDelay();
    reconnectAttemptRef.current += 1;

    console.log(
      `WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (addressRef.current && shouldReconnectRef.current) {
        connectInternal(addressRef.current);
      }
    }, delay);
  }, [getReconnectDelay]);

  /**
   * Internal connect function (used for initial connect and reconnect)
   */
  const connectInternal = useCallback(
    (address: string) => {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnection trigger
        wsRef.current.close();
        wsRef.current = null;
      }

      // Get JWT token for authentication
      // Task 6.2: Include JWT token in WebSocket connection for authentication
      const tokens = getStoredTokens();
      if (!tokens?.accessToken) {
        console.error('No access token available for WebSocket connection');
        setConnectionState('disconnected');
        return;
      }

      setConnectionState('connecting');

      // Build WebSocket URL with token
      const wsUrl = `${WEBSOCKET_URL}?token=${encodeURIComponent(tokens.accessToken)}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionState('connected');
          reconnectAttemptRef.current = 0; // Reset reconnect attempts on successful connection

          // Task 6.3: Subscribe to channels on connection
          sendSubscription(address);
        };

        ws.onmessage = handleMessage;

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          setConnectionState('disconnected');

          // Task 6.5: Handle disconnect events with exponential backoff
          if (shouldReconnectRef.current) {
            attemptReconnect();
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionState('disconnected');
        attemptReconnect();
      }
    },
    [sendSubscription, handleMessage, attemptReconnect]
  );

  /**
   * Connect to WebSocket
   * Task 6.6: Connect on portfolio page mount
   */
  const connect = useCallback(
    (address: string) => {
      addressRef.current = address;
      shouldReconnectRef.current = true;
      reconnectAttemptRef.current = 0;
      connectInternal(address);
    },
    [connectInternal]
  );

  /**
   * Disconnect from WebSocket
   * Task 6.6: Disconnect on portfolio page unmount
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    addressRef.current = null;

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnection trigger
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, []);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return {
    // Connection state
    connectionState,

    // Data from WebSocket
    positions,
    tradeHistory,
    accountSummary,

    // Actions
    connect,
    disconnect,
  };
}
