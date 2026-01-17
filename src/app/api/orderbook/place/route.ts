import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { market, side, size, price, leverage } = await request.json();

    if (!market || !side || !size || !price) {
        return NextResponse.json(
            { success: false, error: 'market, side, size, price are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'orderbook_place',
        market,
        side,
        notionalUsd: Number(size),
        leverage: leverage ? Number(leverage) : undefined,
        orderType: 'SPOT_LIMIT_ORDER',
        metadata: { price: Number(price) },
    });

    return NextResponse.json(result.body, { status: result.status });
}
