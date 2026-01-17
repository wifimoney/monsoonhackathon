'use client';

import { useEffect, useState } from 'react';

interface BreachAnalytics {
    total: number;
    last24h: number;
    lastWeek: number;
    byType: Record<string, number>;
    byName: Record<string, number>;
    byMarket: Record<string, number>;
    mostCommonPolicy: string | null;
    mostCommonCount: number;
}

export function BreachAnalytics() {
    const [analytics, setAnalytics] = useState<BreachAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/salt/breach-analytics');
                const data = await res.json();
                setAnalytics(data);
            } catch (error) {
                console.error('Failed to fetch breach analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="card">
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Breach Analytics</h3>
                <div className="animate-pulse space-y-2">
                    <div className="h-8 bg-black/30 rounded" />
                    <div className="h-20 bg-black/30 rounded" />
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="card">
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Breach Analytics</h3>
                <p className="text-[var(--muted)] text-xs">No data available</p>
            </div>
        );
    }

    const maxTypeCount = Math.max(...Object.values(analytics.byType), 1);
    const hasBreaches = analytics.total > 0;

    return (
        <div className="card">
            <h3 className="text-sm font-medium text-white mb-4">Policy Breach Analytics</h3>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-black/30 rounded p-2 text-center border border-[var(--card-border)]">
                    <p className="text-xl font-bold text-red-400">{analytics.last24h}</p>
                    <p className="text-xs text-[var(--muted)]">24h</p>
                </div>
                <div className="bg-black/30 rounded p-2 text-center border border-[var(--card-border)]">
                    <p className="text-xl font-bold text-yellow-400">{analytics.lastWeek}</p>
                    <p className="text-xs text-[var(--muted)]">7 days</p>
                </div>
                <div className="bg-black/30 rounded p-2 text-center border border-[var(--card-border)]">
                    <p className="text-xl font-bold text-[var(--muted)]">{analytics.total}</p>
                    <p className="text-xs text-[var(--muted)]">All</p>
                </div>
            </div>

            {hasBreaches ? (
                <>
                    {/* By type bar chart */}
                    {Object.keys(analytics.byType).length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-[var(--muted)] mb-2">By Policy Type</p>
                            <div className="space-y-1.5">
                                {Object.entries(analytics.byType).map(([type, count]) => (
                                    <div key={type} className="flex items-center gap-2">
                                        <span className="text-xs text-[var(--muted)] w-20 truncate capitalize">
                                            {type.replace('_', ' ')}
                                        </span>
                                        <div className="flex-1 h-3 bg-black/30 rounded overflow-hidden">
                                            <div
                                                className="h-full bg-red-600 transition-all"
                                                style={{ width: `${(count / maxTypeCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-[var(--muted)] w-6 text-right">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* By market */}
                    {Object.keys(analytics.byMarket).length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-[var(--muted)] mb-2">By Market</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(analytics.byMarket).map(([market, count]) => (
                                    <span
                                        key={market}
                                        className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded"
                                    >
                                        {market}: {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Most common breach */}
                    {analytics.mostCommonPolicy && (
                        <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                            <p className="text-xs text-[var(--muted)]">Most triggered policy</p>
                            <p className="text-red-400 font-medium">{analytics.mostCommonPolicy}</p>
                            <p className="text-xs text-[var(--muted)]">{analytics.mostCommonCount}× this week</p>
                        </div>
                    )}

                    {/* Suggestion */}
                    {analytics.mostCommonPolicy && (
                        <p className="text-xs text-[var(--muted)] mt-3">
                            💡 Consider adjusting your {analytics.mostCommonPolicy.toLowerCase()} settings
                        </p>
                    )}
                </>
            ) : (
                <div className="text-center py-4">
                    <span className="text-2xl">✅</span>
                    <p className="text-green-400 text-sm mt-2">No breaches recorded</p>
                    <p className="text-[var(--muted)] text-xs">Your guardrails are working well</p>
                </div>
            )}
        </div>
    );
}
