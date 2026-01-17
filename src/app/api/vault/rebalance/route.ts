import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { fromMarket, toMarket, notionalUsd } = await request.json();

    if (!fromMarket || !toMarket || !notionalUsd) {
        return NextResponse.json(
            { success: false, error: 'fromMarket, toMarket, notionalUsd are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'vault_rebalance',
        market: toMarket,
        side: 'BUY',
        notionalUsd: Number(notionalUsd),
        metadata: { fromMarket },
    });

    return NextResponse.json(result.body, { status: result.status });
}
