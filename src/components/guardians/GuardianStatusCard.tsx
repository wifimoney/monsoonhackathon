'use client';

import { useEffect, useState, useCallback } from 'react';
import type { GuardianStatus, GuardianPolicy } from '@/guardians/types';

interface StatusData {
    status: GuardianStatus;
    policies: GuardianPolicy[];
}

export function GuardianStatusCard() {
    const [data, setData] = useState<StatusData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/guardians/status');
            const json = await res.json();

            if (json.success) {
                setData({ status: json.status, policies: json.policies });
                setError(null);
            } else {
                setError(json.error || 'Failed to fetch status');
            }
        } catch {
            setError('Failed to connect to API');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    if (isLoading) {
        return (
            <div className="card p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-zinc-800 rounded w-1/2" />
                    <div className="h-20 bg-zinc-800 rounded" />
                    <div className="h-16 bg-zinc-800 rounded" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="card p-4 border-red-800 bg-red-900/20">
                <p className="text-red-400 font-medium">Guardian Status Unavailable</p>
                <p className="text-red-300 text-sm mt-1">{error || 'Unknown error'}</p>
            </div>
        );
    }

    const { status, policies } = data;

    const healthConfig = {
        ready: { color: 'bg-green-500', text: 'text-green-400', label: 'Ready' },
        degraded: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Degraded' },
        offline: { color: 'bg-red-500', text: 'text-red-400', label: 'Offline' },
    };

    const health = healthConfig[status.health];

    return (
        <div className="card p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    🛡️ Robo Guardians
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${health.color} animate-pulse`} />
                    <span className={`text-sm font-medium ${health.text}`}>
                        {health.label}
                    </span>
                </div>
            </div>

            {/* Organization & Account */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted mb-1">Organization</p>
                    <p className="font-medium">{status.org.name}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted mb-1">Account</p>
                    <p className="font-medium">{status.account.name}</p>
                    {status.account.address && (
                        <p className="text-muted text-xs font-mono mt-0.5">
                            {status.account.address.slice(0, 6)}...{status.account.address.slice(-4)}
                        </p>
                    )}
                </div>
            </div>

            {/* Quorum Display */}
            <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-muted mb-2">Guardian Quorum</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        {Array.from({ length: status.quorum.humans }).map((_, i) => (
                            <span key={`human-${i}`} className="text-base">👤</span>
                        ))}
                        <span className="text-muted text-xs ml-1">
                            {status.quorum.humans} Humans
                        </span>
                    </div>

                    <span className="text-zinc-600">+</span>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: status.quorum.robos }).map((_, i) => (
                            <span key={`robo-${i}`} className="text-base">🤖</span>
                        ))}
                        <span className="text-muted text-xs ml-1">
                            {status.quorum.robos} Robos
                        </span>
                    </div>
                </div>
                <p className="text-muted text-xs mt-2">
                    Requires {status.quorum.required} of {status.quorum.total} signatures
                </p>
            </div>

            {/* Active Policies */}
            <div>
                <p className="text-xs text-muted mb-2">Active Policies</p>
                <div className="flex flex-wrap gap-2">
                    {policies.filter(p => p.enabled).map((policy) => (
                        <span
                            key={policy.id}
                            className="text-xs px-2 py-1 rounded bg-indigo-900/30 text-indigo-400"
                            title={policy.description}
                        >
                            {policy.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Network */}
            <div className="flex items-center justify-between text-sm px-1 pt-2 border-t border-zinc-800">
                <span className="text-muted">Network</span>
                <span className="font-medium">{status.network.name}</span>
            </div>
        </div>
    );
}
