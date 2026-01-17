import { NextResponse } from 'next/server';
import type { HyperliquidToken } from '@/types/trade';

/**
 * In-memory cache for token list
 */
interface TokenCache {
  data: HyperliquidToken[];
  timestamp: number;
}

let tokenCache: TokenCache | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MIN_DAILY_VOLUME_USD = 1_000_000; // $1M minimum volume

/**
 * Hyperliquid API response types
 */
interface HyperliquidAssetMeta {
  name: string;
  szDecimals: number;
}

interface HyperliquidAssetContext {
  dayNtlVlm: string;
  markPx: string;
}

type HyperliquidMetaAndAssetCtxsResponse = [
  { universe: HyperliquidAssetMeta[] },
  HyperliquidAssetContext[]
];

/**
 * Fetches all available tokens from Hyperliquid API
 * Uses caching to reduce API calls
 */
async function fetchAllTokens(): Promise<HyperliquidToken[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (tokenCache && now - tokenCache.timestamp < CACHE_DURATION_MS) {
    return tokenCache.data;
  }

  // Fetch fresh data from Hyperliquid API
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid API error: ${response.status}`);
  }

  const data: HyperliquidMetaAndAssetCtxsResponse = await response.json();
  const [meta, assetContexts] = data;

  // Map and filter tokens by volume
  const tokens: HyperliquidToken[] = [];
  for (let i = 0; i < meta.universe.length; i++) {
    const assetMeta = meta.universe[i];
    const assetCtx = assetContexts[i];

    if (!assetCtx) continue;

    const dailyVolumeUsd = parseFloat(assetCtx.dayNtlVlm);

    // Filter by minimum volume threshold
    if (dailyVolumeUsd >= MIN_DAILY_VOLUME_USD) {
      tokens.push({
        symbol: assetMeta.name,
        name: assetMeta.name, // Hyperliquid uses same value for name
        dailyVolumeUsd,
      });
    }
  }

  // Sort by volume descending
  tokens.sort((a, b) => b.dailyVolumeUsd - a.dailyVolumeUsd);

  // Update cache
  tokenCache = {
    data: tokens,
    timestamp: now,
  };

  return tokens;
}

/**
 * Filters tokens by query string (matches symbol or name)
 */
function filterTokens(tokens: HyperliquidToken[], query: string): HyperliquidToken[] {
  if (!query || query.trim() === '') {
    return tokens;
  }

  const lowerQuery = query.toLowerCase().trim();
  return tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * GET /api/ai-trade/tokens
 *
 * Fetches available tokens from Hyperliquid API.
 * Accepts optional `query` parameter for filtering by symbol/name.
 * Filters tokens by minimum $1M USD daily volume threshold.
 * Implements 5-minute in-memory cache for token list.
 *
 * @returns Array of HyperliquidToken objects
 */
export async function GET(request: Request) {
  try {
    // Parse query parameter from URL
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';

    // Fetch all tokens (with caching)
    const allTokens = await fetchAllTokens();

    // Filter by query if provided
    const filteredTokens = filterTokens(allTokens, query);

    return NextResponse.json({
      success: true,
      tokens: filteredTokens,
      cached: tokenCache !== null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tokens';
    console.error('Token search error:', errorMessage);
    return NextResponse.json({
      success: true,
      tokens: [],
      cached: false,
    });
  }
}

/**
 * Exported for testing purposes - clears the token cache
 */
export function clearTokenCache() {
  tokenCache = null;
}
