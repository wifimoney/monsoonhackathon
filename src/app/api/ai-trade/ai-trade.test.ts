import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import handlers after setting up mocks
import { GET as getTokens, clearTokenCache } from './tokens/route';
import { POST as postChat } from './chat/route';

describe('AI Trade API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the token cache before each test
    clearTokenCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 1: /api/ai-trade/tokens returns filtered token list with $1M+ volume
  describe('GET /api/ai-trade/tokens', () => {
    it('should return filtered token list with $1M+ daily volume', async () => {
      const mockHyperliquidResponse = [
        {
          universe: [
            { name: 'BTC', szDecimals: 8 },
            { name: 'ETH', szDecimals: 8 },
            { name: 'LOWVOL', szDecimals: 8 },
          ],
        },
        [
          { dayNtlVlm: '5000000', markPx: '50000' }, // BTC: $5M volume
          { dayNtlVlm: '3000000', markPx: '3000' },  // ETH: $3M volume
          { dayNtlVlm: '500000', markPx: '1' },      // LOWVOL: $500K volume (below threshold)
        ],
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHyperliquidResponse),
      });

      const response = await getTokens();
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.tokens)).toBe(true);
      // Should only include tokens with $1M+ volume
      expect(data.tokens.length).toBe(2);
      expect(data.tokens.some((t: { symbol: string }) => t.symbol === 'LOWVOL')).toBe(false);
      expect(data.tokens.some((t: { symbol: string }) => t.symbol === 'BTC')).toBe(true);
      expect(data.tokens.some((t: { symbol: string }) => t.symbol === 'ETH')).toBe(true);
    });

    // Test 2: /api/ai-trade/tokens caching behavior (5-minute cache)
    it('should cache token list for 5 minutes', async () => {
      const mockHyperliquidResponse = [
        {
          universe: [
            { name: 'BTC', szDecimals: 8 },
          ],
        },
        [
          { dayNtlVlm: '5000000', markPx: '50000' },
        ],
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHyperliquidResponse),
      });

      // First request - should call fetch
      await getTokens();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request within 5 minutes - should use cache
      vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      await getTokens();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1 call (cached)

      // Third request after 5 minutes - should fetch again
      vi.advanceTimersByTime(2 * 60 * 1000); // 2 more minutes (total 6 minutes)
      await getTokens();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Now 2 calls
    });
  });

  // Test 3 & 4: /api/ai-trade/chat endpoint tests
  describe('POST /api/ai-trade/chat', () => {
    beforeEach(() => {
      // Set up OpenAI API key in environment
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    afterEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    // Test 3: /api/ai-trade/chat accepts message history and returns response
    it('should accept message history and return AI response', async () => {
      // Mock tokens endpoint response (for context)
      const mockTokensResponse = [
        {
          universe: [
            { name: 'BTC', szDecimals: 8 },
            { name: 'ETH', szDecimals: 8 },
          ],
        },
        [
          { dayNtlVlm: '5000000', markPx: '50000' },
          { dayNtlVlm: '3000000', markPx: '3000' },
        ],
      ];

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Based on your thesis, I recommend going long on BTC.',
            },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokensResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOpenAIResponse),
        });

      const request = new Request('http://localhost/api/ai-trade/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'I think BTC will outperform' },
          ],
          userInput: 'I think BTC will outperform',
        }),
      });

      const response = await postChat(request);
      const data = await response.json();

      expect(data.content).toBeDefined();
      expect(typeof data.content).toBe('string');
    });

    // Test 4: /api/ai-trade/chat response includes optional tradeProposal JSON
    it('should include tradeProposal JSON when AI generates one', async () => {
      // Mock tokens endpoint response
      const mockTokensResponse = [
        {
          universe: [
            { name: 'BTC', szDecimals: 8 },
            { name: 'ETH', szDecimals: 8 },
          ],
        },
        [
          { dayNtlVlm: '5000000', markPx: '50000' },
          { dayNtlVlm: '3000000', markPx: '3000' },
        ],
      ];

      // Mock OpenAI response with trade proposal JSON
      const tradeProposalJson = {
        longPositions: [
          { symbol: 'BTC', name: 'Bitcoin', weight: 100, dailyVolume: 5000000 },
        ],
        shortPositions: [
          { symbol: 'ETH', name: 'Ethereum', weight: 100, dailyVolume: 3000000 },
        ],
        stopLoss: 15,
        takeProfit: 25,
      };

      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: `Based on your thesis, here is a trade proposal:

\`\`\`json
${JSON.stringify(tradeProposalJson)}
\`\`\`

This positions you long BTC and short ETH.`,
            },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokensResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOpenAIResponse),
        });

      const request = new Request('http://localhost/api/ai-trade/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          userInput: 'I think BTC will beat ETH this month',
        }),
      });

      const response = await postChat(request);
      const data = await response.json();

      expect(data.content).toBeDefined();
      expect(data.tradeProposal).toBeDefined();
      expect(data.tradeProposal.longPositions).toBeDefined();
      expect(data.tradeProposal.shortPositions).toBeDefined();
      expect(data.tradeProposal.stopLoss).toBe(15);
      expect(data.tradeProposal.takeProfit).toBe(25);
    });
  });
});
