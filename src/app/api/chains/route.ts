import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get chainTypes query parameter, default to EVM
    const searchParams = request.nextUrl.searchParams;
    const chainTypes = searchParams.get('chainTypes') || 'EVM';
    
    // Build the API URL with chainTypes query parameter
    const apiUrl = new URL('https://li.quest/v1/chains');
    apiUrl.searchParams.set('chainTypes', chainTypes);
    
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'x-lifi-api-key': 'e59c773a-c220-4e7d-86ba-787f3b237921.1a2b24f4-1531-4322-91ec-48ae5abddb33',
      },
      // Revalidate every hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chains: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[API] Failed to fetch chains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chains', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

