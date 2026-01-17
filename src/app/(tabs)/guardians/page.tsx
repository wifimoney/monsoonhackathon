'use client';

import { useState, useEffect } from 'react';
import { GuardianCard } from '@/components/guardians/GuardianCard';
import { PresetSelector } from '@/components/guardians/PresetSelector';
import { LossGuardianCard } from '@/components/guardians/LossGuardianCard';
import type {
    GuardiansConfig,
    GuardianPreset,
    GuardianDenial,
} from '@/guardians/types';
import { GUARDIAN_PRESETS } from '@/guardians/types';

export default function GuardiansPage() {
    const [preset, setPreset] = useState<GuardianPreset>('default');
    const [config, setConfig] = useState<GuardiansConfig>(GUARDIAN_PRESETS.default);
    const [lastDenials, setLastDenials] = useState<Record<string, GuardianDenial | null>>({});
    const [state, setState] = useState<{
        dailySpend: number;
        tradeCount: number;
        cooldownRemaining: number;
        tradesRemaining: number;
        dailySpendRemaining: number;
    } | null>(null);

    // Fetch config on mount
    useEffect(() => {
        fetchConfig();
        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/guardians/config');
            const data = await res.json();
            setConfig(data);
        } catch (e) { }
    };

    const fetchState = async () => {
        try {
            const res = await fetch('/api/guardians/state');
            const data = await res.json();
            setState(data);
        } catch (e) { }
    };

    const handlePresetChange = async (newPreset: GuardianPreset) => {
        setPreset(newPreset);
        setConfig(GUARDIAN_PRESETS[newPreset]);
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset: newPreset }),
        });
    };

    const handleToggle = async (guardian: keyof GuardiansConfig, enabled: boolean) => {
        setConfig(prev => ({
            ...prev,
            [guardian]: { ...prev[guardian], enabled },
        }));
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toggle: { guardian, enabled } }),
        });
    };

    const handleTest = async (guardian: keyof GuardiansConfig) => {
        const res = await fetch('/api/guardians/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guardian }),
        });
        const data = await res.json();
        setLastDenials(prev => ({ ...prev, [guardian]: data.denial }));
        setTimeout(() => {
            setLastDenials(prev => ({ ...prev, [guardian]: null }));
        }, 5000);
    };

    const handleTriggerLoss = async () => {
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulateDrawdown: true }),
        });
        setConfig(prev => ({
            ...prev,
            loss: { ...prev.loss, halted: true },
        }));
    };

    const handleResetLoss = async () => {
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeTrading: true }),
        });
        setConfig(prev => ({
            ...prev,
            loss: { ...prev.loss, halted: false },
        }));
    };

    const handleTimeWindowToggle = async () => {
        const newValue = !config.timeWindow.simulateOutsideHours;
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulateOutsideHours: newValue }),
        });
        setConfig(prev => ({
            ...prev,
            timeWindow: { ...prev.timeWindow, simulateOutsideHours: newValue },
        }));
    };

    const updateConfig = async (guardian: keyof GuardiansConfig, updates: any) => {
        const newConfig = {
            ...config,
            [guardian]: { ...config[guardian], ...updates },
        };
        setConfig(newConfig);
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: { [guardian]: newConfig[guardian] } }),
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Robo Guardians</h2>
                <p className="text-[var(--muted)] mt-1">
                    Policy suite protecting your automation with local risk checks + Salt enforcement
                </p>
            </div>

            {/* Preset selector */}
            <PresetSelector preset={preset} onChange={handlePresetChange} />

            {/* State counters */}
            {state && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-white">{state.tradesRemaining}</p>
                        <p className="text-xs text-[var(--muted)]">Trades remaining today</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-white">${state.dailySpendRemaining}</p>
                        <p className="text-xs text-[var(--muted)]">Daily budget remaining</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-white">
                            {state.cooldownRemaining > 0 ? `${Math.ceil(state.cooldownRemaining / 1000)}s` : 'Ready'}
                        </p>
                        <p className="text-xs text-[var(--muted)]">Cooldown</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-white">{state.tradeCount}</p>
                        <p className="text-xs text-[var(--muted)]">Trades today</p>
                    </div>
                </div>
            )}

            {/* Guardian grid */}
            <div className="grid grid-cols-3 gap-4">
                {/* Spend Guardian */}
                <GuardianCard
                    guardian="spend"
                    enabled={config.spend.enabled}
                    onToggle={(e) => handleToggle('spend', e)}
                    onTest={() => handleTest('spend')}
                    lastDenial={lastDenials.spend}
                    settings={
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--muted)]">Max per trade</span>
                                <span className="text-white font-medium">${config.spend.maxPerTrade}</span>
                            </div>
                            <input
                                type="range"
                                min={50}
                                max={500}
                                step={50}
                                value={config.spend.maxPerTrade}
                                onChange={(e) => updateConfig('spend', { maxPerTrade: parseInt(e.target.value) })}
                                className="w-full accent-[var(--primary)]"
                            />
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--muted)]">Daily limit</span>
                                <span className="text-white font-medium">${config.spend.maxDaily}</span>
                            </div>
                        </div>
                    }
                />

                {/* Leverage Guardian */}
                <GuardianCard
                    guardian="leverage"
                    enabled={config.leverage.enabled}
                    onToggle={(e) => handleToggle('leverage', e)}
                    onTest={() => handleTest('leverage')}
                    lastDenial={lastDenials.leverage}
                    settings={
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-[var(--muted)]">Max leverage</span>
                                <span className="text-white font-medium">{config.leverage.maxLeverage}x</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={10}
                                step={1}
                                value={config.leverage.maxLeverage}
                                onChange={(e) => updateConfig('leverage', { maxLeverage: parseInt(e.target.value) })}
                                className="w-full accent-[var(--primary)]"
                            />
                        </div>
                    }
                />

                {/* Exposure Guardian */}
                <GuardianCard
                    guardian="exposure"
                    enabled={config.exposure.enabled}
                    onToggle={(e) => handleToggle('exposure', e)}
                    onTest={() => handleTest('exposure')}
                    lastDenial={lastDenials.exposure}
                    settings={
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-[var(--muted)]">Max per asset</span>
                                <span className="text-white font-medium">${config.exposure.maxPerAsset}</span>
                            </div>
                            <input
                                type="range"
                                min={100}
                                max={1000}
                                step={100}
                                value={config.exposure.maxPerAsset}
                                onChange={(e) => updateConfig('exposure', { maxPerAsset: parseInt(e.target.value) })}
                                className="w-full accent-[var(--primary)]"
                            />
                        </div>
                    }
                />

                {/* Venue Guardian */}
                <GuardianCard
                    guardian="venue"
                    enabled={config.venue.enabled}
                    onToggle={(e) => handleToggle('venue', e)}
                    onTest={() => handleTest('venue')}
                    lastDenial={lastDenials.venue}
                    settings={
                        <div className="text-xs text-[var(--muted)]">
                            <p>{config.venue.allowedContracts.length} contracts allowed</p>
                            <p className="mt-1 font-mono text-white/60 truncate">
                                {config.venue.allowedContracts[0]?.slice(0, 20)}...
                            </p>
                        </div>
                    }
                />

                {/* Rate Guardian */}
                <GuardianCard
                    guardian="rate"
                    enabled={config.rate.enabled}
                    onToggle={(e) => handleToggle('rate', e)}
                    onTest={() => handleTest('rate')}
                    lastDenial={lastDenials.rate}
                    settings={
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--muted)]">Trades/day</span>
                                <span className="text-white font-medium">{config.rate.maxPerDay}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--muted)]">Cooldown</span>
                                <span className="text-white font-medium">{config.rate.cooldownSeconds}s</span>
                            </div>
                        </div>
                    }
                />

                {/* Time Window Guardian */}
                <GuardianCard
                    guardian="timeWindow"
                    enabled={config.timeWindow.enabled}
                    onToggle={(e) => handleToggle('timeWindow', e)}
                    onTest={() => handleTest('timeWindow')}
                    lastDenial={lastDenials.timeWindow}
                    settings={
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-[var(--muted)]">Trading hours (UTC)</span>
                                <span className="text-white font-medium">
                                    {config.timeWindow.startHour}:00 - {config.timeWindow.endHour}:00
                                </span>
                            </div>
                            <button
                                onClick={handleTimeWindowToggle}
                                className={`w-full text-xs py-1.5 rounded transition-colors ${config.timeWindow.simulateOutsideHours
                                        ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                                        : 'bg-black/30 text-[var(--muted)] border border-[var(--card-border)]'
                                    }`}
                            >
                                {config.timeWindow.simulateOutsideHours ? '🌙 Simulating Outside Hours' : 'Simulate Outside Hours'}
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Loss Guardian (full width) */}
            <LossGuardianCard
                halted={config.loss.halted}
                onTrigger={handleTriggerLoss}
                onReset={handleResetLoss}
            />

            {/* Robo Manager presets */}
            <section className="space-y-4">
                <div>
                    <h3 className="text-xl font-semibold">Strategies as “Robo Manager presets”</h3>
                    <p className="text-[var(--muted)] text-sm mt-1">
                        Map Salt policies to judge-friendly strategy presets with clear guardrails and demos.
                    </p>
                </div>

                <div className="card space-y-3">
                    <h4 className="text-sm font-semibold text-white">Preset strategies you can ship</h4>
                    <ul className="grid gap-2 text-sm text-[var(--muted)]">
                        <li>• Basis/funding arb guardrail: only execute if funding &gt; X and exposure &lt; Y.</li>
                        <li>• Auto-hedge delta: only hedge within max leverage and max spend.</li>
                        <li>• Market hours mode: block all trades outside time window.</li>
                        <li>• Drawdown stop: freeze automation if PnL drops below threshold.</li>
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="card space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold text-white">1) Basis / Funding Arb Guardrail</h4>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Goal: run a market-neutral funding/basis strategy only when conditions are favorable.
                            </p>
                        </div>
                        <div className="text-xs text-[var(--muted)] space-y-2">
                            <div>
                                <p className="font-semibold text-white/80">Inputs</p>
                                <ul className="list-disc list-inside">
                                    <li>Funding rate (perp)</li>
                                    <li>Spot–perp basis (optional)</li>
                                    <li>Current exposure + notional in the strategy</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Salt policies to enforce</p>
                                <ul className="list-disc list-inside">
                                    <li>Max leverage (≤ 3x)</li>
                                    <li>Max notional exposure per asset (≤ $1,000 GOLD)</li>
                                    <li>Max spend per tx (≤ $250)</li>
                                    <li>Trades/day + cooldown (prevents spam / runaway loops)</li>
                                    <li>Allowlist: only specific markets/contracts (GOLD-USDH, OIL-USDH)</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Decision rule</p>
                                <p>
                                    Execute only if fundingRate ≥ X (e.g., 0.01%/8h) and basis within band and exposure
                                    &lt; cap.
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Demo</p>
                                <ul className="list-disc list-inside">
                                    <li>Toggle preset on → show “Eligible ✅” and execute a tiny hedge pair.</li>
                                    <li>Change X so it fails → attempt execution → policy denied.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold text-white">2) Auto-Hedge Delta</h4>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Goal: keep net exposure close to neutral while liquidity is deployed.
                            </p>
                        </div>
                        <div className="text-xs text-[var(--muted)] space-y-2">
                            <div>
                                <p className="font-semibold text-white/80">Inputs</p>
                                <ul className="list-disc list-inside">
                                    <li>Net position delta (from Hyperliquid positions)</li>
                                    <li>Spot inventory (vault inventory)</li>
                                    <li>Optional: volatility / price move threshold</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Salt policies to enforce</p>
                                <ul className="list-disc list-inside">
                                    <li>Max hedge size per action (max spend / max notional)</li>
                                    <li>Max leverage on hedge leg</li>
                                    <li>Allowed instruments (approved perp market)</li>
                                    <li>Trading hours (optional)</li>
                                    <li>Circuit breaker if repeated hedges trigger too often</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Decision rule</p>
                                <p>If abs(delta) &gt; threshold (e.g., &gt; $50 notional), propose hedge.</p>
                                <p>Hedge size clamps to policy limits.</p>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Demo</p>
                                <ul className="list-disc list-inside">
                                    <li>Simulate delta drift → propose hedge.</li>
                                    <li>Try to hedge 10x beyond cap → denied by Salt policies.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold text-white">3) Market Hours Mode</h4>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Goal: prevent execution during illiquid / risky hours or when “hands-off”.
                            </p>
                        </div>
                        <div className="text-xs text-[var(--muted)] space-y-2">
                            <div>
                                <p className="font-semibold text-white/80">Salt policies to enforce</p>
                                <ul className="list-disc list-inside">
                                    <li>Trading hours window (e.g., 08:00–22:00 UTC)</li>
                                    <li>Optional: weekend lock</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Decision rule</p>
                                <p>Outside window: all execute actions denied (trades, OB deploys, rebalances).</p>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Demo</p>
                                <ul className="list-disc list-inside">
                                    <li>Set the window so you’re “outside” → attempt action → denied.</li>
                                    <li>Expand window → same action passes.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold text-white">4) Drawdown Stop (Circuit Breaker)</h4>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Goal: automation shuts off when things go bad.
                            </p>
                        </div>
                        <div className="text-xs text-[var(--muted)] space-y-2">
                            <div>
                                <p className="font-semibold text-white/80">Inputs</p>
                                <ul className="list-disc list-inside">
                                    <li>PnL (from Hyperliquid account / strategy ledger)</li>
                                    <li>Peak-to-trough drawdown tracking</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Salt policies to enforce</p>
                                <ul className="list-disc list-inside">
                                    <li>Freeze trading if drawdown &gt; X% or $X</li>
                                    <li>Optional: require manual re-enable after freeze</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Decision rule</p>
                                <p>If drawdown ≤ -X → set accountStatus = PAUSED and deny all future execute actions.</p>
                            </div>
                            <div>
                                <p className="font-semibold text-white/80">Demo</p>
                                <ul className="list-disc list-inside">
                                    <li>Mock a negative PnL / drawdown event → system flips to PAUSED.</li>
                                    <li>Try any action → denied: circuit breaker engaged.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer note */}
            <div className="text-center text-xs text-[var(--muted)] pt-4 border-t border-[var(--card-border)]">
                <p>
                    🔒 <strong>Local Risk Engine</strong> checks leverage, exposure, time, counters.
                    <span className="text-purple-400 ml-1">Salt</span> enforces spend limits and venue allowlists.
                </p>
            </div>
        </div>
    );
}
