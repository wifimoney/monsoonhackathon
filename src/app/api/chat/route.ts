import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/agent/intent-classifier';
import { matchMarkets } from '@/agent/token-matcher';
import { buildActionIntent } from '@/agent/action-builder';
import { generateResponse } from '@/agent/response-generator';
import { checkGuardrails } from '@/agent/guardrails';
import type { GuardrailsConfig } from '@/agent/types';

export async function POST(request: NextRequest) {
    try {
        const { message, guardrailsConfig } = await request.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // 1. Classify intent via LLM
        console.log('[Chat] Classifying intent for:', message);
        const intent = await classifyIntent(message);
        console.log('[Chat] Intent:', intent);

        // 2. Match markets (deterministic)
        const matches = await matchMarkets(intent);
        console.log('[Chat] Matches:', matches.map(m => `${m.symbol} (${m.score.toFixed(2)})`));

        // 3. Build action intent from top match
        let actionIntent = null;
        let guardrailsCheck = null;

        if (matches.length > 0 && intent.confidence >= 0.5) {
            actionIntent = buildActionIntent(intent, matches[0]);

            // Use provided guardrails or defaults
            const config: GuardrailsConfig = guardrailsConfig || {
                allowedMarkets: ['GOLD', 'OIL', 'SILVER'],
                maxPerTx: 250,
                cooldownSeconds: 60,
                maxSlippageBps: 100,
            };

            guardrailsCheck = checkGuardrails(actionIntent, config);
        }

        // 4. Generate natural language response
        const response = await generateResponse(message, intent, matches, actionIntent);

        return NextResponse.json({
            response,
            intent,
            matches: matches.slice(0, 3), // Top 3 for UI
            actionIntent,
            guardrailsCheck,
        });
    } catch (error: any) {
        console.error('Chat error:', error);
        return NextResponse.json({
            error: 'Failed to process message',
            response: "Sorry, I couldn't process that. Try something like: \"Buy $100 of GOLD\"",
        }, { status: 500 });
    }
}
