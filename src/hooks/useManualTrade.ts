'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Interface for a position in a trade basket.
 * Task 1.2: Interface for position: { symbol: string, weight: number, price: number }
 */
export interface ManualPosition {
  /** Token symbol (e.g., 'BTC', 'ETH') */
  symbol: string;
  /** Weight as a percentage (0-100) of total basket */
  weight: number;
  /** Current price in USD */
  price: number;
}

/**
 * Validation result for trade
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * State for the manual trade hook
 */
interface ManualTradeState {
  longPositions: ManualPosition[];
  shortPositions: ManualPosition[];
  size: number;
  leverage: number;
}

/**
 * Custom hook for managing manual basket trade state.
 *
 * Task 1.2: Create src/hooks/useManualTrade.ts hook
 * - State: longPositions[], shortPositions[], size, leverage
 * - Follow same ref pattern as usePearAuth to avoid stale closures
 */
export function useManualTrade() {
  const [state, setState] = useState<ManualTradeState>({
    longPositions: [],
    shortPositions: [],
    size: 0,
    leverage: 2,
  });

  // Ref to avoid stale closures (following usePearAuth pattern)
  const stateRef = useRef<ManualTradeState>(state);

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Task 1.3: Add token to specified side with 0% initial weight
   */
  const addToken = useCallback((side: 'long' | 'short', symbol: string) => {
    const newPosition: ManualPosition = {
      symbol,
      weight: 0,
      price: 0,
    };

    setState((prev) => {
      if (side === 'long') {
        // Check if token already exists
        if (prev.longPositions.some((p) => p.symbol === symbol)) {
          return prev;
        }
        return {
          ...prev,
          longPositions: [...prev.longPositions, newPosition],
        };
      } else {
        // Check if token already exists
        if (prev.shortPositions.some((p) => p.symbol === symbol)) {
          return prev;
        }
        return {
          ...prev,
          shortPositions: [...prev.shortPositions, newPosition],
        };
      }
    });
  }, []);

  /**
   * Task 1.3: Remove token from specified side
   */
  const removeToken = useCallback((side: 'long' | 'short', symbol: string) => {
    setState((prev) => {
      if (side === 'long') {
        return {
          ...prev,
          longPositions: prev.longPositions.filter((p) => p.symbol !== symbol),
        };
      } else {
        return {
          ...prev,
          shortPositions: prev.shortPositions.filter((p) => p.symbol !== symbol),
        };
      }
    });
  }, []);

  /**
   * Task 1.3: Update weight for specific token
   */
  const updateWeight = useCallback(
    (side: 'long' | 'short', symbol: string, weight: number) => {
      setState((prev) => {
        if (side === 'long') {
          return {
            ...prev,
            longPositions: prev.longPositions.map((p) =>
              p.symbol === symbol ? { ...p, weight } : p
            ),
          };
        } else {
          return {
            ...prev,
            shortPositions: prev.shortPositions.map((p) =>
              p.symbol === symbol ? { ...p, weight } : p
            ),
          };
        }
      });
    },
    []
  );

  /**
   * Task 1.3: Update price for specific token
   */
  const updatePrice = useCallback(
    (side: 'long' | 'short', symbol: string, price: number) => {
      setState((prev) => {
        if (side === 'long') {
          return {
            ...prev,
            longPositions: prev.longPositions.map((p) =>
              p.symbol === symbol ? { ...p, price } : p
            ),
          };
        } else {
          return {
            ...prev,
            shortPositions: prev.shortPositions.map((p) =>
              p.symbol === symbol ? { ...p, price } : p
            ),
          };
        }
      });
    },
    []
  );

  /**
   * Task 1.4: Returns sum of all weights (long + short)
   */
  const getTotalWeight = useCallback((): number => {
    const current = stateRef.current;
    const longTotal = current.longPositions.reduce((sum, p) => sum + p.weight, 0);
    const shortTotal = current.shortPositions.reduce((sum, p) => sum + p.weight, 0);
    return longTotal + shortTotal;
  }, []);

  /**
   * Task 1.4: Returns sum of long side weights
   */
  const getLongWeight = useCallback((): number => {
    const current = stateRef.current;
    return current.longPositions.reduce((sum, p) => sum + p.weight, 0);
  }, []);

  /**
   * Task 1.4: Returns sum of short side weights
   */
  const getShortWeight = useCallback((): number => {
    const current = stateRef.current;
    return current.shortPositions.reduce((sum, p) => sum + p.weight, 0);
  }, []);

  /**
   * Task 1.4: Distribute weights equally within each side
   * Each side gets 50% of total (if both sides have positions)
   * Within each side, weights are distributed equally among tokens
   */
  const rebalanceWeights = useCallback(() => {
    setState((prev) => {
      const longCount = prev.longPositions.length;
      const shortCount = prev.shortPositions.length;
      const totalCount = longCount + shortCount;

      if (totalCount === 0) return prev;

      // Calculate weight per position to sum to 100% total
      // Each position gets equal share of 100%
      const weightPerPosition = 100 / totalCount;

      return {
        ...prev,
        longPositions: prev.longPositions.map((p) => ({
          ...p,
          weight: weightPerPosition,
        })),
        shortPositions: prev.shortPositions.map((p) => ({
          ...p,
          weight: weightPerPosition,
        })),
      };
    });
  }, []);

  /**
   * Task 1.5: Set USD position size
   */
  const setSize = useCallback((value: number) => {
    setState((prev) => ({
      ...prev,
      size: value,
    }));
  }, []);

  /**
   * Task 1.5: Set leverage (1 to 40 range, integer only)
   */
  const setLeverage = useCallback((value: number) => {
    // Clamp to valid range and ensure integer
    const clampedValue = Math.min(40, Math.max(1, Math.round(value)));
    setState((prev) => ({
      ...prev,
      leverage: clampedValue,
    }));
  }, []);

  /**
   * Task 1.5: Set size to available margin
   */
  const setMaxSize = useCallback((availableMargin: number) => {
    setState((prev) => ({
      ...prev,
      size: availableMargin,
    }));
  }, []);

  /**
   * Task 1.6: Validate trade
   * - Check total weights equal 100%
   * - Check at least one position exists
   * - Check size > 0
   */
  const validateTrade = useCallback((): ValidationResult => {
    const current = stateRef.current;
    const totalPositions = current.longPositions.length + current.shortPositions.length;

    // Check at least one position exists
    if (totalPositions === 0) {
      return {
        valid: false,
        error: 'Trade must have at least one position',
      };
    }

    // Check total weights equal 100%
    const totalWeight =
      current.longPositions.reduce((sum, p) => sum + p.weight, 0) +
      current.shortPositions.reduce((sum, p) => sum + p.weight, 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      return {
        valid: false,
        error: `Total weights must equal 100%. Current total: ${totalWeight.toFixed(1)}%`,
      };
    }

    // Check size > 0
    if (current.size <= 0) {
      return {
        valid: false,
        error: 'Position size must be greater than 0',
      };
    }

    return { valid: true };
  }, []);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    setState({
      longPositions: [],
      shortPositions: [],
      size: 0,
      leverage: 2,
    });
  }, []);

  return {
    // State
    longPositions: state.longPositions,
    shortPositions: state.shortPositions,
    size: state.size,
    leverage: state.leverage,

    // Position management (Task 1.3)
    addToken,
    removeToken,
    updateWeight,
    updatePrice,

    // Weight management (Task 1.4)
    getTotalWeight,
    getLongWeight,
    getShortWeight,
    rebalanceWeights,

    // Trade configuration (Task 1.5)
    setSize,
    setLeverage,
    setMaxSize,

    // Validation (Task 1.6)
    validateTrade,

    // Reset
    reset,
  };
}
