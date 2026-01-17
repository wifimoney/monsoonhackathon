import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://li.quest/v1/chains', {
      headers: {
        'x-lifi-api-key': 'monsoon',
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

