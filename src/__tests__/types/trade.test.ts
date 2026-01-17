/**
 * Type validation tests for Trade Modification Modal feature
 * Task 1.1: Write 3-4 focused tests for type validation
 */
import { describe, it, expect } from 'vitest';
import type {
  TradeProposal,
  RecommendedToken,
  HyperliquidToken,
  ModificationRequest,
  Position,
} from '@/types/trade';

describe('Trade Types', () => {
  describe('TradeProposal with recommendedTokens', () => {
    it('should allow TradeProposal with recommendedTokens array', () => {
      const proposal: TradeProposal = {
        id: 'test-1',
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 1000000 },
        ],
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 2000000 },
        ],
        stopLoss: 15,
        takeProfit: 25,
        createdAt: new Date(),
        recommendedTokens: [
          { symbol: 'SOL', name: 'Solana', relevance: 'High correlation with AI narrative' },
          { symbol: 'RNDR', name: 'Render', relevance: 'GPU computing for AI' },
        ],
        isLatest: true,
      };

      expect(proposal.recommendedTokens).toBeDefined();
      expect(proposal.recommendedTokens).toHaveLength(2);
      expect(proposal.isLatest).toBe(true);
    });

    it('should allow TradeProposal without recommendedTokens (optional field)', () => {
      const proposal: TradeProposal = {
        id: 'test-2',
        longPositions: [],
        shortPositions: [],
        stopLoss: 10,
        takeProfit: 20,
        createdAt: new Date(),
      };

      expect(proposal.recommendedTokens).toBeUndefined();
      expect(proposal.isLatest).toBeUndefined();
    });
  });

  describe('RecommendedToken interface structure', () => {
    it('should have symbol, name, and relevance fields', () => {
      const token: RecommendedToken = {
        symbol: 'FET',
        name: 'Fetch.ai',
        relevance: 'Leading AI agent token in the AI crypto narrative',
      };

      expect(token.symbol).toBe('FET');
      expect(token.name).toBe('Fetch.ai');
      expect(token.relevance).toBe('Leading AI agent token in the AI crypto narrative');
    });
  });

  describe('HyperliquidToken interface mapping', () => {
    it('should have symbol, name, and dailyVolumeUsd fields', () => {
      const token: HyperliquidToken = {
        symbol: 'ETH',
        name: 'Ethereum',
        dailyVolumeUsd: 5000000000,
      };

      expect(token.symbol).toBe('ETH');
      expect(token.name).toBe('Ethereum');
      expect(token.dailyVolumeUsd).toBe(5000000000);
    });
  });

  describe('ModificationRequest data shape', () => {
    it('should have originalProposalId, longPositions, and shortPositions', () => {
      const longPositions: Position[] = [
        { symbol: 'ETH', name: 'Ethereum', weight: 50, dailyVolume: 1000000 },
        { symbol: 'SOL', name: 'Solana', weight: 30, dailyVolume: 500000 },
      ];

      const shortPositions: Position[] = [
        { symbol: 'BTC', name: 'Bitcoin', weight: 60, dailyVolume: 2000000 },
      ];

      const request: ModificationRequest = {
        originalProposalId: 'proposal-123',
        longPositions,
        shortPositions,
      };

      expect(request.originalProposalId).toBe('proposal-123');
      expect(request.longPositions).toHaveLength(2);
      expect(request.shortPositions).toHaveLength(1);
      expect(request.longPositions[0].symbol).toBe('ETH');
      expect(request.shortPositions[0].symbol).toBe('BTC');
    });
  });
});
