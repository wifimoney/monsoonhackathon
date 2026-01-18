'use client';

import { useState, useEffect, useRef } from 'react';
import { getHyperliquidAccountState } from '@/lib/pear-client';

/**
 * State for the available margin hook
 */
interface AvailableMarginState {
  accountValue: number | null;
  withdrawable: number | null;
  totalMarginUsed: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for fetching available margin from Hyperliquid account state.
 *
 * Task 2.4: Create src/hooks/useAvailableMargin.ts hook
 * - Uses getHyperliquidAccountState(address) from src/lib/pear-client.ts
 * - Returns { accountValue, withdrawable, totalMarginUsed }
 * - Refreshes on wallet address change
 *
 * @param address - The wallet address to fetch margin for (null if not connected)
 * @returns Object containing account value, withdrawable balance, total margin used, loading state, and error
 */
export function useAvailableMargin(address: string | null | undefined) {
  const [state, setState] = useState<AvailableMarginState>({
    accountValue: null,
    withdrawable: null,
    totalMarginUsed: null,
    loading: false,
    error: null,
  });

  // Ref to track mounted state
  const mountedRef = useRef(true);

  /**
   * Effect to fetch margin data when address changes
   */
  useEffect(() => {
    mountedRef.current = true;

    // Don't fetch if no address
    if (!address) {
      setState({
        accountValue: null,
        withdrawable: null,
        totalMarginUsed: null,
        loading: false,
        error: null,
      });
      return;
    }

    const fetchMarginData = async () => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const accountState = await getHyperliquidAccountState(address);

        if (mountedRef.current) {
          if (accountState) {
            setState({
              accountValue: accountState.accountValue,
              withdrawable: accountState.withdrawable,
              totalMarginUsed: accountState.totalMarginUsed,
              loading: false,
              error: null,
            });
          } else {
            setState({
              accountValue: null,
              withdrawable: null,
              totalMarginUsed: null,
              loading: false,
              error: 'Failed to fetch account state',
            });
          }
        }
      } catch (error) {
        if (mountedRef.current) {
          setState({
            accountValue: null,
            withdrawable: null,
            totalMarginUsed: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch margin data',
          });
        }
      }
    };

    fetchMarginData();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
    };
  }, [address]);

  /**
   * Function to manually refresh margin data
   */
  const refresh = async () => {
    if (!address) return;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const accountState = await getHyperliquidAccountState(address);

      if (mountedRef.current) {
        if (accountState) {
          setState({
            accountValue: accountState.accountValue,
            withdrawable: accountState.withdrawable,
            totalMarginUsed: accountState.totalMarginUsed,
            loading: false,
            error: null,
          });
        } else {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Failed to fetch account state',
          }));
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch margin data',
        }));
      }
    }
  };

  return {
    accountValue: state.accountValue,
    withdrawable: state.withdrawable,
    totalMarginUsed: state.totalMarginUsed,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
