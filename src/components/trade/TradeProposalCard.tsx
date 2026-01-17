'use client';

import type { TradeProposal, Position } from '@/types/trade';

interface TradeProposalCardProps {
  proposal: TradeProposal;
  onModify: (refinementMessage: string) => void;
}

function PositionList({ positions, side }: { positions: Position[]; side: 'long' | 'short' }) {
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
              Trade on Hyperliquid →
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

export function TradeProposalCard({ proposal, onModify }: TradeProposalCardProps) {
  const handleAccept = () => {
    console.log('Trade proposal accepted:', proposal);
    console.log('Proposal ID:', proposal.id);
    console.log('Long positions:', proposal.longPositions);
    console.log('Short positions:', proposal.shortPositions);
  };

  const handleModify = () => {
    const refinementMessage = `I'd like to modify this proposal. Current: Long ${proposal.longPositions.map(p => p.symbol).join(', ') || 'none'}, Short ${proposal.shortPositions.map(p => p.symbol).join(', ') || 'none'}. Please adjust...`;
    onModify(refinementMessage);
  };

  return (
    <div className="card p-4 space-y-4">
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
          <PositionList positions={proposal.longPositions} side="long" />
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
          <PositionList positions={proposal.shortPositions} side="short" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={handleAccept} className="btn btn-accent flex-1">
          Accept
        </button>
        <button onClick={handleModify} className="btn btn-secondary flex-1">
          Modify
        </button>
      </div>
    </div>
  );
}
