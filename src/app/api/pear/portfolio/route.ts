/**
 * API Route: /api/pear/portfolio
 * Task 2.8: Proxy portfolio metrics request
 *
 * GET - Get portfolio metrics (total account value, unrealized/realized P&L, margin usage)
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
 * GET /api/pear/portfolio
 * Get portfolio metrics
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
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/portfolio`, {
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
        { error: errorData.error || errorData.message || 'Failed to get portfolio' },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Get portfolio failed';
    console.error('Pear portfolio GET error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
