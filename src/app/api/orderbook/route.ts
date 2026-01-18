import { NextResponse } from 'next/server';

// HyperLiquid API endpoints
const HYPERLIQUID_API = 'https://api.hyperliquid-testnet.xyz';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset') || 'HYPE';

    try {
        // Fetch L2 orderbook data from HyperLiquid
        const response = await fetch(`${HYPERLIQUID_API}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'l2Book',
                coin: asset,
                nSigFigs: 5
            })
        });

        if (!response.ok) {
            // Return mock data if API fails
            return NextResponse.json(getMockOrderbook(asset));
        }

        const data = await response.json();

        // Transform HyperLiquid format to our format
        const orderbook = {
            asset,
            timestamp: Date.now(),
            bids: (data.levels?.[0] || []).slice(0, 10).map((level: any) => ({
                price: level.px,
                size: level.sz,
                total: (parseFloat(level.px) * parseFloat(level.sz)).toFixed(2)
            })),
            asks: (data.levels?.[1] || []).slice(0, 10).map((level: any) => ({
                price: level.px,
                size: level.sz,
                total: (parseFloat(level.px) * parseFloat(level.sz)).toFixed(2)
            })),
            midPrice: calculateMidPrice(data.levels),
            spread: calculateSpread(data.levels)
        };

        return NextResponse.json(orderbook);
    } catch (error) {
        console.error('Error fetching orderbook:', error);
        // Return mock data on error
        return NextResponse.json(getMockOrderbook(asset));
    }
}

function calculateMidPrice(levels: any[]): string {
    if (!levels || levels.length < 2) return '0';
    const bestBid = parseFloat(levels[0]?.[0]?.px || '0');
    const bestAsk = parseFloat(levels[1]?.[0]?.px || '0');
    return ((bestBid + bestAsk) / 2).toFixed(2);
}

function calculateSpread(levels: any[]): { absolute: string; percentage: string } {
    if (!levels || levels.length < 2) return { absolute: '0', percentage: '0' };
    const bestBid = parseFloat(levels[0]?.[0]?.px || '0');
    const bestAsk = parseFloat(levels[1]?.[0]?.px || '0');
    const spread = bestAsk - bestBid;
    const percentage = bestBid > 0 ? ((spread / bestBid) * 100).toFixed(4) : '0';
    return { absolute: spread.toFixed(2), percentage };
}

function getMockOrderbook(asset: string) {
    const basePrice = asset === 'HYPE' ? 24.50 : asset === 'ETH' ? 3245.80 : 100;

    return {
        asset,
        timestamp: Date.now(),
        bids: Array.from({ length: 5 }, (_, i) => {
            const price = (basePrice - (i + 1) * 0.10).toFixed(2);
            const size = (Math.random() * 5 + 1).toFixed(3);
            return { price, size, total: (parseFloat(price) * parseFloat(size)).toFixed(2) };
        }),
        asks: Array.from({ length: 5 }, (_, i) => {
            const price = (basePrice + (i + 1) * 0.10).toFixed(2);
            const size = (Math.random() * 5 + 1).toFixed(3);
            return { price, size, total: (parseFloat(price) * parseFloat(size)).toFixed(2) };
        }),
        midPrice: basePrice.toFixed(2),
        spread: { absolute: '0.20', percentage: '0.08' },
        isMock: true
    };
}
