/**
 * API Route: /api/pear/agent-wallet
 * Task 2.5: Handle agent wallet operations
 *
 * GET - Check agent wallet status
 * POST - Create agent wallet or approve operations
 */
import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';
const BUILDER_ADDRESS = '0xA47D4d99191db54A4829cdf3de2417E527c3b042';

/**
 * Extract authorization header from request
 */
function getAuthHeader(request: Request): string | null {
  return request.headers.get('Authorization');
}

/**
 * GET /api/pear/agent-wallet
 * Check agent wallet status
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
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}/agentWallet`, {
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
        { error: errorData.error || errorData.message || 'Failed to get agent wallet status' },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Get agent wallet failed';
    console.error('Pear agent wallet GET error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pear/agent-wallet
 * Create agent wallet or handle approvals
 *
 * Body can include:
 * - action: 'create' | 'approve' | 'builder-fee'
 * - For 'create': no additional fields required
 * - For 'approve': approves agent wallet on Hyperliquid
 * - For 'builder-fee': approves builder fee
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

    const body = await request.json();
    const action = body.action || 'create';

    let endpoint: string;
    let requestBody: Record<string, unknown> | undefined;

    switch (action) {
      case 'create':
        endpoint = '/agentWallet';
        break;
      case 'approve':
        endpoint = '/agent-wallet/approve';
        break;
      case 'builder-fee':
        endpoint = '/builder-fee/approve';
        requestBody = { builder: BUILDER_ADDRESS };
        break;
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions are: create, approve, builder-fee` },
          { status: 400 }
        );
    }

    // Proxy the request to Pear Protocol
    const pearResponse = await fetch(`${PEAR_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    // Handle error responses
    if (!pearResponse.ok) {
      const errorData = await pearResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || `Action '${action}' failed` },
        { status: pearResponse.status }
      );
    }

    const data = await pearResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Agent wallet operation failed';
    console.error('Pear agent wallet POST error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
