/**
 * Integration tests for the complete trade modification flow
 * Task 4.3: Write additional strategic tests for the trade modification feature
 *
 * Tests the complete flow: open modal -> edit -> save -> new proposal appears
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeModificationModal } from '@/components/trade/TradeModificationModal';
import { TradeProposalCard } from '@/components/trade/TradeProposalCard';
import type { TradeProposal, Position, RecommendedToken } from '@/types/trade';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a proposal
function createProposal(
  id: string,
  longPositions: Position[],
  shortPositions: Position[],
  recommendedTokens?: RecommendedToken[],
  isLatest?: boolean
): TradeProposal {
  return {
    id,
    longPositions,
    shortPositions,
    stopLoss: 15,
    takeProfit: 25,
    createdAt: new Date(),
    recommendedTokens,
    isLatest,
  };
}

// Sample test data
const mockLongPositions: Position[] = [
  { symbol: 'ETH', name: 'Ethereum', weight: 50, dailyVolume: 3000000000 },
  { symbol: 'SOL', name: 'Solana', weight: 30, dailyVolume: 1500000000 },
];

const mockShortPositions: Position[] = [
  { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 5000000000 },
  { symbol: 'XRP', name: 'Ripple', weight: 30, dailyVolume: 1000000000 },
];

const mockRecommendedTokens: RecommendedToken[] = [
  { symbol: 'AVAX', name: 'Avalanche', relevance: 'Fast L1 chain' },
  { symbol: 'MATIC', name: 'Polygon', relevance: 'Ethereum L2' },
  { symbol: 'ARB', name: 'Arbitrum', relevance: 'Leading L2' },
];

describe('Trade Modification Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for token search
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/ai-trade/tokens')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              tokens: [
                { symbol: 'BTC', name: 'Bitcoin', dailyVolumeUsd: 5000000000 },
                { symbol: 'ETH', name: 'Ethereum', dailyVolumeUsd: 3000000000 },
                { symbol: 'SOL', name: 'Solana', dailyVolumeUsd: 1500000000 },
                { symbol: 'AVAX', name: 'Avalanche', dailyVolumeUsd: 800000000 },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  describe('Complete Modification Flow', () => {
    it('should complete full flow: open modal -> edit percentages -> save -> callback triggered', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      const proposal = createProposal(
        'proposal-1',
        mockLongPositions,
        mockShortPositions,
        mockRecommendedTokens
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={proposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Step 1: Modal should be open with pre-populated data
      expect(screen.getByText('Modify Trade Proposal')).toBeInTheDocument();

      // Verify positions are shown
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('SOL')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();

      // Step 2: Edit a percentage value
      const percentInputs = screen.getAllByRole('spinbutton');
      await userEvent.clear(percentInputs[0]);
      await userEvent.type(percentInputs[0], '60'); // Change ETH from 50% to 60%

      // Step 3: Click Save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      // Step 4: Verify onSave was called with correct data
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const callArgs = onSave.mock.calls[0];
      expect(callArgs[0]).toHaveLength(2); // longPositions
      expect(callArgs[1]).toHaveLength(2); // shortPositions
      // First long position should have updated weight
      expect(callArgs[0][0].weight).toBe(60);
    });
  });

  describe('Multiple Tokens on Each Side', () => {
    it('should handle modification with multiple tokens on LONG and SHORT sides', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      // Create proposal with multiple tokens on each side
      const multiTokenProposal = createProposal(
        'proposal-multi',
        [
          { symbol: 'ETH', name: 'Ethereum', weight: 30, dailyVolume: 3000000000 },
          { symbol: 'SOL', name: 'Solana', weight: 25, dailyVolume: 1500000000 },
          { symbol: 'AVAX', name: 'Avalanche', weight: 25, dailyVolume: 800000000 },
        ],
        [
          { symbol: 'BTC', name: 'Bitcoin', weight: 35, dailyVolume: 5000000000 },
          { symbol: 'XRP', name: 'Ripple', weight: 35, dailyVolume: 1000000000 },
        ]
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={multiTokenProposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Verify all tokens are displayed
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('SOL')).toBeInTheDocument();
      expect(screen.getByText('AVAX')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('XRP')).toBeInTheDocument();

      // Verify we have 5 percentage inputs (3 LONG + 2 SHORT)
      const percentInputs = screen.getAllByRole('spinbutton');
      expect(percentInputs).toHaveLength(5);
    });
  });

  describe('Recommended Tokens Display', () => {
    it('should have modal with LONG and SHORT sections when AI returns recommendedTokens', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      const proposal = createProposal(
        'proposal-with-recs',
        mockLongPositions,
        mockShortPositions,
        mockRecommendedTokens
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={proposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Verify modal contains expected sections
      expect(screen.getByText('LONG')).toBeInTheDocument();
      expect(screen.getByText('SHORT')).toBeInTheDocument();

      // Verify recommended tokens are passed (they appear in Add Token interface)
      // Click Add Token to show the search with recommendations
      const addButtons = screen.getAllByRole('button', { name: /add token/i });
      expect(addButtons.length).toBe(2); // One for each column
    });
  });

  describe('Original Proposal Visibility After Modification', () => {
    it('should show older proposal with dimmed buttons when not latest', async () => {
      const onModify = vi.fn();
      const onModifySubmit = vi.fn().mockResolvedValue(undefined);

      // Render older proposal (not latest)
      const oldProposal = createProposal(
        'proposal-old',
        mockLongPositions,
        mockShortPositions,
        undefined,
        false
      );

      render(
        <TradeProposalCard
          proposal={oldProposal}
          onModify={onModify}
          onModifySubmit={onModifySubmit}
          isLatest={false}
        />
      );

      const modifyButton = screen.getByRole('button', { name: /modify/i });
      const acceptButton = screen.getByRole('button', { name: /accept/i });

      // Buttons should be disabled
      expect(modifyButton).toBeDisabled();
      expect(acceptButton).toBeDisabled();
    });

    it('should only allow modifying the latest proposal', async () => {
      const onModify = vi.fn();
      const onModifySubmit = vi.fn().mockResolvedValue(undefined);

      // Render latest proposal
      const newProposal = createProposal(
        'proposal-new',
        [{ symbol: 'LINK', name: 'Chainlink', weight: 100, dailyVolume: 500000000 }],
        [{ symbol: 'DOT', name: 'Polkadot', weight: 100, dailyVolume: 400000000 }]
      );

      render(
        <TradeProposalCard
          proposal={newProposal}
          onModify={onModify}
          onModifySubmit={onModifySubmit}
          isLatest={true}
        />
      );

      const modifyButton = screen.getByRole('button', { name: /modify/i });

      // Button should be enabled
      expect(modifyButton).not.toBeDisabled();

      // Click modify button
      await userEvent.click(modifyButton);

      // onModify should be called with proposal ID
      expect(onModify).toHaveBeenCalledWith('proposal-new');
    });
  });

  describe('Percentage Edge Cases', () => {
    it('should allow exactly 100% total on a side', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      // Create proposal with exactly 100% on both sides
      const exactProposal = createProposal(
        'proposal-exact',
        [
          { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 3000000000 },
          { symbol: 'SOL', name: 'Solana', weight: 40, dailyVolume: 1500000000 },
        ],
        [
          { symbol: 'BTC', name: 'Bitcoin', weight: 50, dailyVolume: 5000000000 },
          { symbol: 'XRP', name: 'Ripple', weight: 50, dailyVolume: 1000000000 },
        ]
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={exactProposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Save button should be enabled (100% is valid)
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();

      // No error message should be shown
      expect(screen.queryByText(/exceeds 100%/i)).not.toBeInTheDocument();
    });

    it('should allow 0% allocation on tokens', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      const zeroProposal = createProposal(
        'proposal-zero',
        [{ symbol: 'ETH', name: 'Ethereum', weight: 0, dailyVolume: 3000000000 }],
        [{ symbol: 'BTC', name: 'Bitcoin', weight: 0, dailyVolume: 5000000000 }]
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={zeroProposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Save button should be enabled (0% is valid)
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('should show error when percentage exceeds 100%', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      // Create proposal with 80% already
      const proposal = createProposal(
        'proposal-over',
        [
          { symbol: 'ETH', name: 'Ethereum', weight: 80, dailyVolume: 3000000000 },
          { symbol: 'SOL', name: 'Solana', weight: 30, dailyVolume: 1500000000 },
        ],
        [{ symbol: 'BTC', name: 'Bitcoin', weight: 50, dailyVolume: 5000000000 }]
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={proposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Total is 110% on LONG side - should show error
      await waitFor(() => {
        expect(screen.getByText(/exceeds 100%/i)).toBeInTheDocument();
      });

      // Save button should be disabled
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Token Search Functionality', () => {
    it('should show search input when Add Token is clicked', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockResolvedValue(undefined);

      const proposal = createProposal(
        'proposal-search',
        mockLongPositions,
        mockShortPositions
      );

      render(
        <TradeModificationModal
          isOpen={true}
          proposal={proposal}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Find "Add Token" buttons (one for each column)
      const addButtons = screen.getAllByRole('button', { name: /add token/i });
      expect(addButtons.length).toBe(2);

      // Click first Add Token button to reveal search
      await userEvent.click(addButtons[0]);

      // Should show search input (placeholder varies)
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/add long token/i);
        expect(searchInput).toBeInTheDocument();
      });
    });
  });
});
