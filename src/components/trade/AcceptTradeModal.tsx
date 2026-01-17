'use client';

import { useEffect, useState } from 'react';
import type { TradeProposal } from '@/types/trade';

/**
 * Props for AcceptTradeModal component
 */
interface AcceptTradeModalProps {
  /** The trade proposal to accept */
  proposal: TradeProposal | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when trade is placed */
  onPlaceTrade: (proposalId: string, positionSizeUsd: number) => Promise<void>;
}

/**
 * Modal for accepting a trade proposal with position size input.
 *
 * Features:
 * - Display trade summary (LONG/SHORT tokens with weights)
 * - USD position size input field
 * - "Place Trade" button
 * - Loading state while submitting
 * - Escape key and backdrop click to close
 */
export function AcceptTradeModal({
  proposal,
  isOpen,
  onClose,
  onPlaceTrade,
}: AcceptTradeModalProps) {
  const [positionSizeUsd, setPositionSizeUsd] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reset state when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      setPositionSizeUsd('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  /**
   * Handle escape key
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  /**
   * Handle place trade
   */
  const handlePlaceTrade = async () => {
    if (!proposal || isSubmitting) return;

    const size = parseFloat(positionSizeUsd);
    if (isNaN(size) || size <= 0) {
      setError('Please enter a valid position size greater than 0');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onPlaceTrade(proposal.id, size);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid number format
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPositionSizeUsd(value);
      setError(null);
    }
  };

  // Don't render if not open or no proposal
  if (!isOpen || !proposal) {
    return null;
  }

  const isValid = positionSizeUsd !== '' && parseFloat(positionSizeUsd) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="card max-w-lg w-full mx-4 p-6"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            Place Trade
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors"
            style={{ color: 'var(--muted)', opacity: isSubmitting ? 0.5 : 1 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Trade Summary */}
        <div className="mb-6 space-y-4">
          {/* LONG positions */}
          {proposal.longPositions.length > 0 && (
            <div>
              <div
                className="text-sm font-bold uppercase mb-2"
                style={{ color: 'var(--accent)' }}
              >
                LONG
              </div>
              <div className="space-y-1">
                {proposal.longPositions.map((pos) => (
                  <div
                    key={pos.symbol}
                    className="flex justify-between text-sm"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <span className="font-mono">{pos.symbol}</span>
                    <span className="font-mono">{pos.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SHORT positions */}
          {proposal.shortPositions.length > 0 && (
            <div>
              <div
                className="text-sm font-bold uppercase mb-2"
                style={{ color: 'var(--danger)' }}
              >
                SHORT
              </div>
              <div className="space-y-1">
                {proposal.shortPositions.map((pos) => (
                  <div
                    key={pos.symbol}
                    className="flex justify-between text-sm"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <span className="font-mono">{pos.symbol}</span>
                    <span className="font-mono">{pos.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Position Size Input */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--foreground)' }}
          >
            Position Size (USD)
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm"
              style={{ color: 'var(--muted)' }}
            >
              $
            </span>
            <input
              type="text"
              value={positionSizeUsd}
              onChange={handleInputChange}
              placeholder="1000"
              disabled={isSubmitting}
              className="w-full pl-7 pr-4 py-3 rounded-lg text-sm"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--card-border)',
                color: 'var(--foreground)',
                opacity: isSubmitting ? 0.5 : 1,
              }}
              autoFocus
            />
          </div>
          {error && (
            <div className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
            style={{ opacity: isSubmitting ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceTrade}
            disabled={!isValid || isSubmitting}
            className="btn btn-accent"
            style={{
              opacity: !isValid || isSubmitting ? 0.5 : 1,
              cursor: !isValid || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Placing Trade...' : 'Place Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}
