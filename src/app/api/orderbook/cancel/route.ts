import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { market, orderId } = await request.json();

    if (!market || !orderId) {
        return NextResponse.json(
            { success: false, error: 'market and orderId are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'orderbook_cancel',
        market,
        side: 'SELL',
        notionalUsd: 0,
        metadata: { orderId },
    });

    return NextResponse.json(result.body, { status: result.status });
}
