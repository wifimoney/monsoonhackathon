import { NextResponse } from 'next/server';
import type {
  ModificationRequest,
  TradeProposal,
  Position,
  RecommendedToken,
} from '@/types/trade';
import { generateModificationPrompt } from '@/lib/ai-trade-prompt';

/**
 * Response structure for the modify endpoint
 */
interface ModifyResponse {
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
 * Token data from Hyperliquid
 */
interface TokenData {
  symbol: string;
  name: string;
  dailyVolumeUsd: number;
}

/**
 * Fetches available tokens from Hyperliquid API
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
 * Validates that the total weight of positions does not exceed 100%
 */
function validatePositionWeights(
  positions: Position[],
  side: 'LONG' | 'SHORT'
): { valid: boolean; total: number; error?: string } {
  const total = positions.reduce((sum, p) => sum + p.weight, 0);

  if (total > 100) {
    return {
      valid: false,
      total,
      error: `${side} side total weight (${total}%) exceeds 100%`,
    };
  }

  return { valid: true, total };
}

/**
 * Extracts a trade proposal JSON from the AI response content.
 * Includes support for recommendedTokens array.
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
  } catch {
    return null;
  }
}

/**
 * POST /api/ai-trade/modify
 *
 * Accepts a modification request and returns AI response with updated trade proposal.
 * Validates that neither side exceeds 100% total weight.
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
    const body: ModificationRequest = await request.json();
    const { originalProposalId, longPositions, shortPositions } = body;

    // Validate required fields
    if (!originalProposalId) {
      return NextResponse.json(
        { success: false, error: 'originalProposalId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(longPositions) || !Array.isArray(shortPositions)) {
      return NextResponse.json(
        { success: false, error: 'longPositions and shortPositions must be arrays' },
        { status: 400 }
      );
    }

    // Validate LONG side weights
    const longValidation = validatePositionWeights(longPositions, 'LONG');
    if (!longValidation.valid) {
      return NextResponse.json(
        { success: false, error: longValidation.error },
        { status: 400 }
      );
    }

    // Validate SHORT side weights
    const shortValidation = validatePositionWeights(shortPositions, 'SHORT');
    if (!shortValidation.valid) {
      return NextResponse.json(
        { success: false, error: shortValidation.error },
        { status: 400 }
      );
    }

    // Fetch available tokens for context
    const tokens = await fetchAvailableTokens();

    // Generate modification prompt
    const systemPrompt = generateModificationPrompt(tokens, longPositions, shortPositions);

    // Build message for OpenAI
    const openAIMessages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `The user has modified their trade proposal. Please analyze these modifications and provide updated reasoning. The modified positions are:

LONG positions (${longValidation.total}% total):
${longPositions.map(p => `- ${p.symbol} (${p.name}): ${p.weight}%`).join('\n')}

SHORT positions (${shortValidation.total}% total):
${shortPositions.map(p => `- ${p.symbol} (${p.name}): ${p.weight}%`).join('\n')}

Please provide your analysis of these modifications and suggest up to 3 additional tokens that might complement this trade.`,
      },
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
          Authorization: `Bearer ${apiKey}`,
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
    const response: ModifyResponse = {
      content: aiContent,
    };

    if (proposalData) {
      response.tradeProposal = {
        id: `proposal-${Date.now()}`,
        ...proposalData,
        createdAt: new Date(),
      };
    } else {
      // If AI didn't generate a new proposal, use the modified positions
      response.tradeProposal = {
        id: `proposal-${Date.now()}`,
        longPositions,
        shortPositions,
        stopLoss: 0,
        takeProfit: 0,
        createdAt: new Date(),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Modification request failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
