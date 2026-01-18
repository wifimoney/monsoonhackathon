'use client';

/**
 * Interface for a position in the trade summary
 */
interface Position {
  symbol: string;
  weight: number;
}

/**
 * Trade details to display in the confirmation modal
 * Task 5.2: Create src/components/trade/ConfirmationModal.tsx component
 */
interface TradeDetails {
  /** Long positions with symbols and weights */
  longPositions: Position[];
  /** Short positions with symbols and weights */
  shortPositions: Position[];
  /** Total position size in USD */
  size: number;
  /** Leverage multiplier */
  leverage: number;
}

/**
 * Props for ConfirmationModal component
 * Task 7.3: Add isLoading and error props for execution states
 */
interface ConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when trade is confirmed */
  onConfirm: () => void;
  /** Trade details to display */
  tradeDetails: TradeDetails;
  /** Whether trade is being executed */
  isLoading?: boolean;
  /** Error message from execution */
  error?: string | null;
}

/**
 * Formats a number as USD currency
 */
function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ size = 18 }: { size?: number }) {
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
 * ConfirmationModal component for displaying trade summary before execution.
 *
 * Task 5.2: Create src/components/trade/ConfirmationModal.tsx component
 * - Props: isOpen, onClose, onConfirm, tradeDetails
 * - tradeDetails: { longPositions, shortPositions, size, leverage }
 * - Display summary: all LONG positions with symbols and weights
 * - Display summary: all SHORT positions with symbols and weights
 * - Display: total size, leverage, estimated fees (placeholder)
 * - "Confirm" and "Cancel" buttons
 * - Match existing AuthModal styling patterns
 *
 * Task 7.3: Add loading and error states for execution
 * - Show loading spinner during execution
 * - Display error message if execution fails
 * - Allow retry without closing modal
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  tradeDetails,
  isLoading = false,
  error = null,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const { longPositions, shortPositions, size, leverage } = tradeDetails;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className={`absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Close modal"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">Confirm Trade</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Review your basket trade before execution
          </p>
        </div>

        {/* Long Positions */}
        {longPositions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-emerald-500 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              LONG Positions
            </h3>
            <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
              {longPositions.map((position) => (
                <div
                  key={position.symbol}
                  className="flex items-center justify-between"
                >
                  <span className="text-white font-medium">{position.symbol}</span>
                  <span className="text-emerald-500 font-mono">
                    {position.weight.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Short Positions */}
        {shortPositions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              SHORT Positions
            </h3>
            <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
              {shortPositions.map((position) => (
                <div
                  key={position.symbol}
                  className="flex items-center justify-between"
                >
                  <span className="text-white font-medium">{position.symbol}</span>
                  <span className="text-red-500 font-mono">{position.weight.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trade Configuration */}
        <div className="bg-zinc-900 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-zinc-400 mb-1">Position Size</div>
              <div className="text-white font-semibold">{formatUsd(size)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Leverage</div>
              <div className="text-white font-semibold">{leverage}x</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-400 mb-1">Margin Required</div>
              <div className="text-white font-semibold">{formatUsd(size / leverage)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Est. Fees</div>
              <div className="text-white font-semibold">~0.05%</div>
            </div>
          </div>
        </div>

        {/* Error Message - Task 7.3 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-500 flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm text-red-500 font-medium">Execution Failed</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 text-zinc-300 font-medium transition-colors ${
              isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-zinc-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-emerald-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size={16} />
                <span>Executing...</span>
              </>
            ) : error ? (
              'Retry'
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
