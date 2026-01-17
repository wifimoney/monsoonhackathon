import type { ParsedIntent } from './intent-classifier';
import type { HyperliquidMarket, MarketMatch } from './types';
import { getMarkets } from './market-data';

// ============ KEYWORD MAPPINGS ============
const KEYWORD_TO_TAGS: Record<string, string[]> = {
    // Asset classes
    gold: ['commodity', 'precious_metal', 'safe_haven'],
    oil: ['commodity', 'energy'],
    silver: ['commodity', 'precious_metal'],
    commodities: ['commodity', 'rwa'],
    crypto: ['crypto'],

    // Preferences
    safe: ['safe_haven', 'stable'],
    hedge: ['safe_haven', 'inflation_hedge'],
    inflation: ['inflation_hedge'],
    volatile: ['volatile'],
    yield: ['defi', 'yield'],

    // Specific assets
    btc: ['crypto', 'digital_gold'],
    bitcoin: ['crypto', 'digital_gold'],
    eth: ['crypto', 'defi'],
    ethereum: ['crypto', 'defi'],
};

const PREFERENCE_WEIGHTS: Record<string, Record<string, number>> = {
    low_risk: { spread: -2, volume24h: 1, volatility: -2 },
    high_yield: { fundingRate: 1, volume24h: 0.5 },
    balanced: { volume24h: 1, spread: -1 },
    hedge: { safe_haven: 2, inflation_hedge: 2 },
};

// ============ MATCHER FUNCTION ============
export async function matchMarkets(intent: ParsedIntent): Promise<MarketMatch[]> {
    const markets = await getMarkets();

    // Stage A: Hard filter
    let filtered = markets;

    // Filter by asset class
    if (intent.assetClass !== 'all') {
        filtered = filtered.filter(m =>
            m.tags.includes(intent.assetClass) ||
            (m.tags.includes('rwa') && intent.assetClass === 'commodities') ||
            (m.tags.includes('commodity') && intent.assetClass === 'commodities')
        );
    }

    // Filter by explicit market constraints
    if (intent.constraints.markets?.length) {
        filtered = filtered.filter(m =>
            intent.constraints.markets!.some(c =>
                m.symbol.toUpperCase() === c.toUpperCase()
            )
        );
    }

    // Exclude markets
    if (intent.constraints.excludeMarkets?.length) {
        filtered = filtered.filter(m =>
            !intent.constraints.excludeMarkets!.includes(m.symbol)
        );
    }

    // If filtered is empty, fall back to all markets
    if (filtered.length === 0) {
        filtered = markets;
    }

    // Stage B: Score and rank
    const scored = filtered.map(market => scoreMarket(market, intent));

    // Sort by total score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5); // Top 5
}

function scoreMarket(market: HyperliquidMarket, intent: ParsedIntent): MarketMatch {
    const matchReasons: string[] = [];

    // Relevance score (0-1): how well tags match intent
    let relevanceScore = 0;
    const queryWords = intent.rawQuery.toLowerCase().split(/\s+/);

    for (const word of queryWords) {
        const tags = KEYWORD_TO_TAGS[word] || [];
        for (const tag of tags) {
            if (market.tags.includes(tag)) {
                relevanceScore += 0.3;
                matchReasons.push(`Matches "${word}"`);
            }
        }
    }
    relevanceScore = Math.min(relevanceScore, 1);

    // Liquidity score (0-1): volume and OI
    const volumeNorm = Math.min(market.volume24h / 100_000_000, 1);
    const oiNorm = Math.min(market.openInterest / 50_000_000, 1);
    const liquidityScore = (volumeNorm + oiNorm) / 2;

    if (liquidityScore > 0.5) {
        matchReasons.push('High liquidity');
    }

    // Risk score (0-1): lower is better, inverted for final score
    const spreadRisk = Math.min(market.spread * 100, 1);
    const fundingRisk = Math.abs(market.fundingRate) * 100;
    const riskScore = 1 - (spreadRisk + fundingRisk) / 2;

    if (riskScore > 0.7) {
        matchReasons.push('Low risk profile');
    }

    // Apply preference weights
    let preferenceBonus = 0;
    const weights = PREFERENCE_WEIGHTS[intent.preference] || {};

    if (weights.spread) preferenceBonus += weights.spread * (1 - spreadRisk);
    if (weights.volume24h) preferenceBonus += weights.volume24h * volumeNorm;

    // Check for tag bonuses
    if (intent.preference === 'hedge' || intent.preference === 'low_risk') {
        if (market.tags.includes('safe_haven')) {
            preferenceBonus += 0.3;
            matchReasons.push('Safe haven asset');
        }
        if (market.tags.includes('inflation_hedge')) {
            preferenceBonus += 0.3;
            matchReasons.push('Inflation hedge');
        }
    }

    // Total score
    const score = (relevanceScore * 0.4) + (liquidityScore * 0.3) + (riskScore * 0.2) + (Math.min(preferenceBonus, 0.5) * 0.1);

    return {
        symbol: market.symbol,
        market,
        score,
        relevanceScore,
        liquidityScore,
        riskScore,
        matchReasons: [...new Set(matchReasons)], // Dedupe
    };
}
