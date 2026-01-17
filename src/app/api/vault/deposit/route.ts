import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { market, amount, leverage } = await request.json();

    if (!market || !amount) {
        return NextResponse.json(
            { success: false, error: 'market and amount are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'vault_deposit',
        market,
        side: 'BUY',
        notionalUsd: Number(amount),
        leverage: leverage ? Number(leverage) : undefined,
    });

    return NextResponse.json(result.body, { status: result.status });
}
