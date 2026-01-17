import { NextRequest, NextResponse } from 'next/server';
import {
    getGuardiansState,
    getCooldownRemaining,
    getTradesRemaining,
    getDailySpendRemaining,
    resetState,
} from '@/guardians/state';

export async function GET() {
    try {
        const state = getGuardiansState();

        return NextResponse.json({
            ...state,
            cooldownRemaining: getCooldownRemaining(),
            tradesRemaining: getTradesRemaining(),
            dailySpendRemaining: getDailySpendRemaining(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.reset) {
            resetState();
            return NextResponse.json({ success: true, message: 'State reset' });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
