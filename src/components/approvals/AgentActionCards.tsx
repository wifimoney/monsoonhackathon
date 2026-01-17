'use client';

import { useState } from 'react';
import type { ActionType, ActionDetails } from '@/approvals/types';
import { ACTION_INFO } from '@/approvals/types';

interface Props {
    onPropose?: (type: ActionType, details: ActionDetails) => void;
}

interface AgentAction {
    type: ActionType;
    enabled: boolean;
    details: ActionDetails;
}

const DEFAULT_ACTIONS: AgentAction[] = [
    {
        type: 'auto_hedge',
        enabled: false,
        details: { deltaThreshold: 50, hedgeSize: 75, market: 'ETH-PERP' },
    },
    {
        type: 'deploy_liquidity',
        enabled: false,
        details: { lpAmount: 200, venue: 'Hyperliquid OB', token: 'USDC' },
    },
    {
        type: 'rebalance_vault',
        enabled: false,
        details: { targetAllocation: { ETH: 40, BTC: 30, GOLD: 30 } },
    },
    {
        type: 'basket_trade',
        enabled: false,
        details: { basket: [{ symbol: 'GOLD', weight: 50 }, { symbol: 'OIL', weight: 50 }], amount: 500 },
    },
];

export function AgentActionCards({ onPropose }: Props) {
    const [actions, setActions] = useState<AgentAction[]>(DEFAULT_ACTIONS);
    const [proposing, setProposing] = useState<ActionType | null>(null);

    const handlePropose = async (action: AgentAction) => {
        setProposing(action.type);
        try {
            const res = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: action.type,
                    details: action.details,
                    proposedBy: 'user',
                }),
            });
            const data = await res.json();
            if (data.success) {
                onPropose?.(action.type, action.details);
            }
        } catch (e) {
            console.error('Failed to propose', e);
        }
        setProposing(null);
    };

    const toggleAction = (type: ActionType) => {
        setActions(prev => prev.map(a =>
            a.type === type ? { ...a, enabled: !a.enabled } : a
        ));
    };

    return (
        <div className="card">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                🤖 Robo Manager Actions
            </h3>
            <p className="text-sm text-muted mb-4">
                Enable automations or propose individual actions for approval
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actions.map((action) => {
                    const info = ACTION_INFO[action.type];
                    return (
                        <div
                            key={action.type}
                            className={`p-4 rounded-xl border transition-all ${action.enabled
                                    ? 'border-green-500/50 bg-green-900/10'
                                    : 'border-zinc-700 bg-zinc-800/30'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{info.icon}</span>
                                    <span className="font-medium">{info.name}</span>
                                </div>
                                <button
                                    onClick={() => toggleAction(action.type)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${action.enabled ? 'bg-green-600' : 'bg-zinc-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${action.enabled ? 'left-6' : 'left-0.5'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted mb-3">{info.description}</p>

                            {/* Details */}
                            <div className="bg-black/30 rounded-lg p-2 mb-3 text-xs">
                                {action.type === 'auto_hedge' && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Threshold / Size</span>
                                        <span>${action.details.deltaThreshold} / ${action.details.hedgeSize}</span>
                                    </div>
                                )}
                                {action.type === 'deploy_liquidity' && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Amount / Venue</span>
                                        <span>${action.details.lpAmount} → {action.details.venue}</span>
                                    </div>
                                )}
                                {action.type === 'rebalance_vault' && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Target</span>
                                        <span>
                                            {Object.entries(action.details.targetAllocation || {})
                                                .map(([k, v]) => `${k}:${v}%`)
                                                .join(' ')}
                                        </span>
                                    </div>
                                )}
                                {action.type === 'basket_trade' && (
                                    <div className="flex justify-between">
                                        <span className="text-muted">Basket</span>
                                        <span>
                                            ${action.details.amount} → {action.details.basket?.map(b => b.symbol).join('+')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Propose Button */}
                            <button
                                onClick={() => handlePropose(action)}
                                disabled={proposing === action.type}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {proposing === action.type ? 'Proposing...' : 'Propose for Approval'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Demo Button */}
            <div className="mt-4 pt-4 border-t border-zinc-700">
                <button
                    onClick={async () => {
                        await fetch('/api/approvals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ demo: true }),
                        });
                        onPropose?.('auto_hedge', {});
                    }}
                    className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors"
                >
                    🎮 Create Demo Pending Actions
                </button>
            </div>
        </div>
    );
}
