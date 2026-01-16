import type { HyperliquidMarket } from './types';

// Static market data for hackathon
const MARKETS: HyperliquidMarket[] = [
    {
        symbol: 'GOLD',
        baseAsset: 'GOLD',
        quoteAsset: 'USDH',
        price: 2650,
        volume24h: 15_000_000,
        openInterest: 8_000_000,
        fundingRate: 0.0001,
        spread: 0.0005,
        tags: ['commodity', 'rwa', 'safe_haven', 'inflation_hedge', 'precious_metal'],
    },
    {
        symbol: 'OIL',
        baseAsset: 'OIL',
        quoteAsset: 'USDH',
        price: 78,
        volume24h: 12_000_000,
        openInterest: 6_000_000,
        fundingRate: 0.0002,
        spread: 0.0008,
        tags: ['commodity', 'rwa', 'energy'],
    },
    {
        symbol: 'SILVER',
        baseAsset: 'SILVER',
        quoteAsset: 'USDH',
        price: 31,
        volume24h: 5_000_000,
        openInterest: 2_000_000,
        fundingRate: 0.0001,
        spread: 0.001,
        tags: ['commodity', 'rwa', 'precious_metal'],
    },
    {
        symbol: 'BTC',
        baseAsset: 'BTC',
        quoteAsset: 'USDH',
        price: 105000,
        volume24h: 500_000_000,
        openInterest: 200_000_000,
        fundingRate: 0.0003,
        spread: 0.0002,
        tags: ['crypto', 'digital_gold', 'volatile'],
    },
    {
        symbol: 'ETH',
        baseAsset: 'ETH',
        quoteAsset: 'USDH',
        price: 3800,
        volume24h: 300_000_000,
        openInterest: 100_000_000,
        fundingRate: 0.0002,
        spread: 0.0003,
        tags: ['crypto', 'defi', 'volatile'],
    },
];

let cachedMarkets: HyperliquidMarket[] = MARKETS;

export async function getMarkets(): Promise<HyperliquidMarket[]> {
    // For hackathon: use static data
    // In prod: fetch from Hyperliquid API
    return cachedMarkets;
}

export function getMarketBySymbol(symbol: string): HyperliquidMarket | undefined {
    return cachedMarkets.find(m => m.symbol.toUpperCase() === symbol.toUpperCase());
}

export function getAllMarketSymbols(): string[] {
    return cachedMarkets.map(m => m.symbol);
}
