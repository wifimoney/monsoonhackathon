'use client';

import type { TradeProposal, Position } from '@/types/trade';

/**
 * Props for TradeProposalCard component
 * Task 3.8: Updated with isLatest and onModifySubmit props
 * Task 4.4: Added isExecuting prop for loading states during trade execution
 */
interface TradeProposalCardProps {
  /** The trade proposal to display */
  proposal: TradeProposal;
  /** Callback to open the modification modal (passes proposal ID) */
  onModify: (proposalId: string) => void;
  /** Callback when modal modification is submitted (kept for potential future use) */
  onModifySubmit?: (longPositions: Position[], shortPositions: Position[]) => Promise<void>;
  /** Callback when Accept button is clicked */
  onAccept?: (proposal: TradeProposal) => void;
  /** Whether this is the latest proposal (controls button disabled state) */
  isLatest?: boolean;
  /** Whether this proposal has been accepted (trade placed) */
  isAccepted?: boolean;
  /** Whether a trade is currently being executed (Task 4.4) */
  isExecuting?: boolean;
  /** Error message to display after failed execution (Task 4.5) */
  executionError?: string | null;
  /** Callback to retry failed execution (Task 4.5) */
  onRetry?: () => void;
}

function PositionList({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return <div className="text-[var(--muted)] text-sm italic">No positions</div>;
  }

  return (
    <div className="space-y-2">
      {positions.map((position) => (
        <div
          key={position.symbol}
          className="flex items-center justify-between py-2 border-b border-[var(--card-border)] last:border-0"
        >
          <div className="flex flex-col">
            <span className="font-mono font-semibold">{position.symbol}</span>
            <a
              href={`https://app.hyperliquid.xyz/trade/${position.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Trade on Hyperliquid
            </a>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold">{position.weight}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Spinner component for loading state
 * Task 4.4: Show spinner during trade execution
 */
function Spinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Card component displaying a trade proposal with LONG and SHORT positions.
 *
 * Task 3.8 Updates:
 * - Added isLatest prop to control button state
 * - Disabled and dimmed Modify/Accept buttons when not latest
 * - Added cursor: not-allowed style for disabled buttons
 * - Wire Modify button to open TradeModificationModal
 * - Pass onModifySubmit callback for modal save
 *
 * Task 4.2-4.5 Updates:
 * - Added isExecuting prop for loading states
 * - Show spinner and "Executing..." text during trade execution
 * - Display error message with retry option on failure
 */
export function TradeProposalCard({
  proposal,
  onModify,
  onModifySubmit: _onModifySubmit, // Available for future modal integration
  onAccept,
  isLatest = true,
  isAccepted = false,
  isExecuting = false,
  executionError = null,
  onRetry,
}: TradeProposalCardProps) {
  // Buttons are disabled if not latest, already accepted, or currently executing
  const buttonsDisabled = !isLatest || isAccepted || isExecuting;

  const handleAccept = () => {
    if (buttonsDisabled) return;

    if (onAccept) {
      onAccept(proposal);
    } else {
      console.log('Trade proposal accepted:', proposal);
      console.log('Proposal ID:', proposal.id);
      console.log('Long positions:', proposal.longPositions);
      console.log('Short positions:', proposal.shortPositions);
    }
  };

  const handleModify = () => {
    if (buttonsDisabled) return;

    // Call the onModify callback which will open the modal in MessageHistory
    onModify(proposal.id);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Button styles for disabled state
  const disabledButtonStyle = {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
    pointerEvents: 'none' as const,
  };

  const enabledButtonStyle = {
    opacity: 1,
    cursor: 'pointer' as const,
  };

  // Task 4.4: Executing state style (slightly different from disabled)
  const executingButtonStyle = {
    opacity: 0.7,
    cursor: 'not-allowed' as const,
  };

  const getButtonStyle = () => {
    if (isExecuting) return executingButtonStyle;
    if (buttonsDisabled) return disabledButtonStyle;
    return enabledButtonStyle;
  };

  const buttonStyle = getButtonStyle();

  // Determine button text based on state
  const getAcceptButtonText = () => {
    if (isAccepted) return 'Trade Placed';
    if (isExecuting) return 'Executing...';
    return 'Accept';
  };

  return (
    <div
      className="card p-4 space-y-4"
      style={{
        opacity: buttonsDisabled && !isExecuting ? 0.7 : 1,
      }}
    >
      {/* Two-column layout for LONG and SHORT */}
      <div className="grid grid-cols-2 gap-4">
        {/* LONG side */}
        <div
          data-testid="long-section"
          className="p-3 rounded-lg border-2"
          style={{ borderColor: 'var(--accent)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-sm font-bold uppercase"
              style={{ color: 'var(--accent)' }}
            >
              LONG
            </span>
          </div>
          <PositionList positions={proposal.longPositions} />
        </div>

        {/* SHORT side */}
        <div
          data-testid="short-section"
          className="p-3 rounded-lg border-2"
          style={{ borderColor: 'var(--danger)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-sm font-bold uppercase"
              style={{ color: 'var(--danger)' }}
            >
              SHORT
            </span>
          </div>
          <PositionList positions={proposal.shortPositions} />
        </div>
      </div>

      {/* Task 4.5: Error message with retry option */}
      {executionError && (
        <div
          className="p-3 rounded-lg border"
          style={{
            borderColor: 'var(--danger)',
            backgroundColor: 'rgba(var(--danger-rgb), 0.1)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--danger)' }}
              >
                Trade Execution Failed
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {executionError}
              </div>
            </div>
            {onRetry && (
              <button
                onClick={handleRetry}
                className="btn btn-secondary py-1 px-3 text-xs"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={buttonsDisabled}
          className="btn btn-accent flex-1 flex items-center justify-center"
          style={buttonStyle}
        >
          {isExecuting && <Spinner />}
          {getAcceptButtonText()}
        </button>
        <button
          onClick={handleModify}
          disabled={buttonsDisabled}
          className="btn btn-secondary flex-1"
          style={buttonStyle}
        >
          Modify
        </button>
      </div>

      {/* Indicator for accepted trades */}
      {isAccepted && (
        <div
          className="text-xs text-center"
          style={{ color: 'var(--accent)' }}
        >
          Trade has been placed. This proposal can no longer be modified.
        </div>
      )}

      {/* Indicator for older proposals */}
      {!isLatest && !isAccepted && (
        <div
          className="text-xs text-center"
          style={{ color: 'var(--muted)' }}
        >
          This is an older proposal. Only the latest proposal can be modified.
        </div>
      )}
    </div>
  );
}
