'use client';

import { useState, useEffect } from 'react';
import { AgentChat } from '@/components/agent/AgentChat';

export default function TradePage() {
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        fetch('/api/agent/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(console.error);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Trade</h2>
                <p className="text-[var(--muted)] mt-1">
                    Natural language trading with policy enforcement
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Chat - 2 columns */}
                <div className="lg:col-span-2">
                    <AgentChat />
                </div>

                {/* Sidebar - 1 column */}
                <div className="space-y-4">
                    {/* Active Guardrails */}
                    <div className="card">
                        <h3 className="font-semibold text-white mb-3">Active Guardrails</h3>
                        {config ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">Max per tx:</span>
                                    <span className="text-white font-medium">${config.guardrails.maxPerTx}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">Cooldown:</span>
                                    <span className="text-white font-medium">{config.guardrails.cooldownSeconds}s</span>
                                </div>
                                <div className="pt-2 border-t border-[var(--card-border)]">
                                    <p className="text-[var(--muted)] mb-2">Allowed Markets:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {config.guardrails.allowedMarkets.map((market: string) => (
                                            <span
                                                key={market}
                                                className="bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-1 rounded text-xs font-medium"
                                            >
                                                {market}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[var(--muted)] text-sm">Loading...</p>
                        )}
                    </div>

                    {/* How It Works */}
                    <div className="card bg-[var(--primary)]/5 border-[var(--primary)]/30">
                        <h3 className="font-semibold text-white mb-3">How It Works</h3>
                        <ol className="space-y-2 text-sm text-[var(--muted)]">
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--primary)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                                <span>Type your intent in natural language</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--primary)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                                <span>Agent parses and validates against guardrails</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--primary)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
                                <span>Salt enforces policy and signs if compliant</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--primary)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">4</span>
                                <span>Transaction executes on HyperEVM</span>
                            </li>
                        </ol>
                    </div>

                    {/* Chain Info */}
                    {config && (
                        <div className="card">
                            <h3 className="font-semibold text-white mb-3">Network</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">Chain:</span>
                                    <span className="text-white font-medium">{config.chain.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">Chain ID:</span>
                                    <span className="text-white font-mono">{config.chain.chainId}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
