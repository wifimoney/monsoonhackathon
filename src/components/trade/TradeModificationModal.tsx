'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import type { TradeProposal, Position, RecommendedToken } from '@/types/trade';
import { PositionColumn } from './PositionColumn';

/**
 * Props for TradeModificationModal component
 */
interface TradeModificationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The proposal being modified */
  proposal: TradeProposal | null;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when modifications are saved */
  onSave: (longPositions: Position[], shortPositions: Position[]) => Promise<void>;
}

/**
 * Validation result for a side
 */
interface SideValidation {
  isValid: boolean;
  total: number;
  error?: string;
}

/**
 * Trade modification modal component.
 *
 * Features:
 * - Modal overlay with semi-transparent backdrop
 * - Two-column layout using PositionColumn components
 * - Pre-populate with proposal data on open
 * - Save and Cancel buttons at bottom
 * - Close on backdrop click or Cancel button
 * - Block Save if validation fails
 * - Use existing .card and .btn CSS classes
 *
 * Task 3.7: Create TradeModificationModal component
 */
export function TradeModificationModal({
  isOpen,
  proposal,
  onClose,
  onSave,
}: TradeModificationModalProps) {
  const [longPositions, setLongPositions] = useState<Position[]>([]);
  const [shortPositions, setShortPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Initialize positions when modal opens
   */
  useEffect(() => {
    if (isOpen && proposal) {
      setLongPositions([...proposal.longPositions]);
      setShortPositions([...proposal.shortPositions]);
    }
  }, [isOpen, proposal]);

  /**
   * Calculate total for a side
   */
  const calculateTotal = useCallback((positions: Position[]): number => {
    return positions.reduce((sum, p) => sum + (p.weight || 0), 0);
  }, []);

  /**
   * Validate a side
   */
  const validateSide = useCallback(
    (positions: Position[], sideName: string): SideValidation => {
      const total = calculateTotal(positions);
      const isValid = total <= 100;

      return {
        isValid,
        total,
        error: isValid ? undefined : `${sideName} side exceeds 100% (${total}%)`,
      };
    },
    [calculateTotal]
  );

  const longValidation = useMemo(
    () => validateSide(longPositions, 'LONG'),
    [longPositions, validateSide]
  );

  const shortValidation = useMemo(
    () => validateSide(shortPositions, 'SHORT'),
    [shortPositions, validateSide]
  );

  const isValid = longValidation.isValid && shortValidation.isValid;

  /**
   * Handle weight change for LONG side
   */
  const handleLongWeightChange = useCallback((index: number, weight: number) => {
    setLongPositions((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], weight };
      }
      return updated;
    });
  }, []);

  /**
   * Handle weight change for SHORT side
   */
  const handleShortWeightChange = useCallback((index: number, weight: number) => {
    setShortPositions((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], weight };
      }
      return updated;
    });
  }, []);

  /**
   * Handle remove for LONG side
   */
  const handleLongRemove = useCallback((index: number) => {
    if (longPositions.length > 1) {
      setLongPositions((prev) => prev.filter((_, i) => i !== index));
    }
  }, [longPositions.length]);

  /**
   * Handle remove for SHORT side
   */
  const handleShortRemove = useCallback((index: number) => {
    if (shortPositions.length > 1) {
      setShortPositions((prev) => prev.filter((_, i) => i !== index));
    }
  }, [shortPositions.length]);

  /**
   * Handle add for LONG side
   */
  const handleLongAdd = useCallback((token: Position) => {
    const exists = longPositions.some((p) => p.symbol === token.symbol);
    if (!exists) {
      setLongPositions((prev) => [...prev, token]);
    }
  }, [longPositions]);

  /**
   * Handle add for SHORT side
   */
  const handleShortAdd = useCallback((token: Position) => {
    const exists = shortPositions.some((p) => p.symbol === token.symbol);
    if (!exists) {
      setShortPositions((prev) => [...prev, token]);
    }
  }, [shortPositions]);

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(longPositions, shortPositions);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handle escape key
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen || !proposal) {
    return null;
  }

  // Get recommended tokens from proposal
  const recommendedTokens: RecommendedToken[] = proposal.recommendedTokens || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="card max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            Modify Trade Proposal
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-colors"
            style={{ color: 'var(--muted)' }}
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <PositionColumn
            side="long"
            positions={longPositions}
            onWeightChange={handleLongWeightChange}
            onRemove={handleLongRemove}
            onAdd={handleLongAdd}
            total={longValidation.total}
            isValid={longValidation.isValid}
            error={longValidation.error}
            recommendedTokens={recommendedTokens}
            canRemove={longPositions.length > 1}
          />

          <PositionColumn
            side="short"
            positions={shortPositions}
            onWeightChange={handleShortWeightChange}
            onRemove={handleShortRemove}
            onAdd={handleShortAdd}
            total={shortValidation.total}
            isValid={shortValidation.isValid}
            error={shortValidation.error}
            recommendedTokens={recommendedTokens}
            canRemove={shortPositions.length > 1}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isSubmitting}
            className="btn btn-accent"
            style={{
              opacity: !isValid || isSubmitting ? 0.5 : 1,
              cursor: !isValid || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
