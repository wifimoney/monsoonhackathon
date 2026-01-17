'use client';

import { useMemo, useState } from 'react';
import type { ActionIntent, GuardrailsConfig } from '@/agent/types';

type StrategyResult =
    | { status: 'idle' }
    | { status: 'eligible' }
    | { status: 'denied'; reason: string; details?: string[] }
    | { status: 'executed'; txHash?: string; receipt?: { market: string; side: string; size: number; price: number } };

const DEFAULT_GUARDRAILS: GuardrailsConfig = {
    allowedMarkets: ['GOLD', 'OIL'],
    maxPerTx: 250,
    cooldownSeconds: 60,
    maxSlippageBps: 50,
};

const ALLOWLISTED_ROUTER = '0x1111111111111111111111111111111111111111';

function buildIntent(params: {
    market: string;
    side: 'BUY' | 'SELL';
    notionalUsd: number;
    leverage?: number;
}): ActionIntent & { leverage?: number; targetContract?: string } {
    return {
        type: 'SPOT_MARKET_ORDER',
        market: `${params.market}/USDH`,
        side: params.side,
        notionalUsd: params.notionalUsd,
        maxSlippageBps: 50,
        validForSeconds: 120,
        rationale: ['Strategy execution'],
        riskNotes: [],
        leverage: params.leverage,
        targetContract: ALLOWLISTED_ROUTER,
    };
}

async function checkGuardians(intent: ActionIntent): Promise<{ passed: boolean; denials: string[] }> {
    const res = await fetch('/api/guardians/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionIntent: intent }),
    });
    const data = await res.json();
    if (!res.ok) {
        return { passed: false, denials: [data.error || 'Guardian check failed'] };
    }
    const denials = (data.denials || []).map((d: { reason: string }) => d.reason);
    return { passed: data.passed, denials };
}

async function executeViaSalt(intent: ActionIntent, guardrails: GuardrailsConfig): Promise<StrategyResult> {
    const res = await fetch('/api/chat/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionIntent: intent, guardrailsConfig: guardrails }),
    });
    const data = await res.json();

    if (!res.ok) {
        return {
            status: 'denied',
            reason: data.policyBreach?.reason || data.error || 'Execution failed',
            details: data.policyBreach?.rejectedPolicies?.map((p: { name: string }) => p.name),
        };
    }

    if (data.denied || data.policyBreach) {
        return {
            status: 'denied',
            reason: data.policyBreach?.reason || 'Policy denied',
            details: data.policyBreach?.rejectedPolicies?.map((p: { name: string }) => p.name),
        };
    }

    return {
        status: 'executed',
        txHash: data.txHash,
        receipt: data.receipt,
    };
}

