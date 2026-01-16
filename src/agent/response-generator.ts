import { openrouter, DEFAULT_MODEL } from '@/openrouter/client';
import type { ParsedIntent } from './intent-classifier';
import type { MarketMatch, ActionIntent } from './types';

const RESPONSE_PROMPT = `You are a helpful trading assistant for Monsoon DEX. 
You help users trade commodities and RWAs on Hyperliquid with policy-controlled execution.

Given the user's intent and matched markets, provide a brief, helpful response.
- Be concise (2-3 sentences max)
- Mention the top recommendation
- Note any risk factors briefly
- Don't be overly cautious or add unnecessary disclaimers

Format: Just the response text, no JSON or markdown.`;

export async function generateResponse(
    userMessage: string,
    intent: ParsedIntent,
    matches: MarketMatch[],
    actionIntent: ActionIntent | null
): Promise<string> {
    if (matches.length === 0) {
        return "I couldn't find any markets matching your criteria. Try being more specific or broadening your search.";
    }

    if (intent.confidence < 0.5) {
        return `I'm not quite sure what you're looking for. Could you clarify? For example: "Buy $200 of GOLD" or "I want exposure to oil with low risk"`;
    }

    try {
        const context = `
User said: "${userMessage}"
Intent: ${intent.assetClass}, ${intent.preference}, ${intent.strategy}
Top matches: ${matches.slice(0, 3).map(m => `${m.symbol} (score: ${m.score.toFixed(2)})`).join(', ')}
Recommended action: ${actionIntent ? `${actionIntent.side} ${actionIntent.market} $${actionIntent.notionalUsd}` : 'None'}
    `;

        const response = await openrouter.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [
                { role: 'system', content: RESPONSE_PROMPT },
                { role: 'user', content: context },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        return response.choices[0]?.message?.content || 'Here are your options:';
    } catch (error) {
        // Fallback to template response
        const top = matches[0];
        return `Based on your request, I recommend ${top.symbol}. It has good liquidity and fits your ${intent.preference} preference. Ready to execute when you approve.`;
    }
}
