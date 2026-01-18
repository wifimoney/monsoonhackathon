import { NextResponse } from 'next/server';
import type { Position } from '@/types/trade';

/**
 * Request body for accepting a trade
 */
interface AcceptTradeRequest {
  proposalId: string;
  positionSizeUsd: number;
  leverage: number; // Leverage multiplier (1-100)
  longPositions: Position[];
  shortPositions: Position[];
  accessToken?: string; // Optional: JWT token for Pear Protocol authentication
}

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

/**
 * Pear API asset format - each asset must be an object with asset and weight
 */
interface PearAsset {
  asset: string;
  weight: number;
}

/**
 * Pear API payload format
 */
interface PearPayload {
  longAssets: PearAsset[];
  shortAssets: PearAsset[];
  slippage: number;
  leverage: number;
  usdValue: number;
}

/**
 * Convert trade proposal positions to Pear Protocol format
 *
 * Task 2.10: Convert trade proposal positions to Pear format
 * Format: { longAssets: [{asset, weight}], shortAssets: [{asset, weight}], slippage, leverage, usdValue, executionType }
 * Do NOT pass stopLoss/takeProfit to Pear API
 *
 * Each asset is an object with asset name and normalized weight
 * All weights should sum to 1.0 across both sides
 */
function convertToPearFormat(
  longPositions: Position[],
  shortPositions: Position[],
  usdValue: number,
  leverage: number
): PearPayload {
  // Calculate total weight across BOTH sides
  const longTotalWeight = longPositions.reduce((sum, p) => sum + p.weight, 0);
  const shortTotalWeight = shortPositions.reduce((sum, p) => sum + p.weight, 0);
  const combinedTotalWeight = longTotalWeight + shortTotalWeight;

  // Normalize so that ALL weights (long + short) sum to 1.0
  const longAssets = longPositions.map((p) => ({
    asset: p.symbol,
    weight: combinedTotalWeight > 0 ? p.weight / combinedTotalWeight : 0,
  }));

  const shortAssets = shortPositions.map((p) => ({
    asset: p.symbol,
    weight: combinedTotalWeight > 0 ? p.weight / combinedTotalWeight : 0,
  }));

  return {
    longAssets,
    shortAssets,
    slippage: 0.05, // 5% - within required range (0.001-0.1)
    leverage,
    usdValue,
  };
}

/**
 * Execute trade via Pear Protocol API
 */
