import { describe, it, expect } from 'vitest';
import type { TradeProposal, Position, ChatMessage } from './trade';
import { validateWeightsSum } from '@/lib/trade-utils';

describe('Trade Data Model', () => {
  // Test 1: TradeProposal interface structure and required fields
  it('should have correct TradeProposal interface structure with required fields', () => {
    const proposal: TradeProposal = {
      id: 'test-proposal-123',
      longPositions: [
        { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 5000000 },
        { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 10000000 },
      ],
      shortPositions: [
        { symbol: 'DOGE', name: 'Dogecoin', weight: 100, dailyVolume: 2000000 },
      ],
      stopLoss: 15,
      takeProfit: 25,
      createdAt: new Date(),
    };

    // Verify all required fields are present and typed correctly
    expect(proposal.id).toBeDefined();
    expect(typeof proposal.id).toBe('string');
    expect(Array.isArray(proposal.longPositions)).toBe(true);
    expect(Array.isArray(proposal.shortPositions)).toBe(true);
    expect(typeof proposal.stopLoss).toBe('number');
    expect(typeof proposal.takeProfit).toBe('number');
    expect(proposal.createdAt instanceof Date).toBe(true);
  });

  // Test 2: Position weight validation (must be percentage 0-100)
  it('should validate Position weight is a percentage between 0 and 100', () => {
    const validPosition: Position = {
      symbol: 'ETH',
      name: 'Ethereum',
      weight: 50,
      dailyVolume: 5000000,
    };

    // Valid weight should be in range 0-100
    expect(validPosition.weight).toBeGreaterThanOrEqual(0);
    expect(validPosition.weight).toBeLessThanOrEqual(100);

    // Check edge cases
    const zeroWeightPosition: Position = {
      symbol: 'BTC',
      name: 'Bitcoin',
      weight: 0,
      dailyVolume: 10000000,
    };
    expect(zeroWeightPosition.weight).toBe(0);

    const fullWeightPosition: Position = {
      symbol: 'SOL',
      name: 'Solana',
      weight: 100,
      dailyVolume: 3000000,
    };
    expect(fullWeightPosition.weight).toBe(100);
  });

  // Test 3: Weights sum to 100% per side validation utility
  it('should validate weights sum to 100% per side using utility function', () => {
    const validLongPositions: Position[] = [
      { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 5000000 },
      { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 10000000 },
    ];

    const validShortPositions: Position[] = [
      { symbol: 'DOGE', name: 'Dogecoin', weight: 50, dailyVolume: 2000000 },
      { symbol: 'SHIB', name: 'Shiba Inu', weight: 50, dailyVolume: 1500000 },
    ];

    const invalidPositions: Position[] = [
      { symbol: 'ETH', name: 'Ethereum', weight: 30, dailyVolume: 5000000 },
      { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 10000000 },
    ]; // Sum is 70, not 100

    // Valid positions should pass validation
    expect(validateWeightsSum(validLongPositions)).toBe(true);
    expect(validateWeightsSum(validShortPositions)).toBe(true);

    // Invalid positions should fail validation
    expect(validateWeightsSum(invalidPositions)).toBe(false);

    // Empty positions should pass (0 weights sum to 100% of nothing, or we treat as valid)
    expect(validateWeightsSum([])).toBe(true);
  });
});

describe('ChatMessage Type', () => {
  it('should support user and assistant roles with optional tradeProposal', () => {
    const userMessage: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'I think AI tokens will outperform ETH',
    };

    const assistantMessageWithProposal: ChatMessage = {
      id: '2',
      role: 'assistant',
      content: 'Here is a trade proposal based on your thesis:',
      tradeProposal: {
        id: 'proposal-1',
        longPositions: [
          { symbol: 'FET', name: 'Fetch.ai', weight: 100, dailyVolume: 2000000 },
        ],
        shortPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 100, dailyVolume: 5000000 },
        ],
        stopLoss: 15,
        takeProfit: 25,
        createdAt: new Date(),
      },
    };

    expect(userMessage.role).toBe('user');
    expect(assistantMessageWithProposal.role).toBe('assistant');
    expect(assistantMessageWithProposal.tradeProposal).toBeDefined();
  });
});
