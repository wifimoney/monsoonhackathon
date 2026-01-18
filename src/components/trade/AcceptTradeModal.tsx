'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
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
  onPlaceTrade: (proposalId: string, positionSizeUsd: number, leverage: number) => Promise<void>;
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
 * - Inline wallet connection check and connect UI
 */
export function AcceptTradeModal({
  proposal,
  isOpen,
  onClose,
  onPlaceTrade,
}: AcceptTradeModalProps) {
  const [positionSizeUsd, setPositionSizeUsd] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wallet connection state
  const { isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();

  /**
   * Reset state when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      setPositionSizeUsd('');
      setLeverage(1);
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
      await onPlaceTrade(proposal.id, size, leverage);
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

  // Validation includes wallet connection check
  const isValid = isConnected && positionSizeUsd !== '' && parseFloat(positionSizeUsd) > 0;

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

        {/* Wallet Connection Warning - Show when not connected */}
        {!isConnected && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              {/* Warning Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span
                className="font-medium"
                style={{ color: '#f59e0b' }}
              >
                Please connect your wallet
              </span>
            </div>
            {/* Connect Wallet Buttons */}
            <div className="flex flex-wrap gap-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  className="btn btn-primary py-2 px-4 text-sm flex items-center gap-2"
                  style={{
                    opacity: isPending ? 0.7 : 1,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPending ? (
                    <>
                      <span className="animate-spin">&#8635;</span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Connect {connector.name}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trade Summary */}
        <div className="mb-6 space-y-3">
          {/* LONG positions */}
          {proposal.longPositions.length > 0 && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--accent)' }}
                >
                  LONG
                </span>
                <span
                  className="text-xs font-mono ml-auto"
                  style={{ color: 'var(--muted)' }}
                >
                  {proposal.longPositions.reduce((sum, p) => sum + p.weight, 0)}% total
                </span>
              </div>
              <div className="space-y-2">
                {proposal.longPositions.map((pos) => (
                  <div key={pos.symbol} className="flex items-center gap-3">
                    <span
                      className="font-mono text-sm font-medium w-16"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {pos.symbol}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pos.weight}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <span
                      className="font-mono text-sm w-12 text-right"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {pos.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SHORT positions */}
          {proposal.shortPositions.length > 0 && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--danger)' }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--danger)' }}
                >
                  SHORT
                </span>
                <span
                  className="text-xs font-mono ml-auto"
                  style={{ color: 'var(--muted)' }}
                >
                  {proposal.shortPositions.reduce((sum, p) => sum + p.weight, 0)}% total
                </span>
              </div>
              <div className="space-y-2">
                {proposal.shortPositions.map((pos) => (
                  <div key={pos.symbol} className="flex items-center gap-3">
                    <span
                      className="font-mono text-sm font-medium w-16"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {pos.symbol}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pos.weight}%`,
                          background: 'var(--danger)',
                        }}
                      />
                    </div>
                    <span
                      className="font-mono text-sm w-12 text-right"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {pos.weight}%
                    </span>
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

        {/* Leverage Input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Leverage
            </label>
            <div
              className="px-3 py-1 rounded-md font-mono text-lg font-bold"
              style={{
                background: leverage <= 5 ? 'rgba(34, 197, 94, 0.15)' : leverage <= 20 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: leverage <= 5 ? 'var(--accent)' : leverage <= 20 ? '#eab308' : 'var(--danger)',
                border: `1px solid ${leverage <= 5 ? 'rgba(34, 197, 94, 0.3)' : leverage <= 20 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {leverage}x
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>1x</span>
            <div className="flex-1 relative">
              <div
                className="absolute inset-0 h-2 rounded-full top-1/2 -translate-y-1/2"
                style={{
                  background: 'linear-gradient(to right, #22c55e 0%, #22c55e 5%, #eab308 20%, #ef4444 100%)',
                  opacity: 0.3,
                }}
              />
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                disabled={isSubmitting}
                className="relative w-full h-2 rounded-lg appearance-none cursor-pointer z-10"
                style={{
                  background: `linear-gradient(to right, ${leverage <= 5 ? '#22c55e' : leverage <= 20 ? '#eab308' : '#ef4444'} 0%, ${leverage <= 5 ? '#22c55e' : leverage <= 20 ? '#eab308' : '#ef4444'} ${(leverage - 1) / 99 * 100}%, transparent ${(leverage - 1) / 99 * 100}%, transparent 100%)`,
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              />
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>100x</span>
          </div>
          {leverage > 10 && (
            <div
              className="mt-3 p-2 rounded-md flex items-center gap-2 text-xs"
              style={{
                background: leverage > 20 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                border: `1px solid ${leverage > 20 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                color: leverage > 20 ? '#ef4444' : '#eab308',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {leverage > 20 ? 'High leverage significantly increases liquidation risk' : 'Moderate leverage - trade with caution'}
            </div>
          )}
        </div>

        {/* Position Summary */}
        {positionSizeUsd && parseFloat(positionSizeUsd) > 0 && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--card-border)',
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Margin Required
              </span>
              <span className="font-mono text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                ${(parseFloat(positionSizeUsd) / leverage).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'transparent',
              border: '1px solid var(--card-border)',
              color: 'var(--muted)',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceTrade}
            disabled={!isValid || isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
            style={{
              background: !isValid || isSubmitting ? 'rgba(34, 197, 94, 0.3)' : 'var(--accent)',
              color: !isValid || isSubmitting ? 'rgba(255,255,255,0.5)' : '#000',
              cursor: !isValid || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Placing Trade...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Place Trade
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
