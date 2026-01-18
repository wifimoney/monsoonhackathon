import { NextResponse } from 'next/server';
import { getDatabase } from '@/audit/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const accountId = searchParams.get('accountId');

    if (!orgId || !accountId) {
        return NextResponse.json({ error: 'Missing orgId or accountId' }, { status: 400 });
    }

    try {
        const db = getDatabase();
        const row = db.prepare('SELECT config_json FROM guardrails WHERE org_id = ? AND account_id = ?')
            .get(orgId, accountId) as { config_json: string } | undefined;

        if (row) {
            return NextResponse.json(JSON.parse(row.config_json));
        }
        return NextResponse.json({}); // Valid but empty config
    } catch (error) {
        console.error('Error fetching guardrails:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orgId, accountId, config } = body;

        if (!orgId || !accountId || !config) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getDatabase();
        const stmt = db.prepare(`
        INSERT INTO guardrails (org_id, account_id, config_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(org_id, account_id) DO UPDATE SET
            config_json = excluded.config_json,
            updated_at = excluded.updated_at
    `);

        stmt.run(orgId, accountId, JSON.stringify(config), Date.now());

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving guardrails:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
