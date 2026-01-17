import { NextResponse } from 'next/server';
import type { Position } from '@/types/trade';

/**
 * Request body for accepting a trade
 */
interface AcceptTradeRequest {
  proposalId: string;
  positionSizeUsd: number;
  longPositions: Position[];
  shortPositions: Position[];
}

/**
 * POST /api/ai-trade/accept
 *
 * Accepts a trade proposal with a position size.
 * For now, logs the trade and returns success.
 * Actual Salt execution can be added later.
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body: AcceptTradeRequest = await request.json();
    const { proposalId, positionSizeUsd, longPositions, shortPositions } = body;

    // Validate required fields
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

    if (!Array.isArray(longPositions) || !Array.isArray(shortPositions)) {
      return NextResponse.json(
        { success: false, error: 'longPositions and shortPositions must be arrays' },
        { status: 400 }
      );
    }

    // Log the trade (actual execution can be added later)
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
    console.log('======================');

    // Build summary message
    const longSummary = longPositions
      .map((p) => `${p.symbol} (${p.weight}%)`)
      .join(', ');
    const shortSummary = shortPositions
      .map((p) => `${p.symbol} (${p.weight}%)`)
      .join(', ');

    const message = `Trade placed successfully with $${positionSizeUsd.toLocaleString()} position size.

**LONG:** ${longSummary || 'None'}
**SHORT:** ${shortSummary || 'None'}

*Note: This is a simulation. Actual execution via Salt SDK can be enabled later.*`;

    return NextResponse.json({
      success: true,
      message,
      proposalId,
      positionSizeUsd,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Accept trade request failed';
    console.error('Accept trade error:', error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
