/**
 * API Route: /api/pear/trade-history
 * Task 2.9: Proxy trade history request
 *
 * GET - Get recent trades with pair, side, size, price, timestamp, P&L
 */
import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

/**
 * Extract authorization header from request
 */
function getAuthHeader(request: Request): string | null {
  return request.headers.get('Authorization');
}

/**
 * GET /api/pear/trade-history
 * Get trade history
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
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/trade-history`, {
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
        { error: errorData.error || errorData.message || 'Failed to get trade history' },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Get trade history failed';
    console.error('Pear trade-history GET error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
