/**
 * API Route: /api/pear/positions
 * Task 2.6: Handle position operations
 *
 * POST - Create new position (trade execution)
 * GET - List open positions
 */
import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

interface CreatePositionRequest {
  longAssets: string[];
  shortAssets: string[];
  weights: number[];
}

/**
 * Extract authorization header from request
 */
function getAuthHeader(request: Request): string | null {
  return request.headers.get('Authorization');
}

/**
 * Validate the position creation payload
 */
function validatePositionPayload(
  body: Partial<CreatePositionRequest>
): { valid: true } | { valid: false; error: string } {
  if (!body.longAssets || !Array.isArray(body.longAssets)) {
    return { valid: false, error: 'longAssets must be an array' };
  }
  if (!body.shortAssets || !Array.isArray(body.shortAssets)) {
    return { valid: false, error: 'shortAssets must be an array' };
  }
  if (!body.weights || !Array.isArray(body.weights)) {
    return { valid: false, error: 'weights must be an array' };
  }

  // Ensure at least one asset is specified
  if (body.longAssets.length === 0 && body.shortAssets.length === 0) {
    return { valid: false, error: 'At least one long or short asset is required' };
  }

  // Ensure weights count matches total assets count
  const totalAssets = body.longAssets.length + body.shortAssets.length;
  if (body.weights.length !== totalAssets) {
    return {
      valid: false,
      error: `weights array length (${body.weights.length}) must match total assets count (${totalAssets})`,
    };
  }

  return { valid: true };
}

/**
 * GET /api/pear/positions
 * List open positions
 */
export async function GET(request: Request) {
  try {
    const authHeader = getAuthHeader(request);
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Proxy the request to Pear Protocol
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/positions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    // Handle error responses
    if (!pearResponse.ok) {
      const errorData = await pearResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || 'Failed to get positions' },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Get positions failed';
    console.error('Pear positions GET error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pear/positions
 * Create new position (trade execution)
 *
 * Body: { longAssets, shortAssets, weights }
 * Automatically sets executionType: "MARKET"
 */
export async function POST(request: Request) {
  try {
    const authHeader = getAuthHeader(request);
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const body: Partial<CreatePositionRequest> = await request.json();

    // Validate payload
    const validation = validatePositionPayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Build the request payload with MARKET execution type
    const pearPayload = {
      longAssets: body.longAssets,
      shortAssets: body.shortAssets,
      weights: body.weights,
      executionType: 'MARKET',
    };

    // Proxy the request to Pear Protocol
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(pearPayload),
    });

    // Handle error responses
    if (!pearResponse.ok) {
      const errorData = await pearResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || 'Failed to create position' },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Create position failed';
    console.error('Pear positions POST error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
