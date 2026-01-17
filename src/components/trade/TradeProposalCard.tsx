'use client';

import type { TradeProposal, Position } from '@/types/trade';

/**
 * Props for TradeProposalCard component
 * Task 3.8: Updated with isLatest and onModifySubmit props
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
 * Card component displaying a trade proposal with LONG and SHORT positions.
 *
 * Task 3.8 Updates:
 * - Added isLatest prop to control button state
 * - Disabled and dimmed Modify/Accept buttons when not latest
 * - Added cursor: not-allowed style for disabled buttons
 * - Wire Modify button to open TradeModificationModal
 * - Pass onModifySubmit callback for modal save
 */
export function TradeProposalCard({
  proposal,
  onModify,
  onModifySubmit: _onModifySubmit, // Available for future modal integration
  onAccept,
  isLatest = true,
  isAccepted = false,
}: TradeProposalCardProps) {
  // Buttons are disabled if not latest OR if already accepted
  const buttonsDisabled = !isLatest || isAccepted;

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

  const buttonStyle = buttonsDisabled ? disabledButtonStyle : enabledButtonStyle;

  return (
    <div
      className="card p-4 space-y-4"
      style={{
        opacity: buttonsDisabled ? 0.7 : 1,
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

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={buttonsDisabled}
          className="btn btn-accent flex-1"
          style={buttonStyle}
        >
          {isAccepted ? 'Trade Placed' : 'Accept'}
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
