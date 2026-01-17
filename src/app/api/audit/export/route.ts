import { NextRequest, NextResponse } from 'next/server';
import { exportAuditCsv } from '@/audit/store';
import type { AuditFilter } from '@/audit/types';

/**
 * GET /api/audit/export - Export audit records as CSV
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const filter: AuditFilter = {};

        // Parse status filter
        const status = searchParams.get('status');
        if (status) {
            filter.status = status.split(',') as AuditFilter['status'];
        }

        // Parse action type filter
        const actionType = searchParams.get('actionType');
        if (actionType) {
            filter.actionType = actionType.split(',') as AuditFilter['actionType'];
        }

        // Time range
        const fromTs = searchParams.get('from');
        if (fromTs) {
            filter.fromTimestamp = parseInt(fromTs);
        }
        const toTs = searchParams.get('to');
        if (toTs) {
            filter.toTimestamp = parseInt(toTs);
        }

        // Search
        const search = searchParams.get('search');
        if (search) {
            filter.search = search;
        }

        const csv = exportAuditCsv(filter);
        const filename = `audit_export_${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
