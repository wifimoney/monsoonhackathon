import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatInput } from './ChatInput';
import { MessageHistory } from './MessageHistory';
import { StarterPrompts } from './StarterPrompts';
import { TradeProposalCard } from '../trade/TradeProposalCard';
import type { ChatMessage, TradeProposal } from '@/types/trade';

describe('UI Components', () => {
  // Test 1: ChatInput component handles Enter to send, Shift+Enter for newline
  describe('ChatInput', () => {
    it('should handle Enter to send and Shift+Enter for newline', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} isLoading={false} />);

      const textarea = screen.getByPlaceholderText('Describe your trading thesis...');

      // Shift+Enter should NOT send (allows newline)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      expect(onSend).not.toHaveBeenCalled();

      // Regular Enter should send
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(onSend).toHaveBeenCalledWith('Test message');
    });

    // Test 2: ChatInput disabled state while awaiting response
    it('should be disabled while awaiting response', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} isLoading={true} />);

      const textarea = screen.getByPlaceholderText('Describe your trading thesis...');
      const sendButton = screen.getByRole('button');

      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Verify loading spinner is shown
      expect(sendButton.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  // Test 3: MessageHistory renders user messages right-aligned, AI left-aligned
  describe('MessageHistory', () => {
    it('should render user messages right-aligned and AI messages left-aligned', () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'I think BTC will go up' },
        { id: '2', role: 'assistant', content: 'Here is my analysis...' },
      ];

      render(<MessageHistory messages={messages} onModify={() => { }} />);

      const userMessage = screen.getByText('I think BTC will go up');
      const aiMessage = screen.getByText('Here is my analysis...');

      // Check user message container has right-align class
      const userContainer = userMessage.closest('[data-role="user"]');
      expect(userContainer).toBeTruthy();
      expect(userContainer?.classList.contains('justify-end')).toBe(true);

      // Check AI message container has left-align class
      const aiContainer = aiMessage.closest('[data-role="assistant"]');
      expect(aiContainer).toBeTruthy();
      expect(aiContainer?.classList.contains('justify-start')).toBe(true);
    });
  });

  // Test 4: TradeProposalCard displays LONG/SHORT positions with correct colors
  describe('TradeProposalCard', () => {
    it('should display LONG/SHORT positions with correct colors', () => {
      const proposal: TradeProposal = {
        id: 'test-1',
        longPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 60, dailyVolume: 5000000 },
          { symbol: 'ETH', name: 'Ethereum', weight: 40, dailyVolume: 3000000 },
        ],
        shortPositions: [
          { symbol: 'DOGE', name: 'Dogecoin', weight: 100, dailyVolume: 2000000 },
        ],
        stopLoss: 15,
        takeProfit: 25,
        createdAt: new Date(),
      };

      render(<TradeProposalCard proposal={proposal} onModify={() => { }} />);

      // Check LONG section exists with accent color
      const longSection = screen.getByTestId('long-section');
      expect(longSection).toBeTruthy();
      expect(longSection.classList.contains('border-accent') ||
        longSection.style.borderColor === 'var(--accent)' ||
        longSection.querySelector('[class*="accent"]')).toBeTruthy();

      // Check SHORT section exists with danger color
      const shortSection = screen.getByTestId('short-section');
      expect(shortSection).toBeTruthy();
      expect(shortSection.classList.contains('border-danger') ||
        shortSection.style.borderColor === 'var(--danger)' ||
        shortSection.querySelector('[class*="danger"]')).toBeTruthy();

      // Check tokens are displayed
      expect(screen.getByText('BTC')).toBeTruthy();
      expect(screen.getByText('ETH')).toBeTruthy();
      expect(screen.getByText('DOGE')).toBeTruthy();

      // Check guardrails are displayed
      expect(screen.getByText(/-15%/)).toBeTruthy();
      expect(screen.getByText(/\+25%/)).toBeTruthy();
    });
  });

  // Test 5: StarterPrompts disappear after first message sent
  describe('StarterPrompts', () => {
    it('should disappear after first message is sent', () => {
      const onSelectPrompt = vi.fn();

      // Render with no messages - prompts should show
      const { rerender } = render(
        <StarterPrompts
          onSelectPrompt={onSelectPrompt}
          hasMessages={false}
        />
      );

      // Starter prompts should be visible
      expect(screen.getByText('I think AI will beat ETH')).toBeTruthy();
      expect(screen.getByText('Bullish on L2s vs L1s')).toBeTruthy();
      expect(screen.getByText('DeFi will outperform memecoins')).toBeTruthy();

      // Click a prompt
      fireEvent.click(screen.getByText('I think AI will beat ETH'));
      expect(onSelectPrompt).toHaveBeenCalledWith('I think AI will beat ETH');

      // Rerender with hasMessages=true - prompts should not render
      rerender(
        <StarterPrompts
          onSelectPrompt={onSelectPrompt}
          hasMessages={true}
        />
      );

      // Prompts should not be visible
      expect(screen.queryByText('I think AI will beat ETH')).toBeNull();
      expect(screen.queryByText('Bullish on L2s vs L1s')).toBeNull();
      expect(screen.queryByText('DeFi will outperform memecoins')).toBeNull();
    });
  });
});
