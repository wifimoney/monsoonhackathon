/**
 * API tests for trade modification endpoint
 * Task 2.1: Write 4-6 focused tests for API endpoints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ModificationRequest, Position } from '@/types/trade';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variable
vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key');

describe('Trade Modification API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai-trade/modify', () => {
    it('should accept valid modification payload', async () => {
      // Mock Hyperliquid API for tokens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { universe: [{ name: 'BTC' }, { name: 'ETH' }] },
          [{ dayNtlVlm: '5000000000' }, { dayNtlVlm: '3000000000' }],
        ],
      });

      // Mock OpenRouter API for AI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `Based on your modifications, here's my updated analysis.

\`\`\`json
{
  "longPositions": [
    { "symbol": "ETH", "name": "Ethereum", "weight": 60, "dailyVolume": 3000000000 }
  ],
  "shortPositions": [
    { "symbol": "BTC", "name": "Bitcoin", "weight": 40, "dailyVolume": 5000000000 }
  ],
  "recommendedTokens": [
    { "symbol": "SOL", "name": "Solana", "relevance": "Correlated with ETH" }
  ]
}
\`\`\``,
              },
            },
          ],
        }),
      });

      const { POST } = await import('@/app/api/ai-trade/modify/route');

      const validPayload: ModificationRequest = {
        originalProposalId: 'proposal-123',
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 3000000000 },
        ],
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 5000000000 },
        ],
      };

      const request = new Request('http://localhost:3000/api/ai-trade/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBeDefined();
      expect(data.tradeProposal).toBeDefined();
    });

    it('should reject payload when LONG side exceeds 100%', async () => {
      const { POST } = await import('@/app/api/ai-trade/modify/route');

      const invalidPayload: ModificationRequest = {
        originalProposalId: 'proposal-123',
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 3000000000 },
          { symbol: 'SOL', name: 'Solana', weight: 50, dailyVolume: 1500000000 },
        ],
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 40, dailyVolume: 5000000000 },
        ],
      };

      const request = new Request('http://localhost:3000/api/ai-trade/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('LONG');
      expect(data.error).toContain('100%');
    });

    it('should reject payload when SHORT side exceeds 100%', async () => {
      const { POST } = await import('@/app/api/ai-trade/modify/route');

      const invalidPayload: ModificationRequest = {
        originalProposalId: 'proposal-123',
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 60, dailyVolume: 3000000000 },
        ],
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 70, dailyVolume: 5000000000 },
          { symbol: 'SOL', name: 'Solana', weight: 50, dailyVolume: 1500000000 },
        ],
      };

      const request = new Request('http://localhost:3000/api/ai-trade/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('SHORT');
      expect(data.error).toContain('100%');
    });

    it('should trigger new AI response with reasoning for modifications', async () => {
      // Mock Hyperliquid API for tokens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { universe: [{ name: 'BTC' }, { name: 'ETH' }] },
          [{ dayNtlVlm: '5000000000' }, { dayNtlVlm: '3000000000' }],
        ],
      });

      // Mock OpenRouter API for AI response with reasoning
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `Great modifications! By increasing ETH weight to 70%, you're expressing stronger conviction in Ethereum's performance.

\`\`\`json
{
  "longPositions": [
    { "symbol": "ETH", "name": "Ethereum", "weight": 70, "dailyVolume": 3000000000 }
  ],
  "shortPositions": [
    { "symbol": "BTC", "name": "Bitcoin", "weight": 30, "dailyVolume": 5000000000 }
  ],
  "recommendedTokens": [
    { "symbol": "ARB", "name": "Arbitrum", "relevance": "L2 on Ethereum" }
  ]
}
\`\`\``,
              },
            },
          ],
        }),
      });

      const { POST } = await import('@/app/api/ai-trade/modify/route');

      const validPayload: ModificationRequest = {
        originalProposalId: 'proposal-123',
        longPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 70, dailyVolume: 3000000000 },
        ],
        shortPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 30, dailyVolume: 5000000000 },
        ],
      };

      const request = new Request('http://localhost:3000/api/ai-trade/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toContain('modifications');
      expect(data.tradeProposal).toBeDefined();
      expect(data.tradeProposal.longPositions[0].weight).toBe(70);
    });
  });
});
