/**
 * Tests for useModifyProposal hook
 * Task 4.3: Write additional strategic tests for the trade modification feature
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModifyProposal } from '@/hooks/useModifyProposal';
import type { TradeProposal, Position } from '@/types/trade';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample test data
const mockLongPositions: Position[] = [
  { symbol: 'ETH', name: 'Ethereum', weight: 50, dailyVolume: 3000000000 },
  { symbol: 'SOL', name: 'Solana', weight: 30, dailyVolume: 1500000000 },
];

const mockShortPositions: Position[] = [
  { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 5000000000 },
];

const mockProposal: TradeProposal = {
  id: 'test-proposal-1',
  longPositions: mockLongPositions,
  shortPositions: mockShortPositions,
  stopLoss: 15,
  takeProfit: 25,
  createdAt: new Date(),
  recommendedTokens: [
    { symbol: 'AVAX', name: 'Avalanche', relevance: 'Fast L1' },
  ],
  isLatest: true,
};

describe('useModifyProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal State Management', () => {
    it('should initialize with modal closed', () => {
      const { result } = renderHook(() => useModifyProposal());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.originalProposal).toBeNull();
      expect(result.current.longPositions).toEqual([]);
      expect(result.current.shortPositions).toEqual([]);
    });

    it('should open modal and pre-populate with proposal data', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.originalProposal).toEqual(mockProposal);
      expect(result.current.longPositions).toHaveLength(2);
      expect(result.current.shortPositions).toHaveLength(1);
      expect(result.current.longPositions[0].symbol).toBe('ETH');
    });

    it('should close modal and reset state', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.originalProposal).toBeNull();
      expect(result.current.longPositions).toEqual([]);
      expect(result.current.shortPositions).toEqual([]);
    });
  });

  describe('Percentage Validation', () => {
    it('should validate when total is exactly 100%', () => {
      const { result } = renderHook(() => useModifyProposal());

      // Proposal with exactly 100% on LONG side
      const exactProposal: TradeProposal = {
        ...mockProposal,
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 3000000000 },
          { symbol: 'SOL', name: 'Solana', weight: 40, dailyVolume: 1500000000 },
        ],
      };

      act(() => {
        result.current.openModal(exactProposal);
      });

      expect(result.current.longValidation.total).toBe(100);
      expect(result.current.longValidation.isValid).toBe(true);
      expect(result.current.isValid).toBe(true);
    });

    it('should validate when total is 0%', () => {
      const { result } = renderHook(() => useModifyProposal());

      // Proposal with 0% weights
      const zeroProposal: TradeProposal = {
        ...mockProposal,
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 0, dailyVolume: 3000000000 },
        ],
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 0, dailyVolume: 5000000000 },
        ],
      };

      act(() => {
        result.current.openModal(zeroProposal);
      });

      expect(result.current.longValidation.total).toBe(0);
      expect(result.current.shortValidation.total).toBe(0);
      expect(result.current.isValid).toBe(true);
    });

    it('should invalidate when LONG side exceeds 100%', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      // Update weight to exceed 100%
      act(() => {
        result.current.updateWeight('long', 0, 80); // ETH: 80%
        result.current.updateWeight('long', 1, 50); // SOL: 50% -> Total 130%
      });

      expect(result.current.longValidation.total).toBe(130);
      expect(result.current.longValidation.isValid).toBe(false);
      expect(result.current.longValidation.error).toContain('LONG');
      expect(result.current.isValid).toBe(false);
    });

    it('should invalidate when SHORT side exceeds 100%', () => {
      const { result } = renderHook(() => useModifyProposal());

      // Create proposal with multiple SHORT positions
      const multiShortProposal: TradeProposal = {
        ...mockProposal,
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 60, dailyVolume: 5000000000 },
          { symbol: 'XRP', name: 'Ripple', weight: 30, dailyVolume: 1000000000 },
        ],
      };

      act(() => {
        result.current.openModal(multiShortProposal);
      });

      // Update weight to exceed 100%
      act(() => {
        result.current.updateWeight('short', 1, 50); // XRP: 50% -> Total 110%
      });

      expect(result.current.shortValidation.total).toBe(110);
      expect(result.current.shortValidation.isValid).toBe(false);
      expect(result.current.shortValidation.error).toContain('SHORT');
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should add token to LONG side', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      const newToken: Position = {
        symbol: 'AVAX',
        name: 'Avalanche',
        weight: 20,
        dailyVolume: 800000000,
      };

      act(() => {
        result.current.addToken('long', newToken);
      });

      expect(result.current.longPositions).toHaveLength(3);
      expect(result.current.longPositions[2].symbol).toBe('AVAX');
    });

    it('should not add duplicate token', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      const duplicateToken: Position = {
        symbol: 'ETH', // Already exists in LONG
        name: 'Ethereum',
        weight: 20,
        dailyVolume: 3000000000,
      };

      act(() => {
        result.current.addToken('long', duplicateToken);
      });

      expect(result.current.longPositions).toHaveLength(2); // Still 2
    });

    it('should remove token when more than one exists', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      expect(result.current.longPositions).toHaveLength(2);

      act(() => {
        const removed = result.current.removeToken('long', 0);
        expect(removed).toBe(true);
      });

      expect(result.current.longPositions).toHaveLength(1);
      expect(result.current.longPositions[0].symbol).toBe('SOL');
    });

    it('should prevent removing the last token on a side', () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      expect(result.current.shortPositions).toHaveLength(1);
      expect(result.current.canRemoveToken('short')).toBe(false);

      act(() => {
        const removed = result.current.removeToken('short', 0);
        expect(removed).toBe(false);
      });

      expect(result.current.shortPositions).toHaveLength(1); // Still 1
    });
  });

  describe('Submission', () => {
    it('should submit modification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Updated trade proposal based on your modifications.',
          tradeProposal: {
            id: 'new-proposal-1',
            longPositions: mockLongPositions,
            shortPositions: mockShortPositions,
            stopLoss: 15,
            takeProfit: 25,
          },
        }),
      });

      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      let response;
      await act(async () => {
        response = await result.current.submitModification();
      });

      expect(response).not.toBeNull();
      expect((response as any)?.content).toContain('modifications');
      expect(result.current.isOpen).toBe(false); // Modal closed after success
    });

    it('should handle submission error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Server error',
        }),
      });

      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      let response;
      await act(async () => {
        response = await result.current.submitModification();
      });

      expect(response).toBeNull();
      expect(result.current.submitError).toBe('Server error');
      expect(result.current.isOpen).toBe(true); // Modal stays open on error
    });

    it('should not submit when validation fails', async () => {
      const { result } = renderHook(() => useModifyProposal());

      act(() => {
        result.current.openModal(mockProposal);
      });

      // Make invalid by exceeding 100%
      act(() => {
        result.current.updateWeight('long', 0, 80);
        result.current.updateWeight('long', 1, 50);
      });

      expect(result.current.isValid).toBe(false);

      let response;
      await act(async () => {
        response = await result.current.submitModification();
      });

      expect(response).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
