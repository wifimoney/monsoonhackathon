import { NextRequest, NextResponse } from 'next/server';
import { MonsoonAgent } from '@/agent/monsoon-agent';

// Initialize agent singleton
// In production: Would load config from database per user
const agent = new MonsoonAgent({
    accountId: process.env.SALT_ACCOUNT_ID || '696a40b5b0f979ec8ece4482',
    guardrails: {
        allowedMarkets: ['GOLD', 'OIL', 'SILVER', 'BTC', 'ETH'],
        maxPerTx: 250,
        cooldownSeconds: 60,
    },
});

export async function POST(request: NextRequest) {
    try {
        const { input } = await request.json();

        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: 'invalid_input', message: 'Input must be a non-empty string' },
                { status: 400 }
            );
        }

        // Parse natural language to intent
        const intent = agent.parseIntent(input);

        if (!intent) {
            return NextResponse.json({
                error: 'parse_failed',
                message: 'Could not understand that command',
                suggestions: [
                    'buy $100 of GOLD',
                    'sell $50 OIL',
                    'send 10 USDC to 0x...',
                ],
            });
        }

        // Execute via Salt
        const result = await agent.execute(intent);

        return NextResponse.json({
            intent,
            result,
        });
    } catch (error: any) {
        console.error('Agent execution error:', error);
        return NextResponse.json(
            {
                error: 'execution_failed',
                message: error.message || 'Execution failed'
            },
            { status: 500 }
        );
    }
}
