import { NextResponse } from 'next/server';
import { getAuditStats } from '@/audit/store';

/**
 * GET /api/audit/stats - Get audit statistics
 */
export async function GET() {
    try {
        const stats = getAuditStats();

        return NextResponse.json({
            success: true,
            stats,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
