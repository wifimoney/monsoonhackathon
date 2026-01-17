'use client';

import { useEffect, useState } from 'react';
import type { AuditRecord, AuditStatus } from '@/audit/types';
import { AUDIT_STATUS_COLORS, AUDIT_STATUS_ICONS } from '@/audit/types';

export default function AuditPage() {
    const [entries, setEntries] = useState<AuditRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEntries = async () => {
        try {
            const res = await fetch('/api/audit?limit=50');
            const data = await res.json();
            setEntries(data.records || []);
        } catch (e) {
            console.error('Failed to fetch audit entries', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEntries();
        const interval = setInterval(fetchEntries, 10000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: AuditStatus) => {
        const colors: Record<AuditStatus, string> = {
            approved: 'text-green-400 bg-green-900/20',
            denied: 'text-red-400 bg-red-900/20',
            pending: 'text-yellow-400 bg-yellow-900/20',
            filled: 'text-green-400 bg-green-900/20',
            partial: 'text-blue-400 bg-blue-900/20',
            failed: 'text-orange-400 bg-orange-900/20',
        };
        return colors[status] || 'text-zinc-400';
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold">Audit Log</h2>
                <p className="text-[var(--muted)] mt-1">
                    Receipts and policy denials across all Salt-gated actions.
                </p>
            </header>

            <div className="card space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                    <button onClick={fetchEntries} className="btn btn-secondary">Refresh</button>
                </div>

                {loading ? (
                    <p className="text-xs text-[var(--muted)]">Loading...</p>
                ) : entries.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">No audit entries yet.</p>
                ) : (
                    <div className="space-y-2 text-xs">
                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between border-b border-[var(--card-border)] pb-2"
                            >
                                <div>
                                    <p className="text-white">
                                        {AUDIT_STATUS_ICONS[entry.status] || '📋'}{' '}
                                        {entry.actionType?.replace('_', ' ') || 'unknown'}{' '}
                                        {entry.payload?.market ? `• ${entry.payload.market}` : ''}
                                    </p>
                                    <p className="text-[var(--muted)]">
                                        {entry.account?.name || 'Unknown'} • {entry.source}
                                    </p>
                                    {entry.result?.denials?.length > 0 && (
                                        <p className="text-red-400 mt-1">
                                            {entry.result.denials.map(d => d.reason).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(entry.status)}`}>
                                        {entry.status?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                    {entry.txHash && (
                                        <p className="text-[var(--muted)] mt-1">{entry.txHash.slice(0, 10)}...</p>
                                    )}
                                    <p className="text-[var(--muted)] mt-1">
                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
