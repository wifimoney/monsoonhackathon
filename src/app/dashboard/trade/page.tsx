'use client';

/**
 * Manual Basket Trading Page
 *
 * Task Group 6: Trade Page Integration
 * - Task 6.2: Replace existing swap UI with manual trade UI
 * - Task 6.3: Implement main page layout matching mockup
 * - Task 6.4: Wire up state management
 * - Task 6.5: Implement weight validation display
 * - Task 6.6: Implement auth and execution flow
 * - Task 6.7: Implement trade execution
 *
 * Task Group 7: Error Handling and Loading States
 * - Task 7.2: Implement weight validation error display
 * - Task 7.3: Implement trade execution error handling
 * - Task 7.4: Implement loading states
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Hooks
import { useManualTrade } from '@/hooks/useManualTrade';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { useAvailableMargin } from '@/hooks/useAvailableMargin';
import { usePearAuth } from '@/hooks/usePearAuth';

// Components
import { WeightHeader } from '@/components/trade/WeightHeader';
import { AssetSection } from '@/components/trade/AssetSection';
import { TokenSelectModal } from '@/components/trade/TokenSelectModal';
import { SizeInput } from '@/components/trade/SizeInput';
import { LeverageSlider } from '@/components/trade/LeverageSlider';
import { ConfirmationModal } from '@/components/trade/ConfirmationModal';
import { AuthModal } from '@/components/pear/AuthModal';

// Utils
import { getStoredTokens } from '@/lib/pear-client';

/**
 * Trade details for confirmation modal
 */
interface TradeDetails {
  longPositions: { symbol: string; weight: number }[];
  shortPositions: { symbol: string; weight: number }[];
  size: number;
  leverage: number;
}

/**
 * Pending trade reference for auth flow
 */
interface PendingTrade {
  longPositions: { symbol: string; weight: number }[];
  shortPositions: { symbol: string; weight: number }[];
  size: number;
  leverage: number;
}

/**
 * Error Alert Component
 * Task 7.2: Weight validation error display with icon and clear styling
 */
