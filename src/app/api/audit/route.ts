import { NextResponse } from 'next/server';

// Simulated audit logs (in production, this would query SQLite via src/audit/logger.ts)
const auditLogs = [
    {
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'deposit',
        details: { amount: '1000', token: 'mUSDC' },
        actor: '0xB3679670E8B9Ef982B02a6FA4bD876924B9ED584',
        status: 'confirmed',
        txHash: '0x1234...5678',
    },
    {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: 'allocate_ob',
        details: { amount0: '500', amount1: '0.25' },
        actor: '0xB3679670E8B9Ef982B02a6FA4bD876924B9ED584',
        status: 'confirmed',
        txHash: '0xabcd...efgh',
    },
];

export async function GET() {
    return NextResponse.json({
        logs: auditLogs,
        stats: {
            totalActions: auditLogs.length,
            confirmed: auditLogs.filter(l => l.status === 'confirmed').length,
            pending: auditLogs.filter(l => l.status === 'pending').length,
            denied: auditLogs.filter(l => l.status === 'denied').length,
        },
    });
}
