'use client';

import { useState } from 'react';
import type { AutonomyConfig, AutonomyLevel } from '@/agent/autonomy';

interface Props {
    config: AutonomyConfig;
    onChange: (config: AutonomyConfig) => void;
}

const LEVEL_INFO: Record<AutonomyLevel, {
    name: string;
    description: string;
    icon: string;
    color: string;
    risk: string;
}> = {
    0: {
        name: 'Manual',
        description: 'Agent suggests, you approve everything',
        icon: '🛡️',
        color: 'green',
        risk: 'Safest',
    },
    1: {
        name: 'Semi-Auto',
        description: 'Auto-execute small trades in approved markets',
        icon: '⚡',
        color: 'blue',
        risk: 'Balanced',
    },
    2: {
        name: 'Auto-Bounded',
        description: 'Auto-execute anything within Salt limits',
        icon: '🤖',
        color: 'yellow',
        risk: 'Elevated',
    },
    3: {
        name: 'Full Auto',
        description: 'Maximum agent freedom, Salt only gatekeeper',
        icon: '⚠️',
        color: 'red',
        risk: 'Highest',
    },
};

const ALL_MARKETS = ['GOLD', 'OIL', 'SILVER', 'BTC', 'ETH'];

export function AutonomyControl({ config, onChange }: Props) {
    const currentLevel = LEVEL_INFO[config.level];

    const setLevel = (level: AutonomyLevel) => {
        if (level === 3 && !config.acknowledgedRisks) {
            const confirmed = window.confirm(
                '⚠️ Full Auto Mode gives the agent maximum freedom.\n\n' +
                'Salt policies are the ONLY constraint.\n\n' +
                'Are you sure you want to enable this?'
            );
            if (!confirmed) return;
            onChange({ ...config, level, acknowledgedRisks: true });
        } else {
            onChange({ ...config, level });
        }
    };

    const toggleMarket = (market: string) => {
        const markets = config.autoApproveMarkets || [];
        const newMarkets = markets.includes(market)
            ? markets.filter(m => m !== market)
            : [...markets, market];
        onChange({ ...config, autoApproveMarkets: newMarkets });
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Agent Autonomy</h3>
                <span className={`text-xs px-2 py-1 rounded ${config.level === 0 ? 'bg-green-900/50 text-green-400' :
                        config.level === 1 ? 'bg-blue-900/50 text-blue-400' :
                            config.level === 2 ? 'bg-yellow-900/50 text-yellow-400' :
                                'bg-red-900/50 text-red-400'
                    }`}>
                    {currentLevel.risk}
                </span>
            </div>

            {/* Level selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {([0, 1, 2, 3] as AutonomyLevel[]).map((level) => {
                    const info = LEVEL_INFO[level];
                    const isActive = config.level === level;

                    return (
                        <button
                            key={level}
                            onClick={() => setLevel(level)}
                            className={`p-2 rounded-lg text-center transition-all border ${isActive
                                    ? level === 0 ? 'bg-green-900/30 border-green-500' :
                                        level === 1 ? 'bg-blue-900/30 border-blue-500' :
                                            level === 2 ? 'bg-yellow-900/30 border-yellow-500' :
                                                'bg-red-900/30 border-red-500'
                                    : 'bg-black/30 border-[var(--card-border)] hover:border-[var(--muted)]'
                                }`}
                        >
                            <span className="text-xl block mb-1">{info.icon}</span>
                            <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-[var(--muted)]'}`}>
                                {info.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Current level description */}
            <div className="p-3 bg-black/30 rounded-lg mb-4 border border-[var(--card-border)]">
                <p className="text-white text-sm font-medium">{currentLevel.name}</p>
                <p className="text-[var(--muted)] text-xs mt-1">{currentLevel.description}</p>
            </div>

            {/* Level 1 specific options */}
            {config.level === 1 && (
                <div className="space-y-3 pt-3 border-t border-[var(--card-border)]">
                    <div>
                        <label className="text-xs text-[var(--muted)] block mb-1">
                            Auto-approve up to
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min={10}
                                max={200}
                                step={10}
                                value={config.autoApproveMaxSize || 50}
                                onChange={(e) => onChange({
                                    ...config,
                                    autoApproveMaxSize: parseInt(e.target.value),
                                })}
                                className="flex-1 accent-blue-500"
                            />
                            <span className="text-white text-sm w-14 text-right font-medium">
                                ${config.autoApproveMaxSize || 50}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-[var(--muted)] block mb-2">
                            Auto-approve markets
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ALL_MARKETS.map((market) => {
                                const isEnabled = (config.autoApproveMarkets || []).includes(market);
                                return (
                                    <button
                                        key={market}
                                        onClick={() => toggleMarket(market)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isEnabled
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-black/30 text-[var(--muted)] border border-[var(--card-border)]'
                                            }`}
                                    >
                                        {market}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Level 3 warning */}
            {config.level === 3 && (
                <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <p className="text-red-400 text-xs">
                        ⚠️ <strong>Full Auto Mode Active</strong><br />
                        The agent will execute trades without asking. Salt policies are your only protection.
                    </p>
                </div>
            )}

            {/* Enforcement note */}
            <p className="text-[var(--muted)] text-xs mt-4">
                🔒 All trades still go through Salt policies. Autonomy only affects approval prompts.
            </p>
        </div>
    );
}
