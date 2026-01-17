import { NextRequest, NextResponse } from 'next/server';
import { getAuditRecords, recordAudit } from '@/audit/store';
import type { AuditFilter, CreateAuditInput } from '@/audit/types';

/**
 * GET /api/audit - Query audit records with filtering
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const filter: AuditFilter = {
            limit: parseInt(searchParams.get('limit') || '20'),
            offset: parseInt(searchParams.get('offset') || '0'),
        };

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

        // Parse action category filter
        const actionCategory = searchParams.get('actionCategory');
        if (actionCategory) {
            filter.actionCategory = actionCategory.split(',') as AuditFilter['actionCategory'];
        }

        // Parse source filter
        const source = searchParams.get('source');
        if (source) {
            filter.source = source.split(',') as AuditFilter['source'];
        }

        // Account filter
        const accountId = searchParams.get('accountId');
        if (accountId) {
            filter.accountId = accountId;
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

        const { records, total, hasMore } = getAuditRecords(filter);

        return NextResponse.json({
            success: true,
            records,
            total,
            hasMore,
            offset: filter.offset || 0,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/audit - Record a new audit entry
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as CreateAuditInput;

        // Validate required fields
        if (!body.actionType || !body.actionCategory || !body.account || !body.source) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const record = recordAudit(body);

        return NextResponse.json({
            success: true,
            record,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
