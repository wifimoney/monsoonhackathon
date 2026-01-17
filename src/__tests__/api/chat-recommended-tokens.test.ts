/**
 * API tests for chat endpoint with recommendedTokens
 * Task 2.1: Test AI generates recommendedTokens in trade proposals
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variable
vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key');

describe('Chat API with Recommended Tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai-trade/chat', () => {
    it('should include recommendedTokens in TradeProposal response', async () => {
      // Mock Hyperliquid API for tokens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { universe: [{ name: 'BTC' }, { name: 'ETH' }, { name: 'SOL' }, { name: 'FET' }] },
          [
            { dayNtlVlm: '5000000000' },
            { dayNtlVlm: '3000000000' },
            { dayNtlVlm: '1500000000' },
            { dayNtlVlm: '2000000' },
          ],
        ],
      });

      // Mock OpenRouter API with recommendedTokens in response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `I see you're bullish on AI tokens. Here's a trade proposal:

\`\`\`json
{
  "longPositions": [
    { "symbol": "FET", "name": "Fetch.ai", "weight": 50, "dailyVolume": 2000000 },
    { "symbol": "RNDR", "name": "Render", "weight": 50, "dailyVolume": 1500000 }
  ],
  "shortPositions": [
    { "symbol": "BTC", "name": "Bitcoin", "weight": 100, "dailyVolume": 5000000000 }
  ],
  "recommendedTokens": [
    { "symbol": "AGIX", "name": "SingularityNET", "relevance": "Leading AI token" },
    { "symbol": "OCEAN", "name": "Ocean Protocol", "relevance": "Data for AI" },
    { "symbol": "TAO", "name": "Bittensor", "relevance": "Decentralized AI network" }
  ]
}
\`\`\`

This positions you for the AI narrative while hedging with BTC.`,
              },
            },
          ],
        }),
      });

      const { POST } = await import('@/app/api/ai-trade/chat/route');

      const request = new Request('http://localhost:3000/api/ai-trade/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          userInput: 'I am bullish on AI tokens',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tradeProposal).toBeDefined();
      expect(data.tradeProposal.recommendedTokens).toBeDefined();
      expect(Array.isArray(data.tradeProposal.recommendedTokens)).toBe(true);
      expect(data.tradeProposal.recommendedTokens.length).toBeLessThanOrEqual(3);

      // Verify recommendedTokens structure
      const firstRecommended = data.tradeProposal.recommendedTokens[0];
      expect(firstRecommended).toHaveProperty('symbol');
      expect(firstRecommended).toHaveProperty('name');
      expect(firstRecommended).toHaveProperty('relevance');
    });

    it('should handle TradeProposal without recommendedTokens gracefully', async () => {
      // Mock Hyperliquid API for tokens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { universe: [{ name: 'BTC' }, { name: 'ETH' }] },
          [{ dayNtlVlm: '5000000000' }, { dayNtlVlm: '3000000000' }],
        ],
      });

      // Mock OpenRouter API without recommendedTokens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `Here's a simple BTC/ETH trade:

\`\`\`json
{
  "longPositions": [
    { "symbol": "ETH", "name": "Ethereum", "weight": 100, "dailyVolume": 3000000000 }
  ],
  "shortPositions": [
    { "symbol": "BTC", "name": "Bitcoin", "weight": 100, "dailyVolume": 5000000000 }
  ]
}
\`\`\``,
              },
            },
          ],
        }),
      });

      const { POST } = await import('@/app/api/ai-trade/chat/route');

      const request = new Request('http://localhost:3000/api/ai-trade/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          userInput: 'ETH will outperform BTC',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tradeProposal).toBeDefined();
      // recommendedTokens should be undefined or empty array if not provided
      expect(
        data.tradeProposal.recommendedTokens === undefined ||
          data.tradeProposal.recommendedTokens.length === 0
      ).toBe(true);
    });
  });
});
