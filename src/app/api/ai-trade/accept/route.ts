import { NextResponse } from 'next/server';
import type { Position } from '@/types/trade';
import { GuardianService } from '@/lib/guardian-service';
import { recordAudit } from '@/audit';

interface AcceptTradeRequest {
  proposalId: string;
  positionSizeUsd: number;
  leverage: number;
  longPositions: Position[];
  shortPositions: Position[];
  accessToken?: string;
}

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

interface PearAsset {
  asset: string;
  weight: number;
}

interface PearPayload {
  longAssets: PearAsset[];
  shortAssets: PearAsset[];
  slippage: number;
  leverage: number;
  usdValue: number;
}

function convertToPearFormat(
  longPositions: Position[],
  shortPositions: Position[],
  usdValue: number,
  leverage: number
): PearPayload {
  const longTotalWeight = longPositions.reduce((sum, p) => sum + p.weight, 0);
  const shortTotalWeight = shortPositions.reduce((sum, p) => sum + p.weight, 0);

  // Normalize weights WITHIN each side to sum to 1.0
  const longAssets = longPositions.map((p) => ({
    asset: p.symbol,
    weight: longTotalWeight > 0 ? p.weight / longTotalWeight : 0,
  }));

  const shortAssets = shortPositions.map((p) => ({
    asset: p.symbol,
    weight: shortTotalWeight > 0 ? p.weight / shortTotalWeight : 0,
  }));

  console.log('[convertToPearFormat] Long side total:', longTotalWeight, '% -> weights:', longAssets);
  console.log('[convertToPearFormat] Short side total:', shortTotalWeight, '% -> weights:', shortAssets);

  return {
    longAssets,
    shortAssets,
    slippage: 0.05,
    leverage,
    usdValue,
  };
}

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
      // Error handling logic
      let errorMessage = `Pear API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch { }

      return { success: false, error: errorMessage };
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

export async function POST(request: Request) {
  console.log('=== ACCEPT TRADE API CALLED ===');
  try {
    const body: AcceptTradeRequest = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    const { proposalId, positionSizeUsd, leverage, longPositions, shortPositions, accessToken } = body;

    if (!proposalId) return NextResponse.json({ success: false, error: 'proposalId is required' }, { status: 400 });
    if (typeof positionSizeUsd !== 'number' || positionSizeUsd <= 0) return NextResponse.json({ success: false, error: 'positionSizeUsd invalid' }, { status: 400 });

    console.log(`Checking Salt Guardians for trade: ${positionSizeUsd} USD`);
    const policyResult = await GuardianService.validateTradeRequest({
      symbol: 'PORTFOLIO_TRADE',
      size: positionSizeUsd,
      side: 'BUY',
      leverage: leverage ?? 1
    });

    if (!policyResult.success) {
      console.error('Salt Policy Violation:', policyResult.reason);

      await recordAudit({
        actionType: "trade",
        actionCategory: "policy",
        status: "denied",
        result: { passed: false, denials: policyResult.denials || [] },
        payload: { amount: positionSizeUsd, leverage: leverage ?? 1, description: 'Salt Policy Violation' },
        source: "agent",
        account: { id: "PEAR_AGENT", name: "AI Agent", address: "0x0000000000000000000000000000000000000000" }
      });

      return NextResponse.json({
        success: false,
        error: `Policy Violation: ${policyResult.reason}`,
        denials: policyResult.denials
      }, { status: 403 }
      );
    }
    console.log('✅ Salt Guardians Passed');

    const leverageValue = leverage ?? 1;
    const pearPayload = convertToPearFormat(longPositions, shortPositions, positionSizeUsd, leverageValue);

    // Build summary message
    const longSummary = longPositions
      .map((p) => `${p.symbol} (${p.weight}%)`)
      .join(', ');
    const shortSummary = shortPositions
      .map((p) => `${p.symbol} (${p.weight}%)`)
      .join(', ');

    if (accessToken) {
      console.log('Executing trade via Pear Protocol...');
      const pearResult = await executePearTrade(pearPayload, accessToken);

      await recordAudit({
        actionType: "trade",
        actionCategory: "execution",
        status: pearResult.success ? "confirmed" : "failed",
        result: { passed: pearResult.success, denials: [] },
        txHash: pearResult.positionId,
        payload: {
          description: `Pear Trade ${pearResult.success ? 'Confirmed' : 'Failed'}`,
          market: 'Multi-Asset'
        },
        source: "agent",
        account: { id: "PEAR_AGENT", name: "AI Agent", address: "0x0000000000000000000000000000000000000000" }
      });

      if (!pearResult.success) {
        return NextResponse.json({ success: false, error: pearResult.error }, { status: 500 });
      }

      const message = `Trade executed successfully via Pear Protocol with $${positionSizeUsd.toLocaleString()} position size at ${leverageValue}x leverage.

**LONG:** ${longSummary || 'None'}
**SHORT:** ${shortSummary || 'None'}

Position ID: ${pearResult.positionId}`;

      return NextResponse.json({
        success: true,
        message,
        positionId: pearResult.positionId,
        executedViaPear: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Trade ready for execution (Simulation mode).`,
      executedViaPear: false,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Accept trade request failed';
    console.error('=== ACCEPT TRADE ERROR ===', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
