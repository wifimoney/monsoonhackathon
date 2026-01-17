'use client';

import { useEffect, useState } from 'react';

type AuditEntry = {
    id: string;
    timestamp: number;
    actionType: string;
    status: string;
    market?: string;
    notionalUsd?: number;
    txHash?: string;
    reason?: string;
};

export default function AuditPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);

    const fetchEntries = async () => {
        const res = await fetch('/api/audit/logs?limit=50');
        const data = await res.json();
        setEntries(data.entries || []);
    };

    useEffect(() => {
        fetchEntries();
        const interval = setInterval(fetchEntries, 10000);
        return () => clearInterval(interval);
    }, []);

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

                {entries.length === 0 ? (
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
                                        {entry.actionType.replace('_', ' ')} {entry.market ? `• ${entry.market}` : ''}
                                    </p>
                                    {entry.reason && (
                                        <p className="text-[var(--muted)]">{entry.reason}</p>
                                    )}
                                </div>
                                <div className="text-right text-[var(--muted)]">
                                    <p>{entry.status.toUpperCase()}</p>
                                    {entry.txHash && <p>{entry.txHash.slice(0, 10)}...</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
