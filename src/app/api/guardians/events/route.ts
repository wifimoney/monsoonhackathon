import { NextRequest, NextResponse } from 'next/server';
import { getEvents, recordEvent } from '@/guardians/state';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const events = getEvents(limit);

    return NextResponse.json({
        success: true,
        events,
        total: events.length,
    });
}

// POST to manually add an event (for testing)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { actionType, payload, passed, denials, txHash } = body;

        const event = recordEvent(
            actionType || 'test',
            payload || {},
            passed ?? true,
            denials || [],
            txHash
        );

        return NextResponse.json({
            success: true,
            event,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 400 }
        );
    }
}
