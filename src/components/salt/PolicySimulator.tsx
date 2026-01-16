'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActionIntent, GuardrailsConfig } from '@/agent/types';

interface PolicyCheck {
    name: string;
    passed: boolean;
    reason?: string;
    current?: string | number;
    limit?: string | number;
    severity: 'blocker' | 'warning' | 'info';
}

interface SimulationResult {
    wouldPass: boolean;
    confidence: string;
    localGuardrails: { passed: boolean; checks: PolicyCheck[] };
    saltPolicies: { passed: boolean; checks: PolicyCheck[] };
    suggestions?: string[];
    whatIf?: { change: string; wouldPass: boolean; description: string }[];
}

interface Props {
    actionIntent: ActionIntent | null;
    guardrailsConfig: GuardrailsConfig;
    onIntentChange?: (intent: ActionIntent) => void;
}

export function PolicySimulator({ actionIntent, guardrailsConfig, onIntentChange }: Props) {
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [editedIntent, setEditedIntent] = useState<ActionIntent | null>(null);

    // Debounced simulation
    const simulate = useCallback(async (intent: ActionIntent, config: GuardrailsConfig) => {
        setIsSimulating(true);
        try {
            const res = await fetch('/api/salt/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionIntent: intent, guardrailsConfig: config }),
            });
            const data = await res.json();
            setResult(data);
        } finally {
            setIsSimulating(false);
        }
    }, []);

    // Auto-simulate when intent changes
    useEffect(() => {
        const intent = editedIntent || actionIntent;
        if (intent) {
            const timeout = setTimeout(() => simulate(intent, guardrailsConfig), 300);
            return () => clearTimeout(timeout);
        }
    }, [actionIntent, editedIntent, guardrailsConfig, simulate]);

    // Handle what-if click
    const applyWhatIf = (change: string) => {
        if (!actionIntent) return;

        const newIntent = { ...actionIntent };

        if (change.includes('Size')) {
            const match = change.match(/\$(\d+)/);
            if (match) newIntent.notionalUsd = parseInt(match[1]);
        }

        if (change.includes('Market')) {
            const match = change.match(/→ (\w+)/);
            if (match) newIntent.market = `${match[1]}/USDH`;
        }

        setEditedIntent(newIntent);
        onIntentChange?.(newIntent);
    };

    if (!actionIntent) {
        return (
            <div className="card">
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Policy Simulator</h3>
                <p className="text-[var(--muted)] text-xs">Create a trade to simulate policy checks</p>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Policy Simulator</h3>
                {isSimulating && (
                    <span className="text-xs text-blue-400 animate-pulse">Checking...</span>
                )}
            </div>

            {/* Live parameter adjusters */}
            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-black/30 rounded-lg border border-[var(--card-border)]">
                <div>
                    <label className="text-xs text-[var(--muted)]">Size ($)</label>
                    <input
                        type="number"
                        value={editedIntent?.notionalUsd || actionIntent.notionalUsd}
                        onChange={(e) => {
                            const newIntent = {
                                ...(editedIntent || actionIntent),
                                notionalUsd: parseInt(e.target.value) || 0
                            };
                            setEditedIntent(newIntent);
                            onIntentChange?.(newIntent);
                        }}
                        className="w-full bg-black text-white text-sm rounded px-2 py-1.5 mt-1 border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-[var(--muted)]">Market</label>
                    <select
                        value={(editedIntent?.market || actionIntent.market).split('/')[0]}
                        onChange={(e) => {
                            const newIntent = {
                                ...(editedIntent || actionIntent),
                                market: `${e.target.value}/USDH`
                            };
                            setEditedIntent(newIntent);
                            onIntentChange?.(newIntent);
                        }}
                        className="w-full bg-black text-white text-sm rounded px-2 py-1.5 mt-1 border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none"
                    >
                        {['GOLD', 'OIL', 'SILVER', 'BTC', 'ETH'].map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Result display */}
            {result && (
                <>
                    {/* Pass/Fail header */}
                    <div className={`rounded-lg p-3 mb-4 ${result.wouldPass
                            ? 'bg-green-900/30 border border-green-700'
                            : 'bg-red-900/30 border border-red-700'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{result.wouldPass ? '✅' : '🚫'}</span>
                            <div>
                                <p className={`font-medium ${result.wouldPass ? 'text-green-400' : 'text-red-400'}`}>
                                    {result.wouldPass ? 'Would Pass' : 'Would Be Blocked'}
                                </p>
                                <p className="text-xs text-[var(--muted)]">
                                    Confidence: {result.confidence}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Policy checks breakdown */}
                    <div className="space-y-3">
                        <PolicySection
                            title="Local Guardrails"
                            passed={result.localGuardrails.passed}
                            checks={result.localGuardrails.checks}
                        />
                        <PolicySection
                            title="Salt Policies"
                            passed={result.saltPolicies.passed}
                            checks={result.saltPolicies.checks}
                            isSalt
                        />
                    </div>

                    {/* What-if suggestions */}
                    {result.whatIf && result.whatIf.length > 0 && !result.wouldPass && (
                        <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                            <p className="text-xs text-[var(--muted)] mb-2">💡 Quick fixes:</p>
                            <div className="space-y-2">
                                {result.whatIf.map((scenario, i) => (
                                    <button
                                        key={i}
                                        onClick={() => applyWhatIf(scenario.change)}
                                        className="w-full text-left p-2 bg-blue-900/20 border border-blue-800/50 
                               rounded-lg hover:bg-blue-900/30 transition-colors"
                                    >
                                        <p className="text-blue-400 text-sm font-medium">{scenario.change}</p>
                                        <p className="text-[var(--muted)] text-xs">{scenario.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function PolicySection({
    title,
    passed,
    checks,
    isSalt = false
}: {
    title: string;
    passed: boolean;
    checks: PolicyCheck[];
    isSalt?: boolean;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className={passed ? 'text-green-400' : 'text-red-400'}>
                    {passed ? '✓' : '✗'}
                </span>
                <span className="text-sm text-white">{title}</span>
                {isSalt && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded">
                        Salt
                    </span>
                )}
            </div>
            <div className="space-y-1 ml-5">
                {checks.map((check, i) => (
                    <div
                        key={i}
                        className={`text-xs p-2 rounded flex items-center justify-between ${check.passed
                                ? 'bg-black/30 text-[var(--muted)]'
                                : check.severity === 'blocker'
                                    ? 'bg-red-900/20 text-red-400'
                                    : 'bg-yellow-900/20 text-yellow-400'
                            }`}
                    >
                        <span>{check.name}</span>
                        {check.current !== undefined && check.limit !== undefined && (
                            <span className="font-mono text-xs">
                                {check.current} / {check.limit}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
