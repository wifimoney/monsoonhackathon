import { NextResponse } from 'next/server';

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';

/**
 * Diagnostic API endpoint to check Pear Protocol prerequisites
 *
 * GET /api/pear/diagnose?token=<accessToken>
 *
 * Checks:
 * 1. Token validity
 * 2. Agent wallet status
 * 3. Builder fee approval (indirectly via positions attempt)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accessToken = searchParams.get('token');

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'Access token is required' },
      { status: 400 }
    );
  }

  const diagnostics: {
    tokenValid: boolean;
    agentWallet: {
      exists: boolean;
      address?: string;
      error?: string;
    };
    positions: {
      canFetch: boolean;
      count?: number;
      error?: string;
    };
    recommendations: string[];
  } = {
    tokenValid: false,
    agentWallet: { exists: false },
    positions: { canFetch: false },
    recommendations: [],
  };

  // 1. Check agent wallet status
  try {
    console.log('Checking agent wallet status...');
    const agentWalletResponse = await fetch(`${PEAR_API_BASE_URL}/agentWallet`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Agent wallet response status:', agentWalletResponse.status);
    const agentWalletText = await agentWalletResponse.text();
    console.log('Agent wallet response body:', agentWalletText);

    if (agentWalletResponse.status === 401) {
      diagnostics.tokenValid = false;
      diagnostics.agentWallet.error = 'Token invalid or expired';
      diagnostics.recommendations.push('Re-authenticate with Pear Protocol (your session may have expired)');
    } else if (agentWalletResponse.status === 404) {
      diagnostics.tokenValid = true;
      diagnostics.agentWallet.exists = false;
      diagnostics.agentWallet.error = 'No agent wallet found';
      diagnostics.recommendations.push('Complete Step 2: Create Agent Wallet');
    } else if (agentWalletResponse.ok) {
      diagnostics.tokenValid = true;
      try {
        const agentWalletData = JSON.parse(agentWalletText);
        diagnostics.agentWallet.exists = true;
        diagnostics.agentWallet.address = agentWalletData.agentWalletAddress || agentWalletData.address;
      } catch {
        diagnostics.agentWallet.exists = true;
      }
    } else {
      diagnostics.agentWallet.error = `Unexpected status: ${agentWalletResponse.status} - ${agentWalletText}`;
    }
  } catch (error) {
    diagnostics.agentWallet.error = error instanceof Error ? error.message : 'Failed to check agent wallet';
    diagnostics.recommendations.push('Network error checking agent wallet');
  }

  // 2. Check if we can fetch positions (indicates full setup)
  try {
    console.log('Checking positions access...');
    const positionsResponse = await fetch(`${PEAR_API_BASE_URL}/positions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Positions response status:', positionsResponse.status);
    const positionsText = await positionsResponse.text();
    console.log('Positions response body:', positionsText);

    if (positionsResponse.ok) {
      diagnostics.positions.canFetch = true;
      try {
        const positionsData = JSON.parse(positionsText);
        diagnostics.positions.count = Array.isArray(positionsData) ? positionsData.length : 0;
      } catch {
        diagnostics.positions.count = 0;
      }
    } else if (positionsResponse.status === 401) {
      diagnostics.positions.error = 'Unauthorized - token may be invalid';
    } else if (positionsResponse.status === 403) {
      diagnostics.positions.error = 'Forbidden - agent wallet or builder fee not approved';
      diagnostics.recommendations.push('Complete Step 3: Approve Agent Wallet on Hyperliquid');
      diagnostics.recommendations.push('Complete Step 4: Approve Builder Fee on Hyperliquid');
    } else {
      diagnostics.positions.error = `Status ${positionsResponse.status}: ${positionsText}`;
    }
  } catch (error) {
    diagnostics.positions.error = error instanceof Error ? error.message : 'Failed to check positions';
  }

  // 3. Check Hyperliquid account info via Pear's portfolio endpoint
  try {
    console.log('Checking portfolio/account info...');
    const portfolioResponse = await fetch(`${PEAR_API_BASE_URL}/portfolio`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Portfolio response status:', portfolioResponse.status);
    const portfolioText = await portfolioResponse.text();
    console.log('Portfolio response body:', portfolioText);

    if (portfolioResponse.ok) {
      try {
        const portfolioData = JSON.parse(portfolioText);
        const accountValue = portfolioData.totalAccountValue || portfolioData.accountValue || 0;
        if (accountValue <= 0) {
          diagnostics.recommendations.push('Deposit USDC to your Hyperliquid account - you need margin to trade');
        }
      } catch {
        // Ignore parse errors
      }
    }
  } catch (error) {
    console.log('Portfolio check error:', error);
  }

  // Generate summary
  const allGood = diagnostics.tokenValid &&
                  diagnostics.agentWallet.exists &&
                  diagnostics.positions.canFetch;

  if (allGood && diagnostics.recommendations.length === 0) {
    diagnostics.recommendations.push('All prerequisites met! If trades still fail, check your Hyperliquid balance.');
  }

  return NextResponse.json({
    success: true,
    allPrerequisitesMet: allGood,
    diagnostics,
  });
}
