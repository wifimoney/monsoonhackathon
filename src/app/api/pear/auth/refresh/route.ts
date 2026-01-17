/**
 * API Route: /api/pear/auth/refresh
 * Task 2.4: Proxy token refresh requests to Pear Protocol
 *
 * Accepts refresh token and returns new access token
 */
import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export async function POST(request: Request) {
  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken } = body;

    // Validate required fields
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'refreshToken is required' },
        { status: 400 }
      );
    }

    // Proxy the refresh request to Pear Protocol
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    // Handle error responses
    if (!pearResponse.ok) {
      const errorData = await pearResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || 'Token refresh failed' },
        { status: pearResponse.status }
      );
    }

    // Return the new tokens
    const data: RefreshResponse = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh request failed';
    console.error('Pear auth refresh error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
