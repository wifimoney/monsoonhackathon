import { NextResponse } from 'next/server';
import { GuardianService } from '@/lib/guardian-service';
import { recordAudit } from '@/audit';

interface PlaceOrderRequest {
    asset: string;
    side: 'buy' | 'sell';
    orderType: 'limit' | 'market';
    price?: number;  // Required for limit orders
    size: number;
    reduceOnly?: boolean;
}

export async function POST(request: Request) {
    try {
        const body: PlaceOrderRequest = await request.json();
        const { asset, side, orderType, price, size, reduceOnly } = body;

        // Validate required fields
        if (!asset || !side || !size) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (orderType === 'limit' && !price) {
            return NextResponse.json({ error: 'Price required for limit orders' }, { status: 400 });
        }

        const notionalUsd = (price || 100) * size; // Estimate for market orders

        console.log(`[Orderbook] ${side.toUpperCase()} ${size} ${asset} @ ${price || 'MARKET'}`);

        // 1. Guardian Policy Check
        const policyResult = await GuardianService.validateTradeRequest({
            symbol: asset,
            size: notionalUsd,
            side: side.toUpperCase() as 'BUY' | 'SELL',
            leverage: 1
        });

        // Record policy check audit
        await recordAudit({
            actionType: 'order',
            actionCategory: 'policy',
            status: policyResult.success ? 'approved' : 'denied',
            account: { id: 'ORDERBOOK_USER', name: 'Orderbook User', address: '0x0' },
            result: { passed: policyResult.success, denials: policyResult.denials || [] },
            payload: {
                market: asset,
                side: side,
                amount: notionalUsd,
                price: price,
                description: `${orderType} ${side} order policy check`
            },
            source: 'user'
        });

        if (!policyResult.success) {
            return NextResponse.json({
                success: false,
                error: `Policy Violation: ${policyResult.reason}`,
                denials: policyResult.denials
            }, { status: 403 });
        }

        // 2. Execute Order via HyperLiquid
        const orderResult = await executeHyperliquidOrder({
            asset,
            side,
            orderType,
            price,
            size,
            reduceOnly
        });

        // 3. Record execution audit
        await recordAudit({
            actionType: 'order',
            actionCategory: 'execution',
            status: orderResult.success ? 'pending' : 'failed',
            account: { id: 'ORDERBOOK_USER', name: 'Orderbook', address: '0x0' },
            result: { passed: orderResult.success, denials: [] },
            payload: {
                market: asset,
                side: side,
                amount: notionalUsd,
                price: price,
                description: `${orderType} ${side} order executed`
            },
            orderId: orderResult.orderId,
            source: 'user'
        });

        return NextResponse.json({
            success: orderResult.success,
            orderId: orderResult.orderId,
            filledPrice: orderResult.filledPrice,
            filledSize: orderResult.filledSize,
            status: orderResult.status
        });

    } catch (error: any) {
        console.error('Error placing order:', error);
        return NextResponse.json({ error: error.message || 'Order failed' }, { status: 500 });
    }
}

interface OrderResult {
    success: boolean;
    orderId?: string;
    filledPrice?: number;
    filledSize?: number;
    status: string;
}

async function executeHyperliquidOrder(params: PlaceOrderRequest): Promise<OrderResult> {
    // In production, this would call the HyperLiquid Exchange API
    // For now, we simulate the order

    const HYPERLIQUID_EXCHANGE_API = 'https://api.hyperliquid-testnet.xyz/exchange';

    try {
        // Build order payload (HyperLiquid format)
        const orderPayload = {
            action: {
                type: 'order',
                orders: [{
                    a: getAssetIndex(params.asset),
                    b: params.side === 'buy',
                    p: params.price?.toString() || '0',
                    s: params.size.toString(),
                    r: params.reduceOnly || false,
                    t: params.orderType === 'market' ? { market: {} } : { limit: { tif: 'Gtc' } }
                }],
                grouping: 'na'
            },
            nonce: Date.now(),
            signature: 'DEMO_SIGNATURE' // Would be real signature in production
        };

        console.log('[HyperLiquid] Order payload:', JSON.stringify(orderPayload, null, 2));

        // For demo, return mock success
        // In production: const response = await fetch(HYPERLIQUID_EXCHANGE_API, {...})

        return {
            success: true,
            orderId: `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            filledPrice: params.price,
            filledSize: params.size,
            status: params.orderType === 'market' ? 'filled' : 'open'
        };

    } catch (error: any) {
        console.error('[HyperLiquid] Order error:', error);
        return {
            success: false,
            status: 'error'
        };
    }
}

function getAssetIndex(asset: string): number {
    // HyperLiquid uses numeric indices for assets
    const assetMap: Record<string, number> = {
        'HYPE': 0,
        'ETH': 1,
        'BTC': 2,
        'SOL': 3,
        'ARB': 4
    };
    return assetMap[asset] || 0;
}
