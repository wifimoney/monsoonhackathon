import { NextRequest, NextResponse } from 'next/server';
import { getBreachAnalytics } from '@/agent/breach-analytics';

export async function GET(request: NextRequest) {
    try {
        const analytics = getBreachAnalytics();
        return NextResponse.json(analytics);
    } catch (error: any) {
        console.error('Breach analytics error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to get analytics',
        }, { status: 500 });
    }
}
