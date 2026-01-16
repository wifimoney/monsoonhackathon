'use client';

import { useState } from 'react';

export interface GuardrailsState {
    enabled: boolean;
    maxPerTx: number;
    allowedMarkets: string[];
    cooldownSeconds: number;
}

const DEFAULT_GUARDRAILS: GuardrailsState = {
    enabled: false,
    maxPerTx: 250,
    allowedMarkets: ['GOLD', 'OIL'],
    cooldownSeconds: 60,
};

interface Props {
    onGuardrailsChange?: (guardrails: GuardrailsState) => void;
}

export function GuardrailsConfig({ onGuardrailsChange }: Props) {
    const [guardrails, setGuardrails] = useState<GuardrailsState>(DEFAULT_GUARDRAILS);

    const updateGuardrails = (updates: Partial<GuardrailsState>) => {
        const newState = { ...guardrails, ...updates };
        setGuardrails(newState);
        onGuardrailsChange?.(newState);
    };

    const MARKETS = ['GOLD', 'OIL', 'SILVER', 'BTC', 'ETH'];

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-[var(--muted)]">Monsoon Guardrails</h3>
                <button
                    onClick={() => updateGuardrails({ enabled: !guardrails.enabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${guardrails.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'
                        }`}
                >
                    <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${guardrails.enabled ? 'translate-x-7' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {guardrails.enabled && (
                <div className="space-y-4 pt-4 border-t border-[var(--card-border)]">
                    {/* Max Per Transaction */}
                    <div>
                        <label className="text-xs text-[var(--muted)] block mb-2">
                            Max per transaction (USDH)
                        </label>
                        <input
                            type="number"
                            value={guardrails.maxPerTx}
                            onChange={(e) => updateGuardrails({ maxPerTx: Number(e.target.value) })}
                            className="w-full bg-black text-white text-sm rounded-lg p-3 border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none"
                        />
                    </div>

                    {/* Allowed Markets */}
                    <div>
                        <label className="text-xs text-[var(--muted)] block mb-2">
                            Allowed Markets
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {MARKETS.map((market) => (
                                <button
                                    key={market}
                                    onClick={() => {
                                        const markets = guardrails.allowedMarkets.includes(market)
                                            ? guardrails.allowedMarkets.filter(m => m !== market)
                                            : [...guardrails.allowedMarkets, market];
                                        updateGuardrails({ allowedMarkets: markets });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${guardrails.allowedMarkets.includes(market)
                                            ? 'bg-[var(--primary)] text-white'
                                            : 'bg-[var(--card-border)] text-[var(--muted)] hover:text-white'
                                        }`}
                                >
                                    {market}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cooldown */}
                    <div>
                        <label className="text-xs text-[var(--muted)] block mb-2">
                            Cooldown (seconds)
                        </label>
                        <input
                            type="number"
                            value={guardrails.cooldownSeconds}
                            onChange={(e) => updateGuardrails({ cooldownSeconds: Number(e.target.value) })}
                            className="w-full bg-black text-white text-sm rounded-lg p-3 border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none"
                        />
                    </div>

                    {/* Policy Summary */}
                    <div className="bg-black/50 rounded-lg p-4 border border-[var(--primary)]/30">
                        <p className="text-xs text-[var(--muted)] mb-2 font-medium">Active Policy:</p>
                        <ul className="text-sm text-white space-y-1.5">
                            <li className="flex items-center gap-2">
                                <span className="text-[var(--accent)]">•</span>
                                Max ${guardrails.maxPerTx} per transaction
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-[var(--accent)]">•</span>
                                Markets: {guardrails.allowedMarkets.join(', ') || 'None'}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-[var(--accent)]">•</span>
                                {guardrails.cooldownSeconds}s cooldown between trades
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
