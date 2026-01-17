import { openrouter, DEFAULT_MODEL } from '@/openrouter/client';

// ============ TYPES ============
export interface ParsedIntent {
    assetClass: 'commodities' | 'crypto' | 'indices' | 'forex' | 'all';
    preference: 'low_risk' | 'high_yield' | 'balanced' | 'hedge';
    strategy: 'directional_long' | 'directional_short' | 'neutral' | 'hedge';
    constraints: {
        maxSize?: number;
        markets?: string[];
        excludeMarkets?: string[];
    };
    timeHorizon: 'scalp' | 'short' | 'medium' | 'long';
    confidence: number;
    rawQuery: string;
}

// ============ SYSTEM PROMPT ============
const CLASSIFIER_PROMPT = `You are a trading intent classifier for Monsoon, a commodities/RWA trading platform on Hyperliquid.

Available markets: GOLD, OIL, SILVER, BTC, ETH

Given a user message, extract their trading intent as structured JSON.

Rules:
- If user mentions "gold", "inflation hedge", "safe haven" → assetClass: "commodities", preference: "low_risk"
- If user mentions "oil", "energy" → assetClass: "commodities"  
- If user mentions specific amount like "$200" or "200 dollars" → constraints.maxSize: 200
- If user says "buy" or "long" → strategy: "directional_long"
- If user says "sell" or "short" → strategy: "directional_short"
- If user says "hedge" or "neutral" → strategy: "hedge" or "neutral"
- If user mentions specific markets → constraints.markets: [those markets]
- confidence: 0-1 score of how clear the intent is

Respond ONLY with valid JSON, no markdown, no explanation.

Example input: "I want safe exposure to gold, around $200"
Example output:
{
  "assetClass": "commodities",
  "preference": "low_risk",
  "strategy": "directional_long",
  "constraints": { "maxSize": 200, "markets": ["GOLD"] },
  "timeHorizon": "medium",
  "confidence": 0.9
}`;

// ============ CLASSIFIER FUNCTION ============
export async function classifyIntent(userMessage: string): Promise<ParsedIntent> {
    try {
        const response = await openrouter.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [
                { role: 'system', content: CLASSIFIER_PROMPT },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || '{}';

        // Clean up potential markdown formatting
        const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
            assetClass: parsed.assetClass || 'all',
            preference: parsed.preference || 'balanced',
            strategy: parsed.strategy || 'directional_long',
            constraints: parsed.constraints || {},
            timeHorizon: parsed.timeHorizon || 'short',
            confidence: parsed.confidence || 0.5,
            rawQuery: userMessage,
        };
    } catch (error) {
        console.error('Intent classification failed:', error);

        // Fallback: return low-confidence default
        return {
            assetClass: 'all',
            preference: 'balanced',
            strategy: 'directional_long',
            constraints: {},
            timeHorizon: 'short',
            confidence: 0.3,
            rawQuery: userMessage,
        };
    }
}
