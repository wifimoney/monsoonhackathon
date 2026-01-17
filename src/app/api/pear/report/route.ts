import { NextRequest, NextResponse } from 'next/server';
import { listAudit } from '@/audit/store';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 10;
    const entries = listAudit(Number.isNaN(limit) ? 10 : limit).filter((entry) =>
        entry.actionType.startsWith('pear_')
    );

    return NextResponse.json({ entries });
}
