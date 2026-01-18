import { NextResponse } from 'next/server';
import type { ChatMessage, TradeProposal, RecommendedToken } from '@/types/trade';
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
// Tokens to exclude from AI suggestions
const EXCLUDED_TOKENS = new Set(['MATIC']);

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

      // Skip excluded tokens
      if (EXCLUDED_TOKENS.has(assetMeta.name)) continue;

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
 * Extracts a trade proposal JSON from the AI response content.
 * Now includes support for recommendedTokens array.
 * Includes fallback parsing for different JSON formats.
 */
function extractTradeProposal(content: string): Omit<TradeProposal, 'id' | 'createdAt'> | null {
  // Try markdown code fence first (preferred format)
  let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

  // Fallback: plain triple backticks without 'json' specifier
  if (!jsonMatch) {
    jsonMatch = content.match(/```\s*({\s*[\s\S]*?})\s*```/);
  }

  // Fallback: raw JSON object with longPositions or shortPositions
  if (!jsonMatch) {
    const rawMatch = content.match(/\{\s*"(?:longPositions|shortPositions)"[\s\S]*?\}(?=\s*\n\n|\s*$)/);
    if (rawMatch) {
      jsonMatch = [rawMatch[0], rawMatch[0]];
    }
  }

  if (!jsonMatch) {
    console.log('[extractTradeProposal] No JSON found in AI response');
    return null;
  }

  try {
    // Sanitize JSON: fix common AI formatting errors
    let jsonStr = jsonMatch[1];

    // Convert M/K suffixes to actual numbers (e.g., "2.09M" -> "2090000", "500K" -> "500000")
    jsonStr = jsonStr.replace(/:\s*"?(\d+(?:\.\d+)?)\s*M"?(?=\s*[,}\]])/gi, (match, num) => {
      const value = Math.round(parseFloat(num) * 1_000_000);
      return `: ${value}`;
    });
    jsonStr = jsonStr.replace(/:\s*"?(\d+(?:\.\d+)?)\s*K"?(?=\s*[,}\]])/gi, (match, num) => {
      const value = Math.round(parseFloat(num) * 1_000);
      return `: ${value}`;
    });

    // Remove commas from numbers (e.g., "5,000,000" -> "5000000")
    jsonStr = jsonStr.replace(/:\s*"?(\d{1,3}(?:,\d{3})+)"?(?=\s*[,}\]])/g, (match, num) => {
      const cleanNum = num.replace(/,/g, '');
      return `: ${cleanNum}`;
    });

    // Also handle numbers with commas in property values without quotes
    jsonStr = jsonStr.replace(/(\d),(\d{3})/g, '$1$2');

    console.log('[extractTradeProposal] Sanitized JSON:', jsonStr.substring(0, 200));

    const parsed = JSON.parse(jsonStr);

    // Validate basic structure
    if (!parsed.longPositions && !parsed.shortPositions) {
      return null;
    }

    // Extract and validate recommendedTokens if present
    let recommendedTokens: RecommendedToken[] | undefined;
    if (parsed.recommendedTokens && Array.isArray(parsed.recommendedTokens)) {
      recommendedTokens = parsed.recommendedTokens
        .filter(
          (t: unknown): t is RecommendedToken =>
            typeof t === 'object' &&
            t !== null &&
            typeof (t as RecommendedToken).symbol === 'string' &&
            typeof (t as RecommendedToken).name === 'string' &&
            typeof (t as RecommendedToken).relevance === 'string'
        )
        .slice(0, 3); // Limit to 3 recommended tokens
    }

    return {
      longPositions: parsed.longPositions || [],
      shortPositions: parsed.shortPositions || [],
      stopLoss: 0,
      takeProfit: 0,
      recommendedTokens,
    };
  } catch (e) {
    console.error('[extractTradeProposal] JSON parse error:', e);
    return null;
  }
}

/**
 * POST /api/ai-trade/chat
 *
 * Accepts message history and user input, returns AI response with optional trade proposal.
 * Trade proposals now include up to 3 recommended tokens for modification suggestions.
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

    // Validate messages array
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'messages must be an array' },
        { status: 400 }
      );
    }

    // Validate each message has required fields
    for (const msg of messages) {
      if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Each message must have role and content strings' },
          { status: 400 }
        );
      }
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return NextResponse.json(
          { success: false, error: 'Message role must be "user" or "assistant"' },
          { status: 400 }
        );
      }
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

    // Call OpenRouter API with 30 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let openAIResponse: Response;
    try {
      openAIResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${openAIResponse.status}`);
    }

    const data: OpenAIResponse = await openAIResponse.json();
    let aiContent = data.choices[0]?.message?.content || '';

    // Extract trade proposal if present (now includes recommendedTokens)
    const proposalData = extractTradeProposal(aiContent);

    // Remove JSON block from displayed content
    aiContent = aiContent.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();

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