async function executePearTrade(
  pearPayload: PearPayload,
  accessToken: string
): Promise<{ success: boolean; positionId?: string; error?: string; fills?: unknown[]; filledAssets?: string[] }> {
  try {
    const requestBody = {
      longAssets: pearPayload.longAssets,
      shortAssets: pearPayload.shortAssets,
      slippage: pearPayload.slippage,
      leverage: pearPayload.leverage,
      usdValue: pearPayload.usdValue,
      executionType: 'MARKET',
    };

    console.log('Calling Pear API POST /positions with:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${PEAR_API_BASE_URL}/positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Pear API response status:', response.status);
    console.log('Pear API response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      // Provide more helpful error messages based on status code
      let errorMessage = errorData.error || errorData.message || `Pear API error: ${response.status}`;

      if (response.status === 500) {
        // Common causes of 500 errors from Pear
        errorMessage = `Trade execution failed. Possible causes: (1) Agent wallet not approved on Hyperliquid - re-authenticate with Pear Protocol, (2) Builder fee not approved, (3) Insufficient USDC balance on Hyperliquid. Original error: ${errorMessage}`;
      } else if (response.status === 401) {
        errorMessage = 'Authentication expired. Please re-authenticate with Pear Protocol.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Agent wallet or builder fee not properly approved on Hyperliquid.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = JSON.parse(responseText);

    // Check if all legs were executed
    const fills = data.fills || [];
    const filledAssets = new Set(fills.map((f: { coin: string }) => f.coin));

    return {
      success: true,
      positionId: data.positionId || data.orderId,
      fills: fills,
      filledAssets: Array.from(filledAssets) as string[],
    };
  } catch (error) {
    console.error('executePearTrade error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pear trade execution failed',
    };
  }
}

/**
 * POST /api/ai-trade/accept
 *
 * Task 2.10: Integrates Pear Protocol trade execution (replaces console.log simulation)
 *
 * Accepts a trade proposal with a position size and executes via Pear Protocol.
 * Keeps existing validation logic for proposalId, positionSizeUsd, positions arrays.
 * Does NOT pass stopLoss/takeProfit to Pear API.
 */
export async function POST(request: Request) {
  console.log('=== ACCEPT TRADE API CALLED ===');
  try {
    // Parse request body
    const body: AcceptTradeRequest = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    const { proposalId, positionSizeUsd, leverage, longPositions, shortPositions, accessToken } = body;
    console.log('Access token present:', !!accessToken);
    console.log('Leverage:', leverage);

    // Validate required fields (keep existing validation logic)
    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'proposalId is required' },
        { status: 400 }
      );
    }

    if (typeof positionSizeUsd !== 'number' || positionSizeUsd <= 0) {
      return NextResponse.json(
        { success: false, error: 'positionSizeUsd must be a positive number' },
        { status: 400 }
      );
    }

    // Validate leverage (1-100 integer)
    const leverageValue = leverage ?? 1; // Default to 1 if not provided
    if (typeof leverageValue !== 'number' || leverageValue < 1 || leverageValue > 100 || !Number.isInteger(leverageValue)) {
      return NextResponse.json(
        { success: false, error: 'leverage must be an integer between 1 and 100' },
        { status: 400 }
      );
    }

    if (!Array.isArray(longPositions) || !Array.isArray(shortPositions)) {
      return NextResponse.json(
        { success: false, error: 'longPositions and shortPositions must be arrays' },
        { status: 400 }
      );
    }

    // Validate that we have at least one position
    if (longPositions.length === 0 && shortPositions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one long or short position is required' },
        { status: 400 }
      );
    }

    // Convert trade proposal to Pear format
    const pearPayload = convertToPearFormat(longPositions, shortPositions, positionSizeUsd, leverageValue);

    // Log the trade details
    console.log('=== TRADE ACCEPTED ===');
    console.log('Proposal ID:', proposalId);
    console.log('Position Size (USD):', positionSizeUsd);
    console.log('LONG positions:');
    longPositions.forEach((pos) => {
      const allocation = (pos.weight / 100) * positionSizeUsd;
      console.log(`  - ${pos.symbol}: ${pos.weight}% ($${allocation.toFixed(2)})`);
    });
    console.log('SHORT positions:');
    shortPositions.forEach((pos) => {
      const allocation = (pos.weight / 100) * positionSizeUsd;
      console.log(`  - ${pos.symbol}: ${pos.weight}% ($${allocation.toFixed(2)})`);
    });
    console.log('Pear Payload:', JSON.stringify(pearPayload, null, 2));
    console.log('======================');

    // Build summary message
    const longSummary = longPositions
      .map((p) => `${p.symbol} (${p.weight}%)`)
      .join(', ');
    const shortSummary = shortPositions
      .map((p) => `${p.symbol} (${p.weight}%)`)
      .join(', ');

    // If access token is provided, execute via Pear Protocol
    if (accessToken) {
      console.log('Executing trade via Pear Protocol with payload:', JSON.stringify({
        longAssets: pearPayload.longAssets,
        shortAssets: pearPayload.shortAssets,
        slippage: pearPayload.slippage,
        leverage: pearPayload.leverage,
        usdValue: pearPayload.usdValue,
        executionType: 'MARKET',
      }, null, 2));

      const pearResult = await executePearTrade(pearPayload, accessToken);
      console.log('Pear API result:', JSON.stringify(pearResult, null, 2));

      if (!pearResult.success) {
        console.error('Pear trade execution failed:', pearResult.error);
        return NextResponse.json(
          {
            success: false,
            error: pearResult.error || 'Trade execution failed',
            proposalId,
            positionSizeUsd,
          },
          { status: 500 }
        );
      }

      const message = `Trade executed successfully via Pear Protocol with $${positionSizeUsd.toLocaleString()} position size.

**LONG:** ${longSummary || 'None'}
**SHORT:** ${shortSummary || 'None'}

Position ID: ${pearResult.positionId}`;

      return NextResponse.json({
        success: true,
        message,
        proposalId,
        positionSizeUsd,
        positionId: pearResult.positionId,
        executedViaPear: true,
      });
    }

    // No access token - return simulation response (for backward compatibility)
    const message = `Trade proposal ready for execution with $${positionSizeUsd.toLocaleString()} position size.

**LONG:** ${longSummary || 'None'}
**SHORT:** ${shortSummary || 'None'}

*Note: Authenticate with Pear Protocol to execute this trade.*`;

    return NextResponse.json({
      success: true,
      message,
      proposalId,
      positionSizeUsd,
      pearPayload,
      executedViaPear: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Accept trade request failed';
    console.error('=== ACCEPT TRADE ERROR ===');
    console.error('Error message:', errorMessage);
    console.error('Full error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
