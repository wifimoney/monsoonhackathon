/**
 * Audit API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditStats } from '@/audit/logger';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const action = searchParams.get('action') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
        const auditStats = getAuditStats();
        return NextResponse.json(auditStats);
    }

    const logs = getAuditLogs({ action, limit, offset, startDate, endDate });
    return NextResponse.json({ logs, count: logs.length });
}
