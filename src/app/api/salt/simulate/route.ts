import { NextRequest, NextResponse } from 'next/server';
import { simulateExecution } from '@/agent/policy-simulator';
import type { ActionIntent, GuardrailsConfig } from '@/agent/types';

export async function POST(request: NextRequest) {
    try {
        const { actionIntent, guardrailsConfig } = await request.json() as {
            actionIntent: ActionIntent;
            guardrailsConfig: GuardrailsConfig;
        };

        if (!actionIntent) {
            return NextResponse.json({ error: 'actionIntent required' }, { status: 400 });
        }

        const defaultConfig: GuardrailsConfig = {
            allowedMarkets: ['GOLD', 'OIL', 'SILVER'],
            maxPerTx: 250,
            cooldownSeconds: 60,
            maxSlippageBps: 100,
        };

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
