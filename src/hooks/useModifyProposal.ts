'use client';

import { useState, useCallback, useMemo } from 'react';
import type { TradeProposal, Position, ModificationRequest } from '@/types/trade';

/**
 * API response from the modify endpoint
 */
interface ModifyResponse {
  content: string;
  tradeProposal?: TradeProposal;
  success?: boolean;
  error?: string;
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
 * Hook return type
 */
interface UseModifyProposalReturn {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Open the modal with a proposal */
  openModal: (proposal: TradeProposal) => void;
  /** Close the modal */
  closeModal: () => void;
  /** Current LONG positions being edited */
  longPositions: Position[];
  /** Current SHORT positions being edited */
  shortPositions: Position[];
  /** Update a position's weight */
  updateWeight: (side: 'long' | 'short', index: number, weight: number) => void;
  /** Add a token to a side */
  addToken: (side: 'long' | 'short', token: Position) => void;
  /** Remove a token from a side */
  removeToken: (side: 'long' | 'short', index: number) => boolean;
  /** LONG side validation result */
  longValidation: SideValidation;
  /** SHORT side validation result */
  shortValidation: SideValidation;
  /** Overall form validity */
  isValid: boolean;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Submission error message */
  submitError: string | null;
  /** Submit the modified proposal */
  submitModification: () => Promise<ModifyResponse | null>;
  /** The original proposal being modified */
  originalProposal: TradeProposal | null;
  /** Check if a token can be removed (not the last one on a side) */
  canRemoveToken: (side: 'long' | 'short') => boolean;
}

/**
 * Custom hook for managing trade proposal modifications.
 *
 * Features:
 * - Manages modal state (open/closed, current edits)
 * - Tracks per-side percentage totals
 * - Validates totals do not exceed 100%
 * - Handles add/remove token operations
 * - Submits modifications to API endpoint
 * - Returns validation errors and submission state
 *
 * Task 3.3: Create useModifyProposal hook
 */
export function useModifyProposal(): UseModifyProposalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [originalProposal, setOriginalProposal] = useState<TradeProposal | null>(null);
  const [longPositions, setLongPositions] = useState<Position[]>([]);
  const [shortPositions, setShortPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Calculate total weight for a side
   */
  const calculateTotal = useCallback((positions: Position[]): number => {
    return positions.reduce((sum, p) => sum + (p.weight || 0), 0);
  }, []);

  /**
   * Validate a side's total weight
   */
  const validateSide = useCallback((positions: Position[], sideName: string): SideValidation => {
    const total = calculateTotal(positions);
    const isValid = total <= 100;

    return {
      isValid,
      total,
      error: isValid ? undefined : `${sideName} side exceeds 100% (${total}%)`,
    };
  }, [calculateTotal]);

  /**
   * LONG side validation
   */
  const longValidation = useMemo(
    () => validateSide(longPositions, 'LONG'),
    [longPositions, validateSide]
  );

  /**
   * SHORT side validation
   */
  const shortValidation = useMemo(
    () => validateSide(shortPositions, 'SHORT'),
    [shortPositions, validateSide]
  );

  /**
   * Overall form validity
   */
  const isValid = useMemo(
    () => longValidation.isValid && shortValidation.isValid,
    [longValidation.isValid, shortValidation.isValid]
  );

  /**
   * Open the modal with a proposal
   */
  const openModal = useCallback((proposal: TradeProposal) => {
    setOriginalProposal(proposal);
    setLongPositions([...proposal.longPositions]);
    setShortPositions([...proposal.shortPositions]);
    setSubmitError(null);
    setIsOpen(true);
  }, []);

  /**
   * Close the modal
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setOriginalProposal(null);
    setLongPositions([]);
    setShortPositions([]);
    setSubmitError(null);
  }, []);

  /**
   * Update a position's weight
   */
  const updateWeight = useCallback((side: 'long' | 'short', index: number, weight: number) => {
    const setter = side === 'long' ? setLongPositions : setShortPositions;

    setter((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], weight: Math.max(0, Math.min(100, weight)) };
      }
      return updated;
    });
  }, []);

  /**
   * Add a token to a side
   */
  const addToken = useCallback((side: 'long' | 'short', token: Position) => {
    const setter = side === 'long' ? setLongPositions : setShortPositions;
    const getter = side === 'long' ? longPositions : shortPositions;

    // Check if token already exists on this side
    const exists = getter.some((p) => p.symbol === token.symbol);
    if (exists) {
      return;
    }

    setter((prev) => [...prev, token]);
  }, [longPositions, shortPositions]);

  /**
   * Check if a token can be removed from a side
   */
  const canRemoveToken = useCallback((side: 'long' | 'short'): boolean => {
    const positions = side === 'long' ? longPositions : shortPositions;
    return positions.length > 1;
  }, [longPositions, shortPositions]);

  /**
   * Remove a token from a side
   * Returns false if removal would leave the side empty
   */
  const removeToken = useCallback((side: 'long' | 'short', index: number): boolean => {
    const positions = side === 'long' ? longPositions : shortPositions;

    // Prevent removing the last token
    if (positions.length <= 1) {
      return false;
    }

    const setter = side === 'long' ? setLongPositions : setShortPositions;
    setter((prev) => prev.filter((_, i) => i !== index));
    return true;
  }, [longPositions, shortPositions]);

  /**
   * Submit the modified proposal
   */
  const submitModification = useCallback(async (): Promise<ModifyResponse | null> => {
    if (!originalProposal || !isValid) {
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const request: ModificationRequest = {
        originalProposalId: originalProposal.id,
        longPositions,
        shortPositions,
      };

      const response = await fetch('/api/ai-trade/modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data: ModifyResponse = await response.json();

      // Close modal on success
      closeModal();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit modification';
      setSubmitError(errorMessage);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [originalProposal, isValid, longPositions, shortPositions, closeModal]);

  return {
    isOpen,
    openModal,
    closeModal,
    longPositions,
    shortPositions,
    updateWeight,
    addToken,
    removeToken,
    longValidation,
    shortValidation,
    isValid,
    isSubmitting,
    submitError,
    submitModification,
    originalProposal,
    canRemoveToken,
  };
}
