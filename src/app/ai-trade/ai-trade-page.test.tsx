import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-123',
});

// Import the page component after mocking
import AITradePage from './page';

describe('AI Trade Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Full chat flow - user sends message, receives AI response
  it('should handle full chat flow: user sends message and receives AI response', async () => {
    // Mock the chat API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: 'Based on your thesis, I recommend focusing on AI tokens.',
        }),
    });

    render(<AITradePage />);

    // Find the input and type a message
    const textarea = screen.getByPlaceholderText('Describe your trading thesis...');
    fireEvent.change(textarea, { target: { value: 'I think AI will beat ETH' } });

    // Send the message
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // Wait for user message to appear
    await waitFor(() => {
      expect(screen.getByText('I think AI will beat ETH')).toBeTruthy();
    });

    // Wait for AI response
    await waitFor(() => {
      expect(
        screen.getByText('Based on your thesis, I recommend focusing on AI tokens.')
      ).toBeTruthy();
    });

    // Verify fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith('/api/ai-trade/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('I think AI will beat ETH'),
    });
  });

  // Test 2: Trade proposal generation displays correctly in chat
  it('should display trade proposal correctly when AI generates one', async () => {
    const tradeProposal = {
      longPositions: [
        { symbol: 'FET', name: 'Fetch.ai', weight: 60, dailyVolume: 2000000 },
        { symbol: 'RNDR', name: 'Render Token', weight: 40, dailyVolume: 3000000 },
      ],
      shortPositions: [
        { symbol: 'ETH', name: 'Ethereum', weight: 100, dailyVolume: 5000000 },
      ],
      stopLoss: 15,
      takeProfit: 25,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: 'Here is your trade proposal:',
          tradeProposal,
        }),
    });

    render(<AITradePage />);

    // Send a message
    const textarea = screen.getByPlaceholderText('Describe your trading thesis...');
    fireEvent.change(textarea, { target: { value: 'AI will outperform ETH' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Wait for trade proposal to appear
    await waitFor(() => {
      expect(screen.getByText('Here is your trade proposal:')).toBeTruthy();
    });

    // Check trade proposal card is displayed
    await waitFor(() => {
      expect(screen.getByText('FET')).toBeTruthy();
      expect(screen.getByText('RNDR')).toBeTruthy();
      expect(screen.getByText('ETH')).toBeTruthy();
      expect(screen.getByText(/-15%/)).toBeTruthy();
      expect(screen.getByText(/\+25%/)).toBeTruthy();
    });
  });

  // Test 3: Accept button logs proposal to console
  it('should log proposal to console when Accept button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const tradeProposal = {
      longPositions: [
        { symbol: 'BTC', name: 'Bitcoin', weight: 100, dailyVolume: 5000000 },
      ],
      shortPositions: [
        { symbol: 'DOGE', name: 'Dogecoin', weight: 100, dailyVolume: 2000000 },
      ],
      stopLoss: 15,
      takeProfit: 25,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: 'Trade proposal ready:',
          tradeProposal,
        }),
    });

    render(<AITradePage />);

    // Send a message to trigger proposal
    const textarea = screen.getByPlaceholderText('Describe your trading thesis...');
    fireEvent.change(textarea, { target: { value: 'BTC over DOGE' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Wait for Accept button and click it
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toBeTruthy();
    });

    const acceptButton = screen.getByRole('button', { name: /accept/i });
    fireEvent.click(acceptButton);

    // Verify console.log was called with the proposal
    expect(consoleSpy).toHaveBeenCalledWith('Trade proposal accepted:', expect.objectContaining({
      id: expect.any(String),
      longPositions: expect.arrayContaining([
        expect.objectContaining({ symbol: 'BTC' }),
      ]),
      shortPositions: expect.arrayContaining([
        expect.objectContaining({ symbol: 'DOGE' }),
      ]),
    }));

    consoleSpy.mockRestore();
  });

  // Test 4: Modify button sends refinement message
  it('should send refinement message when Modify button is clicked', async () => {
    const tradeProposal = {
      longPositions: [
        { symbol: 'SOL', name: 'Solana', weight: 100, dailyVolume: 4000000 },
      ],
      shortPositions: [
        { symbol: 'ADA', name: 'Cardano', weight: 100, dailyVolume: 3000000 },
      ],
      stopLoss: 15,
      takeProfit: 25,
    };

    // First API call for initial message
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: 'Here is a proposal:',
          tradeProposal,
        }),
    });

    render(<AITradePage />);

    // Send initial message
    const textarea = screen.getByPlaceholderText('Describe your trading thesis...');
    fireEvent.change(textarea, { target: { value: 'SOL vs ADA' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Wait for Modify button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /modify/i })).toBeTruthy();
    });

    // Mock second API call for modification
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          content: 'I can adjust the proposal. What changes would you like?',
        }),
    });

    // Click Modify button
    const modifyButton = screen.getByRole('button', { name: /modify/i });
    fireEvent.click(modifyButton);

    // Wait for refinement message to be sent
    await waitFor(() => {
      // Check that a refinement message appeared in the chat
      expect(screen.getByText(/I'd like to modify this proposal/i)).toBeTruthy();
    });

    // Verify second API call was made with modification context
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
