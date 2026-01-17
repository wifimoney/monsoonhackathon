import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { targets } = await request.json();

    if (!targets || typeof targets !== 'object') {
        return NextResponse.json(
            { success: false, error: 'targets object is required' },
            { status: 400 }
        );
    }

    const markets = Object.keys(targets);
    if (markets.length === 0) {
        return NextResponse.json(
            { success: false, error: 'targets must include at least one market' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'vault_set_targets',
        market: markets[0],
        side: 'BUY',
        notionalUsd: 0,
        metadata: { targets },
    });

    return NextResponse.json(result.body, { status: result.status });
}
