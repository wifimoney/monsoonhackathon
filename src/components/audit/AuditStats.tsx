'use client';

import { useEffect, useState } from 'react';
import type { AuditStats } from '@/audit/types';

export function AuditStatsCards() {
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/audit/stats');
                const data = await res.json();
                if (data.success) {
                    setStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch audit stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-pulse">
                        <div className="h-4 bg-zinc-800 rounded w-20 mb-2" />
                        <div className="h-8 bg-zinc-800 rounded w-16" />
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const cards = [
        {
            label: 'Total Actions',
            value: stats.total.toLocaleString(),
            subtext: `${stats.last24h} in 24h`,
            color: 'text-white',
        },
        {
            label: 'Success Rate',
            value: `${stats.successRate}%`,
            subtext: `${stats.byStatus.approved + stats.byStatus.filled} approved`,
            color: stats.successRate >= 80 ? 'text-green-400' : stats.successRate >= 50 ? 'text-yellow-400' : 'text-red-400',
        },
        {
            label: 'Denied',
            value: stats.byStatus.denied.toString(),
            subtext: stats.denialBreakdown[0]?.topReason?.slice(0, 20) || 'None',
            color: 'text-red-400',
        },
        {
            label: 'Volume',
            value: formatVolume(stats.totalVolume),
            subtext: `${stats.last7d} actions (7d)`,
            color: 'text-blue-400',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {cards.map((card, i) => (
                <div
                    key={i}
                    className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
                >
                    <div className="text-muted text-sm mb-1">{card.label}</div>
                    <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                    <div className="text-xs text-muted mt-1 truncate">{card.subtext}</div>
                </div>
            ))}
        </div>
    );
}

function formatVolume(value: number): string {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
}
