'use client';

import { useState, useEffect, useCallback } from 'react';
import { GuardianCard } from '@/components/guardians/GuardianCard';
import { PresetSelector } from '@/components/guardians/PresetSelector';
import { LossGuardianCard } from '@/components/guardians/LossGuardianCard';
import { GuardianStatusCard } from '@/components/guardians/GuardianStatusCard';
import { ActivityFeed } from '@/components/guardians/ActivityFeed';
import { SaltTestButtons } from '@/components/guardians/SaltTestButtons';
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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
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
        setRefreshTrigger(prev => prev + 1); // Refresh activity feed
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
                <p className="text-muted mt-1">
                    Policy suite protecting your automation with local risk checks + Salt enforcement
                </p>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left Sidebar: Status + Activity + Salt Tests */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    <GuardianStatusCard />
                    <ActivityFeed refreshTrigger={refreshTrigger} />
                    <SaltTestButtons onTestComplete={() => setRefreshTrigger(prev => prev + 1)} />
                </div>

                {/* Main Content: Presets, State, Guardians */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Preset selector */}
                    <PresetSelector preset={preset} onChange={handlePresetChange} />

                    {/* State counters */}
                    {state && (
                        <div className="grid grid-cols-4 gap-4">
                            <div className="card text-center">
                                <p className="text-2xl font-bold text-white">{state.tradesRemaining}</p>
                                <p className="text-xs text-muted">Trades remaining</p>
                            </div>
                            <div className="card text-center">
                                <p className="text-2xl font-bold text-white">${state.dailySpendRemaining}</p>
                                <p className="text-xs text-muted">Budget remaining</p>
                            </div>
                            <div className="card text-center">
                                <p className="text-2xl font-bold text-white">
                                    {state.cooldownRemaining > 0 ? `${Math.ceil(state.cooldownRemaining / 1000)}s` : 'Ready'}
                                </p>
                                <p className="text-xs text-muted">Cooldown</p>
                            </div>
                            <div className="card text-center">
                                <p className="text-2xl font-bold text-white">{state.tradeCount}</p>
                                <p className="text-xs text-muted">Trades today</p>
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
                                            : 'bg-black/30 text-muted border border-zinc-800'
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

                    {/* Footer note */}
                    <div className="text-center text-xs text-muted pt-4 border-t border-zinc-800">
                        <p>
                            🔒 <strong>Local Risk Engine</strong> checks leverage, exposure, time, counters.
                            <span className="text-purple-400 ml-1">Salt</span> enforces spend limits and venue allowlists.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

