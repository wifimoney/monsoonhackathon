/**
 * API tests for token search endpoint
 * Task 2.1: Write 4-6 focused tests for API endpoints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock HyperliquidToken response data
const mockHyperliquidResponse = [
  {
    universe: [
      { name: 'BTC' },
      { name: 'ETH' },
      { name: 'SOL' },
      { name: 'FET' },
      { name: 'RNDR' },
    ],
  },
  [
    { dayNtlVlm: '5000000000' },
    { dayNtlVlm: '3000000000' },
    { dayNtlVlm: '1500000000' },
    { dayNtlVlm: '500000' }, // Below 1M threshold, should be filtered out
    { dayNtlVlm: '2000000' },
  ],
];

describe('Token Search API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('GET /api/ai-trade/tokens', () => {
    it('should return filtered results when query parameter is provided', async () => {
      // Setup mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHyperliquidResponse,
      });

      // Import the route handler dynamically to use mocked fetch
      const { GET, clearTokenCache } = await import('@/app/api/ai-trade/tokens/route');
      clearTokenCache();

      // Create request with query parameter
      const request = new Request('http://localhost:3000/api/ai-trade/tokens?query=BTC');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.tokens)).toBe(true);
      // BTC should be in results when filtering by 'BTC'
      const btcToken = data.tokens.find((t: { symbol: string }) => t.symbol === 'BTC');
      expect(btcToken).toBeDefined();
    });

    it('should return all tokens with sufficient volume when no query is provided', async () => {
      // Setup mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHyperliquidResponse,
      });

      const { GET, clearTokenCache } = await import('@/app/api/ai-trade/tokens/route');
      clearTokenCache();

      // Create request without query parameter
      const request = new Request('http://localhost:3000/api/ai-trade/tokens');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.tokens)).toBe(true);
      // FET with 500k volume should be filtered out (below 1M threshold)
      const fetToken = data.tokens.find((t: { symbol: string }) => t.symbol === 'FET');
      expect(fetToken).toBeUndefined();
    });

    it('should return empty array when Hyperliquid API fails', async () => {
      // Setup mock to fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { GET, clearTokenCache } = await import('@/app/api/ai-trade/tokens/route');
      clearTokenCache();

      const request = new Request('http://localhost:3000/api/ai-trade/tokens');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toEqual([]);
    });
  });
});
