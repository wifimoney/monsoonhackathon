import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { market, takeProfit } = await request.json();

    if (!market || takeProfit === undefined) {
        return NextResponse.json(
            { success: false, error: 'market and takeProfit are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'pear_set_tp',
        market,
        side: 'SELL',
        notionalUsd: 0,
        metadata: { takeProfit: Number(takeProfit) },
    });

    return NextResponse.json(result.body, { status: result.status });
}