function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      {/* Error icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-red-500 flex-shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-sm text-red-500">{message}</span>
    </div>
  );
}

/**
 * Success Alert Component
 * Task 7.3: Success message display
 */
function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
      {/* Success icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-emerald-500 flex-shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      <span className="text-sm text-emerald-500">{message}</span>
    </div>
  );
}

/**
 * Loading Spinner Component
 * Task 7.4: Loading indicator for various states
 */
function LoadingSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Skeleton Row for Asset Loading State
 * Task 7.4: Skeleton states for asset rows while loading prices
 */
function AssetRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-zinc-900 rounded-lg animate-pulse">
      {/* Chevron placeholder */}
      <div className="w-4 h-4 bg-zinc-700 rounded" />
      {/* Icon placeholder */}
      <div className="w-8 h-8 bg-zinc-700 rounded-full" />
      {/* Text placeholder */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-700 rounded w-16" />
        <div className="h-3 bg-zinc-700 rounded w-12" />
      </div>
      {/* Weight placeholder */}
      <div className="h-8 bg-zinc-700 rounded w-16" />
      {/* Remove button placeholder */}
      <div className="w-8 h-8 bg-zinc-700 rounded" />
    </div>
  );
}

export default function TradePage() {
  // Get wallet address from wagmi
  const { address } = useAccount();

  // Trade state management hook
  const {
    longPositions,
    shortPositions,
    size,
    leverage,
    addToken,
    removeToken,
    updateWeight,
    updatePrice,
    getTotalWeight,
    getLongWeight,
    getShortWeight,
    rebalanceWeights,
    setSize,
    setLeverage,
    setMaxSize,
    validateTrade,
    reset,
  } = useManualTrade();

  // Get all symbols from positions for price fetching
  const allSymbols = [
    ...longPositions.map((p) => p.symbol),
    ...shortPositions.map((p) => p.symbol),
  ];

  // Token prices hook with loading state
  const { prices, loading: pricesLoading, error: pricesError } = useTokenPrices(allSymbols);

  // Update prices in positions when they change
  useEffect(() => {
    longPositions.forEach((p) => {
      if (prices[p.symbol] && prices[p.symbol] !== p.price) {
        updatePrice('long', p.symbol, prices[p.symbol]);
      }
    });
    shortPositions.forEach((p) => {
      if (prices[p.symbol] && prices[p.symbol] !== p.price) {
        updatePrice('short', p.symbol, prices[p.symbol]);
      }
    });
  }, [prices, longPositions, shortPositions, updatePrice]);

  // Available margin hook with loading state
  const {
    withdrawable,
    accountValue,
    loading: marginLoading,
    error: marginError
  } = useAvailableMargin(address);

  // Pear auth hook
  const { checkAuthStatus } = usePearAuth();

  // Modal states
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenModalTargetSide, setTokenModalTargetSide] = useState<'long' | 'short'>('long');
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionSuccess, setExecutionSuccess] = useState<string | null>(null);

  // Pending trade reference for storing trade during auth flow
  const pendingTradeRef = useRef<PendingTrade | null>(null);

  // Get validation result
  const validation = validateTrade();

  // Excluded symbols for token modal (tokens already in basket)
  const excludedSymbols = [
    ...longPositions.map((p) => p.symbol),
    ...shortPositions.map((p) => p.symbol),
  ];

  /**
   * Handle opening token select modal
   */
  const handleOpenTokenModal = useCallback((side: 'long' | 'short') => {
    setTokenModalTargetSide(side);
    setIsTokenModalOpen(true);
  }, []);

  /**
   * Handle token selection from modal
   */
  const handleTokenSelect = useCallback(
    (symbol: string) => {
      addToken(tokenModalTargetSide, symbol);
      setIsTokenModalOpen(false);
    },
    [addToken, tokenModalTargetSide]
  );

  /**
   * Handle weight change for a position
   */
  const handleWeightChange = useCallback(
    (side: 'long' | 'short', symbol: string, weight: number) => {
      updateWeight(side, symbol, weight);
      // Clear execution error when user corrects weights
      if (executionError) {
        setExecutionError(null);
      }
    },
    [updateWeight, executionError]
  );

  /**
   * Handle removing a position
   */
  const handleRemove = useCallback(
    (side: 'long' | 'short', symbol: string) => {
      removeToken(side, symbol);
    },
    [removeToken]
  );

  /**
   * Handle max button click in size input
   * Max position size = available margin × leverage (rounded down to 2dp)
   */
  const handleMaxSize = useCallback(() => {
    if (withdrawable !== null) {
      const maxSize = Math.floor(withdrawable * leverage * 100) / 100;
      setMaxSize(maxSize);
    }
  }, [withdrawable, leverage, setMaxSize]);

  /**
   * Internal trade execution function
   * Task 7.3: Catch errors and display in modal or toast, allow retry
   */
  const executeTradeInternal = async (trade: PendingTrade) => {
    setIsExecuting(true);
    setExecutionError(null);
    setExecutionSuccess(null);

    try {
      // Get access token
      const tokens = getStoredTokens();
      if (!tokens?.accessToken) {
        throw new Error('No access token found. Please authenticate first.');
      }

      // Generate unique proposal ID
      const proposalId = crypto.randomUUID();

      // Call the API endpoint
      const response = await fetch('/api/ai-trade/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          positionSizeUsd: trade.size,
          leverage: trade.leverage,
          longPositions: trade.longPositions.map((p) => ({
            symbol: p.symbol,
            name: p.symbol,
            weight: p.weight,
            dailyVolume: 0,
          })),
          shortPositions: trade.shortPositions.map((p) => ({
            symbol: p.symbol,
            name: p.symbol,
            weight: p.weight,
            dailyVolume: 0,
          })),
          accessToken: tokens.accessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Trade execution failed');
      }

      // Success
      setExecutionSuccess('Trade executed successfully!');
      setIsConfirmationModalOpen(false);

      // Optionally reset form
      // reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Trade execution failed';
      setExecutionError(errorMessage);
      // Keep confirmation modal open to allow retry
      // Form state is preserved so user can retry
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Handle execute trade button click
   * Task 6.6: Implement auth and execution flow
   */
  const handleExecuteClick = useCallback(async () => {
    // Clear previous messages
    setExecutionError(null);
    setExecutionSuccess(null);

    // Validate trade first
    const validationResult = validateTrade();
    if (!validationResult.valid) {
      setExecutionError(validationResult.error || 'Trade validation failed');
      return;
    }

    // Check auth status
    const isAuthed = await checkAuthStatus();

    if (isAuthed) {
      // User is authenticated, show confirmation modal
      setIsConfirmationModalOpen(true);
    } else {
      // User needs to authenticate first
      // Store pending trade details
      pendingTradeRef.current = {
        longPositions: longPositions.map((p) => ({ symbol: p.symbol, weight: p.weight })),
        shortPositions: shortPositions.map((p) => ({ symbol: p.symbol, weight: p.weight })),
        size,
        leverage,
      };
      // Open auth modal
      setIsAuthModalOpen(true);
    }
  }, [validateTrade, checkAuthStatus, longPositions, shortPositions, size, leverage]);

  /**
   * Handle confirm trade from confirmation modal
   */
  const handleConfirmTrade = useCallback(async () => {
    const trade: PendingTrade = {
      longPositions: longPositions.map((p) => ({ symbol: p.symbol, weight: p.weight })),
      shortPositions: shortPositions.map((p) => ({ symbol: p.symbol, weight: p.weight })),
      size,
      leverage,
    };

    await executeTradeInternal(trade);
  }, [longPositions, shortPositions, size, leverage]);

  /**
   * Handle auth modal close
   */
  const handleAuthModalClose = useCallback(() => {
    setIsAuthModalOpen(false);
    pendingTradeRef.current = null;
  }, []);

  /**
   * Handle auth completion - show confirmation modal
   */
  const handleAuthComplete = useCallback(() => {
    setIsAuthModalOpen(false);
    if (pendingTradeRef.current) {
      // Show confirmation modal after auth
      setIsConfirmationModalOpen(true);
    }
  }, []);

  // Prepare trade details for confirmation modal
  const tradeDetails: TradeDetails = {
    longPositions: longPositions.map((p) => ({ symbol: p.symbol, weight: p.weight })),
    shortPositions: shortPositions.map((p) => ({ symbol: p.symbol, weight: p.weight })),
    size,
    leverage,
  };

  // Determine if execute button should be disabled
  // Task 7.4: Disable Execute button while executing
  const isExecuteDisabled = !validation.valid || isExecuting;

  // Check if any prices are still loading for new assets
  const hasUnpricedAssets = allSymbols.some((symbol) => prices[symbol] === undefined);
  const showPriceLoading = pricesLoading && hasUnpricedAssets && allSymbols.length > 0;

  return (
    <div className="max-w-md mx-auto pb-8">
      <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 space-y-4">
      {/* Weight Header */}
      <WeightHeader
        longWeight={getLongWeight()}
        shortWeight={getShortWeight()}
        onRebalance={rebalanceWeights}
      />

      {/* Price Loading Indicator - Task 7.4 */}
      {showPriceLoading && (
        <div className="flex items-center justify-center gap-2 py-2 text-zinc-400 text-sm">
          <LoadingSpinner size={14} />
          <span>Fetching prices...</span>
        </div>
      )}

      {/* Long Assets Section */}
      <AssetSection
        title="Long Assets"
        count={longPositions.length}
        assets={longPositions.map((p) => ({
          symbol: p.symbol,
          price: prices[p.symbol] || p.price,
          weight: p.weight,
        }))}
        side="long"
        leverage={leverage}
        onAddClick={() => handleOpenTokenModal('long')}
        onWeightChange={(symbol, weight) => handleWeightChange('long', symbol, weight)}
        onRemove={(symbol) => handleRemove('long', symbol)}
        isLoading={showPriceLoading}
      />

      {/* Short Assets Section */}
      <AssetSection
        title="Short Assets"
        count={shortPositions.length}
        assets={shortPositions.map((p) => ({
          symbol: p.symbol,
          price: prices[p.symbol] || p.price,
          weight: p.weight,
        }))}
        side="short"
        leverage={leverage}
        onAddClick={() => handleOpenTokenModal('short')}
        onWeightChange={(symbol, weight) => handleWeightChange('short', symbol, weight)}
        onRemove={(symbol) => handleRemove('short', symbol)}
        isLoading={showPriceLoading}
      />

      {/* Size Input */}
      <SizeInput
        value={size}
        onChange={setSize}
        onMax={handleMaxSize}
        availableMargin={withdrawable ?? 0}
        isLoading={marginLoading}
      />

      {/* Leverage Slider */}
      <div className="pt-2">
        <LeverageSlider value={leverage} onChange={setLeverage} min={1} max={40} />
      </div>

      {/* Weight Validation Error - Task 7.2 */}
      {!validation.valid && validation.error && (
        <div className="pt-4">
          <ErrorAlert message={validation.error} />
        </div>
      )}

      {/* Execution Error - Task 7.3 */}
      {executionError && (
        <div className="pt-4">
          <ErrorAlert message={executionError} />
        </div>
      )}

      {/* Execution Success */}
      {executionSuccess && (
        <div className="pt-4">
          <SuccessAlert message={executionSuccess} />
        </div>
      )}

      {/* Execute Trade Button - Task 7.4: Loading state during execution */}
      <button
        onClick={handleExecuteClick}
        disabled={isExecuteDisabled}
        className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
          isExecuteDisabled
            ? 'bg-zinc-700 cursor-not-allowed opacity-50'
            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400'
        }`}
      >
        {isExecuting ? (
          <>
            <LoadingSpinner size={18} />
            <span>Executing...</span>
          </>
        ) : (
          'Execute Trade'
        )}
      </button>
      </div>

      {/* Token Select Modal */}
      <TokenSelectModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSelect={handleTokenSelect}
        excludeSymbols={excludedSymbols}
      />

      {/* Confirmation Modal - with loading and error states */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={handleConfirmTrade}
        tradeDetails={tradeDetails}
        isLoading={isExecuting}
        error={executionError}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        onAuthComplete={handleAuthComplete}
      />
    </div>
  );
}
