import { NextResponse } from 'next/server';

/**
 * Token data returned by the API
 */
export interface TokenData {
  symbol: string;
  name: string;
  dailyVolumeUsd: number;
}

/**
 * In-memory cache for token list
 */
interface TokenCache {
  data: TokenData[];
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
 * GET /api/ai-trade/tokens
 *
 * Fetches available tokens from Hyperliquid API.
 * Filters tokens by minimum $1M USD daily volume threshold.
 * Implements 5-minute in-memory cache for token list.
 */
export async function GET() {
  try {
    // Check cache validity
    const now = Date.now();
    if (tokenCache && (now - tokenCache.timestamp) < CACHE_DURATION_MS) {
      return NextResponse.json({
        success: true,
        tokens: tokenCache.data,
        cached: true,
      });
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
    const tokens: TokenData[] = [];
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

    return NextResponse.json({
      success: true,
      tokens,
      cached: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tokens';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Exported for testing purposes - clears the token cache
 */
export function clearTokenCache() {
  tokenCache = null;
}
