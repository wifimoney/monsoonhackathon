/**
 * API Route: /api/pear/positions/[positionId]/close
 * Task 2.7: Handle closing specific positions
 *
 * POST - Close a position by ID
 */
import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

interface RouteParams {
  positionId: string;
}

/**
 * Extract authorization header from request
 */
function getAuthHeader(request: Request): string | null {
  return request.headers.get('Authorization');
}

/**
 * POST /api/pear/positions/[positionId]/close
 * Close a specific position
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const authHeader = getAuthHeader(request);
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const { positionId } = await params;

    if (!positionId) {
      return NextResponse.json(
        { error: 'positionId is required' },
        { status: 400 }
      );
    }

    // Proxy the close request to Pear Protocol
    const pearResponse = await fetch(
      `${PEAR_API_BASE_URL}/positions/${positionId}/close`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      }
    );

    // Handle error responses
    if (!pearResponse.ok) {
      const errorData = await pearResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errorData.error ||
            errorData.message ||
            `Failed to close position ${positionId}`,
        },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Close position failed';
    console.error('Pear position close error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
