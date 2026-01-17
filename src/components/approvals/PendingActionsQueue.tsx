'use client';

import { useState, useEffect } from 'react';
import type { PendingAction } from '@/approvals/types';
import { ACTION_INFO } from '@/approvals/types';

interface Props {
    onActionUpdate?: () => void;
}

export function PendingActionsQueue({ onActionUpdate }: Props) {
    const [actions, setActions] = useState<PendingAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchActions = async () => {
        try {
            const res = await fetch('/api/approvals');
            const data = await res.json();
            setActions(data.actions || []);
        } catch (e) {
            console.error('Failed to fetch actions', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchActions();
        const interval = setInterval(fetchActions, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
        setProcessing(id);
        try {
            await fetch(`/api/approvals/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: decision }),
            });
            await fetchActions();
            onActionUpdate?.();
        } catch (e) {
            console.error('Failed to process action', e);
        }
        setProcessing(null);
    };

    const getStatusColor = (status: PendingAction['status']) => {
        switch (status) {
            case 'pending': return 'text-yellow-400 bg-yellow-900/20';
            case 'approved': return 'text-green-400 bg-green-900/20';
            case 'executed': return 'text-green-400 bg-green-900/20';
            case 'rejected': return 'text-red-400 bg-red-900/20';
            case 'expired': return 'text-zinc-400 bg-zinc-800/50';
            default: return 'text-zinc-400';
        }
    };

    const getTimeRemaining = (expiresAt: number) => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) return 'Expired';
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const pendingActions = actions.filter(a => a.status === 'pending');
    const recentActions = actions.filter(a => a.status !== 'pending').slice(0, 5);

    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-700"></div>
                    <div className="h-4 bg-zinc-700 rounded w-32"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Pending Actions */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        ⏳ Pending Approvals
                        {pendingActions.length > 0 && (
                            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                                {pendingActions.length}
                            </span>
                        )}
                    </h3>
                </div>

                {pendingActions.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                        <p>No pending actions</p>
                        <p className="text-xs mt-1">Actions will appear here when proposed</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingActions.map((action) => {
                            const info = ACTION_INFO[action.type];
                            return (
                                <div
                                    key={action.id}
                                    className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{info.icon}</span>
                                            <div>
                                                <h4 className="font-medium">{action.title}</h4>
                                                <p className="text-xs text-muted">{action.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-muted">Expires in</div>
                                            <div className="text-sm font-mono text-yellow-400">
                                                {getTimeRemaining(action.expiresAt)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Policy Check */}
                                    <div className={`mb-3 p-2 rounded text-sm ${action.policyCheck.passed
                                            ? 'bg-green-900/20 text-green-400'
                                            : 'bg-red-900/20 text-red-400'
                                        }`}>
                                        {action.policyCheck.passed
                                            ? '✅ Policy check passed'
                                            : `❌ ${action.policyCheck.denials.map(d => d.reason).join('; ')}`
                                        }
                                    </div>

                                    {/* Proposed by */}
                                    <div className="text-xs text-muted mb-3">
                                        Proposed by: <span className="text-white">{action.proposedBy === 'agent' ? '🤖 Agent' : '👤 User'}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDecision(action.id, 'approve')}
                                            disabled={processing === action.id || !action.policyCheck.passed}
                                            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing === action.id ? '...' : '✓ Approve'}
                                        </button>
                                        <button
                                            onClick={() => handleDecision(action.id, 'reject')}
                                            disabled={processing === action.id}
                                            className="flex-1 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors disabled:opacity-50"
                                        >
                                            {processing === action.id ? '...' : '✗ Reject'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recent Actions */}
            {recentActions.length > 0 && (
                <div className="card">
                    <h3 className="text-sm font-medium text-muted mb-3">Recent Decisions</h3>
                    <div className="space-y-2">
                        {recentActions.map((action) => {
                            const info = ACTION_INFO[action.type];
                            return (
                                <div
                                    key={action.id}
                                    className="flex items-center justify-between text-sm py-2 border-b border-zinc-800 last:border-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{info.icon}</span>
                                        <span className="truncate max-w-[200px]">{action.title}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(action.status)}`}>
                                        {action.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
