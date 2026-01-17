/**
 * API Route: /api/pear/auth/login
 * Task 2.3: Proxy EIP-712 login to Pear Protocol
 *
 * Accepts signed EIP-712 message and returns JWT tokens
 */
import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

interface LoginRequest {
  signature: string;
  address: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json();
    const { signature, address } = body;

    // Validate required fields
    if (!signature || !address) {
      return NextResponse.json(
        { error: 'signature and address are required' },
        { status: 400 }
      );
    }

    // Proxy the login request to Pear Protocol
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signature, address }),
    });

    // Handle error responses
    if (!pearResponse.ok) {
      const errorData = await pearResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || 'Login failed' },
        { status: pearResponse.status }
      );
    }

    // Return the JWT tokens
    const data: LoginResponse = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login request failed';
    console.error('Pear auth login error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
