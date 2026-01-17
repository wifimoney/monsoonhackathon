import { NextRequest, NextResponse } from 'next/server';
import { getAuditRecords } from '@/audit/store';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? Number(limitParam) : 50;
        const { records } = getAuditRecords({ limit: Number.isNaN(limit) ? 50 : limit });
        return NextResponse.json({ entries: records });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to load audit log' }, { status: 500 });
    }
}
