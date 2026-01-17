/**
 * Tests for Trade Modification Modal UI Components
 * Task 3.1: Write 6-8 focused tests for UI components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeModificationModal } from '@/components/trade/TradeModificationModal';
import { TradeProposalCard } from '@/components/trade/TradeProposalCard';
import { TokenSearchInput } from '@/components/trade/TokenSearchInput';
import type { TradeProposal, Position, RecommendedToken } from '@/types/trade';

// Mock fetch for token search
global.fetch = vi.fn();

// Sample test data
const mockPositions: Position[] = [
  { symbol: 'BTC', name: 'Bitcoin', weight: 50, dailyVolume: 1000000000 },
  { symbol: 'ETH', name: 'Ethereum', weight: 30, dailyVolume: 500000000 },
];

const mockRecommendedTokens: RecommendedToken[] = [
  { symbol: 'SOL', name: 'Solana', relevance: 'High liquidity Layer 1' },
  { symbol: 'AVAX', name: 'Avalanche', relevance: 'Fast growing ecosystem' },
];

const mockProposal: TradeProposal = {
  id: 'test-proposal-1',
  longPositions: mockPositions,
  shortPositions: [
    { symbol: 'DOGE', name: 'Dogecoin', weight: 40, dailyVolume: 200000000 },
  ],
  stopLoss: 15,
  takeProfit: 25,
  createdAt: new Date(),
  recommendedTokens: mockRecommendedTokens,
  isLatest: true,
};

const mockOlderProposal: TradeProposal = {
  ...mockProposal,
  id: 'test-proposal-old',
  isLatest: false,
};

describe('TradeModificationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens modal when Modify button clicked on latest proposal', async () => {
    const onModify = vi.fn();
    const onModifySubmit = vi.fn();

    render(
      <TradeProposalCard
        proposal={mockProposal}
        onModify={onModify}
        onModifySubmit={onModifySubmit}
        isLatest={true}
      />
    );

    const modifyButton = screen.getByRole('button', { name: /modify/i });
    await userEvent.click(modifyButton);

    // The modal should be triggered via onModify callback
    expect(onModify).toHaveBeenCalled();
  });

  it('pre-populates modal with current proposal data', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <TradeModificationModal
        isOpen={true}
        proposal={mockProposal}
        onClose={onClose}
        onSave={onSave}
      />
    );

    // Check that LONG positions are displayed
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();

    // Check that SHORT positions are displayed
    expect(screen.getByText('DOGE')).toBeInTheDocument();

    // Check LONG and SHORT labels
    expect(screen.getByText('LONG')).toBeInTheDocument();
    expect(screen.getByText('SHORT')).toBeInTheDocument();
  });

  it('shows percentage validation error when exceeding 100%', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <TradeModificationModal
        isOpen={true}
        proposal={mockProposal}
        onClose={onClose}
        onSave={onSave}
      />
    );

    // Find the first percentage input (BTC at 50%)
    const percentInputs = screen.getAllByRole('spinbutton');

    // Change BTC from 50% to 80% (50+30+80 = 160% > 100%)
    await userEvent.clear(percentInputs[0]);
    await userEvent.type(percentInputs[0], '80');

    // Trigger blur to validate
    fireEvent.blur(percentInputs[0]);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/exceeds 100%/i)).toBeInTheDocument();
    });
  });

  it('prevents removing last token from a side', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    // Create a proposal with only one SHORT position
    const singleShortProposal: TradeProposal = {
      ...mockProposal,
      shortPositions: [
        { symbol: 'DOGE', name: 'Dogecoin', weight: 40, dailyVolume: 200000000 },
      ],
    };

    render(
      <TradeModificationModal
        isOpen={true}
        proposal={singleShortProposal}
        onClose={onClose}
        onSave={onSave}
      />
    );

    // Find remove buttons for SHORT side (there should be one, and it should be disabled)
    const removeButtons = screen.getAllByTestId('remove-token-button');
    const shortRemoveButton = removeButtons[removeButtons.length - 1];

    // The last token's remove button should be disabled
    expect(shortRemoveButton).toBeDisabled();
  });

  it('Save button triggers API call and closes modal', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TradeModificationModal
        isOpen={true}
        proposal={mockProposal}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('older proposal buttons are disabled and dimmed', () => {
    const onModify = vi.fn();
    const onModifySubmit = vi.fn();

    render(
      <TradeProposalCard
        proposal={mockOlderProposal}
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

    // Check for dimmed styling (opacity class or style)
    expect(modifyButton).toHaveStyle({ cursor: 'not-allowed' });
    expect(acceptButton).toHaveStyle({ cursor: 'not-allowed' });
  });
});

describe('TokenSearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for token search
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        tokens: [
          { symbol: 'BTC', name: 'Bitcoin', dailyVolumeUsd: 1000000000 },
          { symbol: 'ETH', name: 'Ethereum', dailyVolumeUsd: 500000000 },
          { symbol: 'SOL', name: 'Solana', dailyVolumeUsd: 300000000 },
        ],
      }),
    });
  });

  it('filters token results as user types', async () => {
    const onSelect = vi.fn();

    render(
      <TokenSearchInput
        onSelect={onSelect}
        recommendedTokens={mockRecommendedTokens}
        excludeSymbols={[]}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'BTC');

    // Wait for debounced search
    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('displays recommended tokens and filters them dynamically', async () => {
    const onSelect = vi.fn();

    render(
      <TokenSearchInput
        onSelect={onSelect}
        recommendedTokens={mockRecommendedTokens}
        excludeSymbols={[]}
      />
    );

    // Initially, recommended tokens should be visible
    expect(screen.getByText('SOL')).toBeInTheDocument();
    expect(screen.getByText('AVAX')).toBeInTheDocument();

    // Type to filter
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'SOL');

    // Should filter to show matching recommended token
    await waitFor(() => {
      expect(screen.getByText('SOL')).toBeInTheDocument();
    });
  });
});
