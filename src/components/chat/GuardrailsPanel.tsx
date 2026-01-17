'use client';

import type { GuardrailsConfig } from '@/agent/types';

interface Props {
    config: GuardrailsConfig;
    onChange: (config: GuardrailsConfig) => void;
}

const ALL_MARKETS = ['GOLD', 'OIL', 'SILVER', 'BTC', 'ETH'];

export function GuardrailsPanel({ config, onChange }: Props) {
    const toggleMarket = (market: string) => {
        const markets = config.allowedMarkets.includes(market)
            ? config.allowedMarkets.filter(m => m !== market)
            : [...config.allowedMarkets, market];
        onChange({ ...config, allowedMarkets: markets });
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Guardrails</h3>
                <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Active
                </span>
            </div>

            {/* Allowed Markets */}
            <div className="mb-4">
                <label className="text-xs text-[var(--muted)] block mb-2">Allowed Markets</label>
                <div className="flex flex-wrap gap-2">
                    {ALL_MARKETS.map((market) => (
                        <button
                            key={market}
                            onClick={() => toggleMarket(market)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${config.allowedMarkets.includes(market)
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'bg-[var(--card-border)] text-[var(--muted)] hover:text-white'
                                }`}
                        >
                            {market}
                        </button>
                    ))}
                </div>
            </div>

            {/* Max Per Transaction */}
            <div className="mb-4">
                <label className="text-xs text-[var(--muted)] block mb-2">Max per transaction</label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={50}
                        max={500}
                        step={50}
                        value={config.maxPerTx}
                        onChange={(e) => onChange({ ...config, maxPerTx: Number(e.target.value) })}
                        className="flex-1 accent-[var(--primary)]"
                    />
                    <span className="text-white text-sm font-medium w-16 text-right">${config.maxPerTx}</span>
                </div>
            </div>

            {/* Cooldown */}
            <div className="mb-4">
                <label className="text-xs text-[var(--muted)] block mb-2">Cooldown (seconds)</label>
                <input
                    type="number"
                    value={config.cooldownSeconds}
                    onChange={(e) => onChange({ ...config, cooldownSeconds: Number(e.target.value) })}
                    min={0}
                    max={300}
                    className="w-full bg-black text-white rounded-lg px-3 py-2 text-sm
                     border border-[var(--card-border)] focus:border-[var(--primary)] focus:outline-none"
                />
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                <p className="text-xs text-[var(--muted)]">
                    🔒 Salt enforces these rules at execution time. The agent cannot bypass them.
                </p>
            </div>
        </div>
    );
}
