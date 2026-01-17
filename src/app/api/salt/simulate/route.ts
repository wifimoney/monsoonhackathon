import { NextRequest, NextResponse } from 'next/server';
import { simulateExecution } from '@/agent/policy-simulator';
import type { ActionIntent } from '@/agent/types';
import type { GuardiansConfig } from '@/guardians/types';
import { GUARDIAN_PRESETS } from '@/guardians/types';

export async function POST(request: NextRequest) {
    try {
        const { actionIntent, guardrailsConfig } = await request.json() as {
            actionIntent: ActionIntent;
            guardrailsConfig: GuardiansConfig;
        };

        if (!actionIntent) {
            return NextResponse.json({ error: 'actionIntent required' }, { status: 400 });
        }

        const defaultConfig = GUARDIAN_PRESETS.default;

        const result = await simulateExecution(
            actionIntent,
            guardrailsConfig || defaultConfig
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Simulation error:', error);
        return NextResponse.json({
            error: error.message || 'Simulation failed',
        }, { status: 500 });
    }
}