export function StrategyConsole() {
    const [basisMarket, setBasisMarket] = useState('GOLD');
    const [fundingRate, setFundingRate] = useState(0.012);
    const [fundingThreshold, setFundingThreshold] = useState(0.01);
    const [basisBand, setBasisBand] = useState(0.05);
    const [basisValue, setBasisValue] = useState(0.02);
    const [currentExposure, setCurrentExposure] = useState(250);
    const [exposureCap, setExposureCap] = useState(1000);
    const [basisResult, setBasisResult] = useState<StrategyResult>({ status: 'idle' });

    const [deltaValue, setDeltaValue] = useState(120);
    const [deltaThreshold, setDeltaThreshold] = useState(50);
    const [hedgeCap, setHedgeCap] = useState(200);
    const [hedgeResult, setHedgeResult] = useState<StrategyResult>({ status: 'idle' });

    const [windowStart, setWindowStart] = useState(8);
    const [windowEnd, setWindowEnd] = useState(22);
    const [simulateOutsideHours, setSimulateOutsideHours] = useState(true);
    const [hoursResult, setHoursResult] = useState<StrategyResult>({ status: 'idle' });

    const [drawdownValue, setDrawdownValue] = useState(-12);
    const [drawdownLimit, setDrawdownLimit] = useState(-10);
    const [drawdownResult, setDrawdownResult] = useState<StrategyResult>({ status: 'idle' });

    const guardrails = useMemo(() => DEFAULT_GUARDRAILS, []);

    const basisEligible = fundingRate >= fundingThreshold
        && Math.abs(basisValue) <= basisBand
        && currentExposure < exposureCap;

    const basisEligibilityLabel = basisEligible ? 'Eligible ✅' : 'Not eligible ❌';

    const deltaEligible = Math.abs(deltaValue) > deltaThreshold;
    const proposedHedge = Math.min(Math.abs(deltaValue), hedgeCap);

    const currentUtcHour = new Date().getUTCHours();
    const isWithinWindow = currentUtcHour >= windowStart && currentUtcHour < windowEnd;

    const drawdownBreached = drawdownValue <= drawdownLimit;

    const handleBasisExecute = async () => {
        if (!basisEligible) {
            setBasisResult({ status: 'denied', reason: 'Conditions not met', details: ['Funding/basis/exposure gate'] });
            return;
        }

        const intent = buildIntent({
            market: basisMarket,
            side: 'BUY',
            notionalUsd: 50,
            leverage: 2,
        });

        const guardianCheck = await checkGuardians(intent);
        if (!guardianCheck.passed) {
            setBasisResult({ status: 'denied', reason: 'Policy denied', details: guardianCheck.denials });
            return;
        }

        const result = await executeViaSalt(intent, guardrails);
        setBasisResult(result);
    };

    const handleBasisFail = async () => {
        const intent = buildIntent({
            market: basisMarket,
            side: 'BUY',
            notionalUsd: 500,
            leverage: 4,
        });

        const guardianCheck = await checkGuardians(intent);
        if (!guardianCheck.passed) {
            setBasisResult({ status: 'denied', reason: 'Policy denied', details: guardianCheck.denials });
            return;
        }

        const result = await executeViaSalt(intent, guardrails);
        setBasisResult(result);
    };

    const handleHedge = async (oversize: boolean) => {
        if (!deltaEligible) {
            setHedgeResult({ status: 'denied', reason: 'Delta below threshold' });
            return;
        }

        const notionalUsd = oversize ? hedgeCap * 10 : proposedHedge;
        const intent = buildIntent({
            market: 'GOLD',
            side: deltaValue > 0 ? 'SELL' : 'BUY',
            notionalUsd,
            leverage: 2,
        });

        const guardianCheck = await checkGuardians(intent);
        if (!guardianCheck.passed) {
            setHedgeResult({ status: 'denied', reason: 'Policy denied', details: guardianCheck.denials });
            return;
        }

        const result = await executeViaSalt(intent, guardrails);
        setHedgeResult(result);
    };

    const syncTimeWindow = async (enabled: boolean) => {
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                config: {
                    timeWindow: {
                        enabled: true,
                        startHour: windowStart,
                        endHour: windowEnd,
                        simulateOutsideHours: enabled,
                    },
                },
            }),
        });
    };

    const handleHoursAttempt = async () => {
        await syncTimeWindow(simulateOutsideHours);
        const intent = buildIntent({ market: 'OIL', side: 'BUY', notionalUsd: 50, leverage: 2 });
        const guardianCheck = await checkGuardians(intent);
        if (!guardianCheck.passed) {
            setHoursResult({ status: 'denied', reason: 'Outside trading hours', details: guardianCheck.denials });
            return;
        }
        const result = await executeViaSalt(intent, guardrails);
        setHoursResult(result);
    };

    const handleDrawdownToggle = async (halt: boolean) => {
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulateDrawdown: halt }),
        });
    };

    const handleDrawdownAttempt = async () => {
        await handleDrawdownToggle(drawdownBreached);
        const intent = buildIntent({ market: 'GOLD', side: 'BUY', notionalUsd: 50, leverage: 2 });
        const guardianCheck = await checkGuardians(intent);
        if (!guardianCheck.passed) {
            setDrawdownResult({ status: 'denied', reason: 'Circuit breaker engaged', details: guardianCheck.denials });
            return;
        }
        const result = await executeViaSalt(intent, guardrails);
        setDrawdownResult(result);
    };

    return (
        <div className="card">
            <h3 className="text-sm font-medium text-white mb-4">Strategy Guardrail Demos</h3>
            <div className="grid grid-cols-1 gap-4">
                <StrategyCard title="Basis / Funding Arb Guardrail" status={basisResult}>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-xs text-[var(--muted)]">
                            Market
                            <select
                                value={basisMarket}
                                onChange={(e) => setBasisMarket(e.target.value)}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            >
                                {['GOLD', 'OIL'].map(market => (
                                    <option key={market} value={market}>{market}</option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Funding rate (%/8h)
                            <input
                                type="number"
                                step="0.001"
                                value={fundingRate}
                                onChange={(e) => setFundingRate(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Threshold X (%/8h)
                            <input
                                type="number"
                                step="0.001"
                                value={fundingThreshold}
                                onChange={(e) => setFundingThreshold(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Basis band (abs %)
                            <input
                                type="number"
                                step="0.01"
                                value={basisBand}
                                onChange={(e) => setBasisBand(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Basis value (%)
                            <input
                                type="number"
                                step="0.01"
                                value={basisValue}
                                onChange={(e) => setBasisValue(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Exposure ($)
                            <input
                                type="number"
                                value={currentExposure}
                                onChange={(e) => setCurrentExposure(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Exposure cap ($)
                            <input
                                type="number"
                                value={exposureCap}
                                onChange={(e) => setExposureCap(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs ${basisEligible ? 'text-green-400' : 'text-red-400'}`}>
                            {basisEligibilityLabel}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={handleBasisExecute} className="btn btn-accent">Execute hedge pair</button>
                            <button onClick={handleBasisFail} className="btn btn-danger">Force denial</button>
                        </div>
                    </div>
                </StrategyCard>

                <StrategyCard title="Auto-Hedge Delta" status={hedgeResult}>
                    <div className="grid grid-cols-3 gap-3">
                        <label className="text-xs text-[var(--muted)]">
                            Net delta ($)
                            <input
                                type="number"
                                value={deltaValue}
                                onChange={(e) => setDeltaValue(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Threshold ($)
                            <input
                                type="number"
                                value={deltaThreshold}
                                onChange={(e) => setDeltaThreshold(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Max hedge size ($)
                            <input
                                type="number"
                                value={hedgeCap}
                                onChange={(e) => setHedgeCap(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs ${deltaEligible ? 'text-green-400' : 'text-red-400'}`}>
                            {deltaEligible ? `Propose hedge: $${proposedHedge}` : 'Below threshold'}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => handleHedge(false)} className="btn btn-accent">Execute hedge</button>
                            <button onClick={() => handleHedge(true)} className="btn btn-danger">Oversize hedge</button>
                        </div>
                    </div>
                </StrategyCard>

                <StrategyCard title="Market Hours Mode" status={hoursResult}>
                    <div className="grid grid-cols-3 gap-3">
                        <label className="text-xs text-[var(--muted)]">
                            Window start (UTC)
                            <input
                                type="number"
                                min={0}
                                max={23}
                                value={windowStart}
                                onChange={(e) => setWindowStart(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Window end (UTC)
                            <input
                                type="number"
                                min={1}
                                max={24}
                                value={windowEnd}
                                onChange={(e) => setWindowEnd(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Simulate outside hours
                            <select
                                value={simulateOutsideHours ? 'yes' : 'no'}
                                onChange={(e) => setSimulateOutsideHours(e.target.value === 'yes')}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs ${isWithinWindow && !simulateOutsideHours ? 'text-green-400' : 'text-red-400'}`}>
                            Current UTC hour: {currentUtcHour} ({isWithinWindow && !simulateOutsideHours ? 'Inside window' : 'Outside window'})
                        </span>
                        <button onClick={handleHoursAttempt} className="btn btn-accent">Attempt action</button>
                    </div>
                </StrategyCard>

                <StrategyCard title="Drawdown Stop (Circuit Breaker)" status={drawdownResult}>
                    <div className="grid grid-cols-3 gap-3">
                        <label className="text-xs text-[var(--muted)]">
                            Drawdown (%)
                            <input
                                type="number"
                                value={drawdownValue}
                                onChange={(e) => setDrawdownValue(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            Limit (%)
                            <input
                                type="number"
                                value={drawdownLimit}
                                onChange={(e) => setDrawdownLimit(Number(e.target.value))}
                                className="mt-1 w-full bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                            />
                        </label>
                        <div className="flex items-end">
                            <span className={`text-xs ${drawdownBreached ? 'text-red-400' : 'text-green-400'}`}>
                                {drawdownBreached ? 'PAUSED' : 'ACTIVE'}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--muted)]">Circuit breaker set when drawdown ≤ limit.</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleDrawdownToggle(true)} className="btn btn-danger">Trigger pause</button>
                            <button onClick={() => handleDrawdownToggle(false)} className="btn btn-secondary">Reset</button>
                            <button onClick={handleDrawdownAttempt} className="btn btn-accent">Attempt action</button>
                        </div>
                    </div>
                </StrategyCard>
            </div>
        </div>
    );
}

function StrategyCard({ title, status, children }: { title: string; status: StrategyResult; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-[var(--card-border)] p-4 bg-black/40">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white">{title}</h4>
                <StatusBadge status={status} />
            </div>
            <div className="space-y-3">
                {children}
                {status.status === 'denied' && (
                    <div className="mt-2 text-xs text-red-300">
                        <p className="font-medium">Denied: {status.reason}</p>
                        {status.details && status.details.length > 0 && (
                            <ul className="list-disc list-inside text-red-400 mt-1">
                                {status.details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                {status.status === 'executed' && (
                    <div className="mt-2 text-xs text-green-300">
                        Executed {status.receipt?.market} {status.receipt?.side} ${status.receipt?.size}
                        {status.txHash && (
                            <span className="ml-2 text-green-400">TX {status.txHash.slice(0, 10)}...</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: StrategyResult }) {
    const base = 'text-xs px-2 py-1 rounded';

    if (status.status === 'executed') {
        return <span className={`${base} bg-green-900/40 text-green-400`}>Executed</span>;
    }
    if (status.status === 'denied') {
        return <span className={`${base} bg-red-900/40 text-red-400`}>Denied</span>;
    }
    if (status.status === 'eligible') {
        return <span className={`${base} bg-blue-900/40 text-blue-400`}>Eligible</span>;
    }

    return <span className={`${base} bg-[var(--card-border)] text-[var(--muted)]`}>Idle</span>;
}
