import { NextRequest, NextResponse } from 'next/server';
import { checkAllGuardians } from '@/guardians/risk-engine';
import type { ActionIntent } from '@/agent/types';

export async function POST(request: NextRequest) {
    try {
        const { actionIntent } = await request.json() as { actionIntent: ActionIntent };

        if (!actionIntent) {
            return NextResponse.json({ error: 'actionIntent required' }, { status: 400 });
        }

        const result = checkAllGuardians(actionIntent);

        return NextResponse.json({
            passed: result.passed,
            denials: result.denials,
            warnings: result.warnings,
        });
    } catch (error: any) {
        console.error('Guardians check error:', error);
        return NextResponse.json({
            error: error.message || 'Check failed',
        }, { status: 500 });
    }
}
