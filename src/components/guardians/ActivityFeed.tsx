'use client';

import { useEffect, useState, useCallback } from 'react';
import type { GuardianEvent } from '@/guardians/types';

interface Props {
    refreshTrigger?: number;
}

export function ActivityFeed({ refreshTrigger }: Props) {
    const [events, setEvents] = useState<GuardianEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const res = await fetch('/api/guardians/events?limit=10');
            const json = await res.json();
            if (json.success) {
                setEvents(json.events);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, [fetchEvents, refreshTrigger]);

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatPayload = (event: GuardianEvent) => {
        if (event.payload.market && event.payload.side) {
            return `${event.payload.side} ${event.payload.market}`;
        }
        if (event.payload.amount && event.payload.token) {
            return `${event.payload.amount} ${event.payload.token}`;
        }
        if (event.payload.amount) {
            return `$${event.payload.amount}`;
        }
        return event.actionType.toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="card p-4">
                <h3 className="text-sm font-medium text-muted mb-4">Guardian Activity</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-zinc-800 h-20 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted">Guardian Activity</h3>
                <button
                    onClick={fetchEvents}
                    className="text-xs text-muted hover:text-white transition-colors"
                >
                    ↻ Refresh
                </button>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-4xl mb-3">🛡️</p>
                    <p className="text-muted">No guardian activity yet</p>
                    <p className="text-muted text-xs mt-1">
                        Use the test buttons to see guardians in action
                    </p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {events.map((event) => {
                        const isApproved = event.status === 'approved';
                        const isDenied = event.status === 'denied';

                        return (
                            <div
                                key={event.id}
                                className={`
                                    rounded-lg p-3 border transition-all
                                    ${isApproved ? 'bg-green-900/10 border-green-900/30' : ''}
                                    ${isDenied ? 'bg-red-900/10 border-red-900/30' : ''}
                                    ${!isApproved && !isDenied ? 'bg-zinc-800/50 border-zinc-800' : ''}
                                `}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        {/* Status icon */}
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
                                            ${isApproved ? 'bg-green-900/30' : ''}
                                            ${isDenied ? 'bg-red-900/30' : ''}
                                        `}>
                                            {isApproved ? '✅' : isDenied ? '🚫' : '⏳'}
                                        </div>

                                        <div className="min-w-0">
                                            {/* Action + status */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm">
                                                    {formatPayload(event)}
                                                </span>
                                                <span className={`
                                                    text-xs px-2 py-0.5 rounded
                                                    ${isApproved ? 'bg-green-900/50 text-green-400' : ''}
                                                    ${isDenied ? 'bg-red-900/50 text-red-400' : ''}
                                                `}>
                                                    {isApproved ? 'Approved' : isDenied ? 'Denied' : 'Pending'}
                                                </span>
                                            </div>

                                            {/* Denial reasons */}
                                            {isDenied && event.result.denials.length > 0 && (
                                                <p className="text-red-400 text-xs mt-1">
                                                    {event.result.denials[0].reason}
                                                </p>
                                            )}

                                            {/* Policy badges */}
                                            {event.result.denials.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {event.result.denials.map((denial, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400"
                                                        >
                                                            ✗ {denial.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Transaction link */}
                                            {event.txHash && (
                                                <a
                                                    href={`https://sepolia.arbiscan.io/tx/${event.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-400 text-xs hover:underline mt-2 font-mono"
                                                >
                                                    {event.txHash.slice(0, 10)}...{event.txHash.slice(-6)} ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-muted text-xs whitespace-nowrap flex-shrink-0">
                                        {formatTime(event.timestamp)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
