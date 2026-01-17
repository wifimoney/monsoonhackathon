import { NextRequest, NextResponse } from 'next/server';
import { executeStrategyAction } from '@/lib/strategy-execution';

export async function POST(request: NextRequest) {
    const { market, side, size } = await request.json();

    if (!market || !side || !size) {
        return NextResponse.json(
            { success: false, error: 'market, side, size are required' },
            { status: 400 }
        );
    }

    const result = await executeStrategyAction({
        actionType: 'pear_close',
        market,
        side,
        notionalUsd: Number(size),
    });

    return NextResponse.json(result.body, { status: result.status });
}
