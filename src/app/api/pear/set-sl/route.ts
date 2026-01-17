import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { market, stopLoss } = await request.json();

    if (!market || stopLoss === undefined) {
        return NextResponse.json(
            { success: false, error: 'market and stopLoss are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'pear_set_sl',
        market,
        side: 'SELL',
        notionalUsd: 0,
        metadata: { stopLoss: Number(stopLoss) },
    });

    return NextResponse.json(result.body, { status: result.status });
}
