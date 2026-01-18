import { NextResponse } from 'next/server';
import { recordAudit, getAuditRecords, getAuditStats } from '@/audit';
import type { CreateAuditInput, AuditFilter } from '@/audit/types';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Build filter from query params
        const filter: AuditFilter = {
            limit: parseInt(searchParams.get('limit') || '50'),
            offset: parseInt(searchParams.get('offset') || '0'),
        };

        if (searchParams.get('status')) {
            filter.status = searchParams.get('status')!.split(',') as any[];
        }
        if (searchParams.get('actionType')) {
            filter.actionType = searchParams.get('actionType')!.split(',') as any[];
        }
        if (searchParams.get('search')) {
            filter.search = searchParams.get('search')!;
        }

        const { records, total, hasMore } = getAuditRecords(filter);
        const stats = getAuditStats();

        return NextResponse.json({
            success: true,
            records,
            total,
            hasMore,
            stats: {
                totalActions: stats.total,
                confirmed: stats.byStatus.confirmed || 0,
                pending: stats.byStatus.pending || 0,
                denied: stats.byStatus.denied || 0,
                approved: stats.byStatus.approved || 0,
            },
        });
    } catch (error: any) {
        console.error('Error fetching audit records:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body: CreateAuditInput = await request.json();

        // Validate required fields
        if (!body.actionType || !body.actionCategory || !body.status || !body.account || !body.source) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Record to SQLite
        const record = await recordAudit(body);

        return NextResponse.json({ success: true, id: record.id });
    } catch (error: any) {
        console.error('Error recording audit:', error);
        return NextResponse.json({ error: error.message || 'Failed to record audit' }, { status: 500 });
    }
}
