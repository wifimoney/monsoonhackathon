'use client';

import { useState } from 'react';

type ActionResult = {
    success?: boolean;
    stage?: string;
    txHash?: string;
    error?: string;
    issues?: string[];
    denials?: Array<{ name: string; reason: string }>;
    policyBreach?: { reason: string };
};

const MARKETS = ['GOLD', 'OIL'];

export default function VaultPage() {
    const [depositMarket, setDepositMarket] = useState('GOLD');
    const [depositAmount, setDepositAmount] = useState(100);
    const [withdrawMarket, setWithdrawMarket] = useState('GOLD');
    const [withdrawAmount, setWithdrawAmount] = useState(50);
    const [rebalanceFrom, setRebalanceFrom] = useState('GOLD');
    const [rebalanceTo, setRebalanceTo] = useState('OIL');
    const [rebalanceAmount, setRebalanceAmount] = useState(150);
    const [targetGold, setTargetGold] = useState(60);
    const [targetOil, setTargetOil] = useState(40);
    const [result, setResult] = useState<ActionResult | null>(null);
    const [windowStart, setWindowStart] = useState(8);
    const [windowEnd, setWindowEnd] = useState(22);
    const [simulateOutsideHours, setSimulateOutsideHours] = useState(false);
    const [drawdownHalt, setDrawdownHalt] = useState(false);

    const handleAction = async (url: string, payload: Record<string, unknown>) => {
        setResult(null);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        setResult(data);
    };

    const handleApplyMarketHours = async () => {
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                config: {
                    timeWindow: {
                        enabled: true,
                        startHour: windowStart,
                        endHour: windowEnd,
                        simulateOutsideHours,
                    },
                },
            }),
        });
    };

    const handleDrawdownToggle = async (halt: boolean) => {
        setDrawdownHalt(halt);
        await fetch('/api/guardians/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulateDrawdown: halt }),
        });
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold">Vault</h2>
                <p className="text-[var(--muted)] mt-1">
                    Deposit, withdraw, rebalance, and set targets with Salt-enforced guardrails.
                </p>
            </header>

            <div className="grid grid-cols-2 gap-6">
                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Deposit</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <select
                            value={depositMarket}
                            onChange={(e) => setDepositMarket(e.target.value)}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            {MARKETS.map((market) => (
                                <option key={market} value={market}>{market}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                    </div>
                    <button
                        onClick={() => handleAction('/api/vault/deposit', { market: depositMarket, amount: depositAmount })}
                        className="btn btn-accent"
                    >
                        Execute Deposit
                    </button>
                </div>

                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Withdraw</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <select
                            value={withdrawMarket}
                            onChange={(e) => setWithdrawMarket(e.target.value)}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            {MARKETS.map((market) => (
                                <option key={market} value={market}>{market}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                    </div>
                    <button
                        onClick={() => handleAction('/api/vault/withdraw', { market: withdrawMarket, amount: withdrawAmount })}
                        className="btn btn-accent"
                    >
                        Execute Withdraw
                    </button>
                </div>

                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Rebalance</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <select
                            value={rebalanceFrom}
                            onChange={(e) => setRebalanceFrom(e.target.value)}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            {MARKETS.map((market) => (
                                <option key={market} value={market}>{market}</option>
                            ))}
                        </select>
                        <select
                            value={rebalanceTo}
                            onChange={(e) => setRebalanceTo(e.target.value)}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            {MARKETS.map((market) => (
                                <option key={market} value={market}>{market}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={rebalanceAmount}
                            onChange={(e) => setRebalanceAmount(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                    </div>
                    <button
                        onClick={() => handleAction('/api/vault/rebalance', {
                            fromMarket: rebalanceFrom,
                            toMarket: rebalanceTo,
                            notionalUsd: rebalanceAmount,
                        })}
                        className="btn btn-accent"
                    >
                        Execute Rebalance
                    </button>
                </div>

                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Set Targets</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-xs text-[var(--muted)]">
                            GOLD %
                            <input
                                type="number"
                                value={targetGold}
                                onChange={(e) => setTargetGold(Number(e.target.value))}
                                className="mt-1 bg-black text-white text-sm rounded p-2 border border-[var(--card-border)] w-full"
                            />
                        </label>
                        <label className="text-xs text-[var(--muted)]">
                            OIL %
                            <input
                                type="number"
                                value={targetOil}
                                onChange={(e) => setTargetOil(Number(e.target.value))}
                                className="mt-1 bg-black text-white text-sm rounded p-2 border border-[var(--card-border)] w-full"
                            />
                        </label>
                    </div>
                    <button
                        onClick={() => handleAction('/api/vault/set-targets', {
                            targets: { GOLD: targetGold, OIL: targetOil },
                        })}
                        className="btn btn-accent"
                    >
                        Save Targets
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Market Hours Mode</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <input
                            type="number"
                            min={0}
                            max={23}
                            value={windowStart}
                            onChange={(e) => setWindowStart(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                        <input
                            type="number"
                            min={1}
                            max={24}
                            value={windowEnd}
                            onChange={(e) => setWindowEnd(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                        <select
                            value={simulateOutsideHours ? 'yes' : 'no'}
                            onChange={(e) => setSimulateOutsideHours(e.target.value === 'yes')}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            <option value="no">Within hours</option>
                            <option value="yes">Outside hours</option>
                        </select>
                    </div>
                    <button onClick={handleApplyMarketHours} className="btn btn-secondary">
                        Apply Trading Window
                    </button>
                </div>

                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Drawdown Stop</h3>
                    <p className="text-xs text-[var(--muted)]">Toggle the loss guardian circuit breaker.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleDrawdownToggle(true)}
                            className="btn btn-danger"
                        >
                            Pause Trading
                        </button>
                        <button
                            onClick={() => handleDrawdownToggle(false)}
                            className="btn btn-secondary"
                        >
                            Resume Trading
                        </button>
                    </div>
                    <p className={`text-xs ${drawdownHalt ? 'text-red-400' : 'text-green-400'}`}>
                        Status: {drawdownHalt ? 'PAUSED' : 'ACTIVE'}
                    </p>
                </div>
            </div>

            {result && (
                <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-2">Latest Result</h3>
                    {result.success ? (
                        <p className="text-green-400 text-sm">Success. TX: {result.txHash || 'Pending'}</p>
                    ) : (
                        <div className="text-sm text-red-400 space-y-1">
                            <p>{result.policyBreach?.reason || result.error || 'Action denied'}</p>
                            {result.issues && <p>Issues: {result.issues.join(', ')}</p>}
                            {result.denials && <p>Denials: {result.denials.map((d) => d.name).join(', ')}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
