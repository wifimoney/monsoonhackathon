import { NextResponse } from 'next/server';
import type { ChatMessage, TradeProposal } from '@/types/trade';
import { generateSystemPrompt } from '@/lib/ai-trade-prompt';

/**
 * Request body for the chat endpoint
 */
interface ChatRequest {
  messages: ChatMessage[];
  userInput: string;
}

/**
 * Response structure for the chat endpoint
 */
interface ChatResponse {
  content: string;
  tradeProposal?: TradeProposal;
}

/**
 * OpenAI API response types
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Token data from the tokens endpoint
 */
interface TokenData {
  symbol: string;
  name: string;
  dailyVolumeUsd: number;
}

/**
 * Fetches available tokens from the internal tokens endpoint
 */
async function fetchAvailableTokens(): Promise<TokenData[]> {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tokens');
    }

    const data = await response.json();
    const [meta, assetContexts] = data;

    const tokens: TokenData[] = [];
    for (let i = 0; i < meta.universe.length; i++) {
      const assetMeta = meta.universe[i];
      const assetCtx = assetContexts[i];

      if (!assetCtx) continue;

      const dailyVolumeUsd = parseFloat(assetCtx.dayNtlVlm);

      if (dailyVolumeUsd >= 1_000_000) {
        tokens.push({
          symbol: assetMeta.name,
          name: assetMeta.name,
          dailyVolumeUsd,
        });
      }
    }

    return tokens.sort((a, b) => b.dailyVolumeUsd - a.dailyVolumeUsd);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return [];
  }
}

/**
 * Extracts a trade proposal JSON from the AI response content
 */
function extractTradeProposal(content: string): Omit<TradeProposal, 'id' | 'createdAt'> | null {
  // Look for JSON block in markdown code fence
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);

    // Validate basic structure
    if (!parsed.longPositions && !parsed.shortPositions) {
      return null;
    }

    return {
      longPositions: parsed.longPositions || [],
      shortPositions: parsed.shortPositions || [],
      stopLoss: parsed.stopLoss ?? 15,
      takeProfit: parsed.takeProfit ?? 25,
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/ai-trade/chat
 *
 * Accepts message history and user input, returns AI response with optional trade proposal.
 */
export async function POST(request: Request) {
  try {
    // Validate API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: ChatRequest = await request.json();
    const { messages, userInput } = body;

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userInput is required' },
        { status: 400 }
      );
    }

    // Fetch available tokens for context
    const tokens = await fetchAvailableTokens();

    // Generate system prompt with token context
    const systemPrompt = generateSystemPrompt(tokens);

    // Build message history for OpenAI
    const openAIMessages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userInput },
    ];

    // Call OpenRouter API
    const openAIResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://monsoon.app',
        'X-Title': 'Monsoon Trade Ideation',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${openAIResponse.status}`);
    }

    const data: OpenAIResponse = await openAIResponse.json();
    const aiContent = data.choices[0]?.message?.content || '';

    // Extract trade proposal if present
    const proposalData = extractTradeProposal(aiContent);

    // Build response
    const response: ChatResponse = {
      content: aiContent,
    };

    if (proposalData) {
      response.tradeProposal = {
        id: `proposal-${Date.now()}`,
        ...proposalData,
        createdAt: new Date(),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Chat request failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
