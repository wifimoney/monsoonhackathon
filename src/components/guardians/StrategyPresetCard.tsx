'use client';

import { useState } from 'react';
import { STRATEGY_PRESET_INFO, GUARDIAN_PRESETS } from '@/guardians/types';
import type { StrategyPresetType, GuardiansConfig } from '@/guardians/types';

interface Props {
    currentPreset: string;
    onPresetSelect: (preset: StrategyPresetType) => void;
}

const STRATEGY_PRESETS: StrategyPresetType[] = ['basisArb', 'autoHedge', 'marketHours', 'drawdownStop'];

export function StrategyPresetCard({ currentPreset, onPresetSelect }: Props) {
    const [testResults, setTestResults] = useState<Record<string, { eligible: boolean; message: string }>>({});
    const [loading, setLoading] = useState<string | null>(null);

    const testStrategy = async (strategy: StrategyPresetType) => {
        setLoading(strategy);
        try {
            const res = await fetch(`/api/guardians/strategy?strategy=${strategy}`);
            const data = await res.json();
            setTestResults((prev) => ({
                ...prev,
                [strategy]: { eligible: data.eligible, message: data.message },
            }));
        } catch (error) {
            setTestResults((prev) => ({
                ...prev,
                [strategy]: { eligible: false, message: `Error: ${error}` },
            }));
        }
        setLoading(null);
    };

    const isCurrentStrategy = (strategy: StrategyPresetType) =>
        currentPreset === strategy;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                🎯 Strategy Presets
            </h3>
            <p className="text-sm text-muted mb-4">
                Select a preset to configure guardians for specific trading strategies
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STRATEGY_PRESETS.map((strategyKey) => {
                    const info = STRATEGY_PRESET_INFO[strategyKey];
                    const isActive = isCurrentStrategy(strategyKey);
                    const testResult = testResults[strategyKey];

                    return (
                        <div
                            key={strategyKey}
                            className={`p-4 rounded-xl border transition-all ${isActive
                                    ? 'border-blue-500 bg-blue-900/20'
                                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{info.icon}</span>
                                    <div>
                                        <h4 className="font-medium">{info.name}</h4>
                                        <p className="text-xs text-muted">{info.description}</p>
                                    </div>
                                </div>
                                {isActive && (
                                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                                        Active
                                    </span>
                                )}
                            </div>

                            {/* Key Policies */}
                            <div className="mb-3">
                                <div className="text-xs text-muted mb-1">Key Policies:</div>
                                <div className="flex flex-wrap gap-1">
                                    {info.keyPolicies.map((policy, i) => (
                                        <span
                                            key={i}
                                            className="text-xs bg-zinc-700 px-2 py-0.5 rounded"
                                        >
                                            {policy}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Conditions */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div className="bg-green-900/20 border border-green-800/50 rounded p-2">
                                    <div className="text-green-400 font-medium">Pass</div>
                                    <div className="text-green-300/70">{info.passCondition}</div>
                                </div>
                                <div className="bg-red-900/20 border border-red-800/50 rounded p-2">
                                    <div className="text-red-400 font-medium">Fail</div>
                                    <div className="text-red-300/70">{info.failCondition}</div>
                                </div>
                            </div>

                            {/* Test Result */}
                            {testResult && (
                                <div
                                    className={`mb-3 p-2 rounded text-xs ${testResult.eligible
                                            ? 'bg-green-900/30 text-green-400'
                                            : 'bg-red-900/30 text-red-400'
                                        }`}
                                >
                                    {testResult.message}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onPresetSelect(strategyKey)}
                                    className={`flex-1 text-sm py-2 rounded-lg transition-colors ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-zinc-700 hover:bg-zinc-600'
                                        }`}
                                >
                                    {isActive ? 'Selected' : 'Select'}
                                </button>
                                <button
                                    onClick={() => testStrategy(strategyKey)}
                                    disabled={loading === strategyKey}
                                    className="flex-1 text-sm py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading === strategyKey ? 'Testing...' : 'Test'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
