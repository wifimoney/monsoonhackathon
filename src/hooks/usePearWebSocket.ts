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
 */
interface PositionUpdateData {
  positions: PearPosition[];
}

/**
 * Trade history update message data
 */
interface TradeHistoryUpdateData {
  trades: TradeHistoryEntry[];
}

/**
 * Account summary update message data
 */
interface AccountSummaryUpdateData {
  totalAccountValue: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  marginUsage: number;
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

      switch (message.channel) {
        case 'positions': {
          // Task 6.4: Update React state on position updates (live P&L)
          const positionData = message.data as PositionUpdateData;
          if (positionData?.positions) {
            setPositions(positionData.positions);
          }
          break;
        }

        case 'trade-histories': {
          // Task 6.4: Update state on trade history updates
          const tradeData = message.data as TradeHistoryUpdateData;
          if (tradeData?.trades) {
            setTradeHistory(tradeData.trades);
          }
          break;
        }

        case 'account-summary': {
          // Task 6.4: Update state on account summary updates
          const summaryData = message.data as AccountSummaryUpdateData;
          if (summaryData) {
            setAccountSummary({
              totalAccountValue: summaryData.totalAccountValue,
              totalUnrealizedPnL: summaryData.totalUnrealizedPnL,
              totalRealizedPnL: summaryData.totalRealizedPnL,
              marginUsage: summaryData.marginUsage,
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
