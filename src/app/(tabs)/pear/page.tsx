'use client';

import { useState } from 'react';

type ActionResult = {
    success?: boolean;
    txHash?: string;
    error?: string;
    issues?: string[];
    denials?: Array<{ name: string; reason: string }>;
    policyBreach?: { reason: string };
};

type ReportEntry = {
    id: string;
    timestamp: number;
    actionType: string;
    status: string;
    market?: string;
    notionalUsd?: number;
    reason?: string;
};

const MARKETS = ['GOLD', 'OIL'];

export default function PearPage() {
    const [market, setMarket] = useState('GOLD');
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [size, setSize] = useState(100);
    const [takeProfit, setTakeProfit] = useState(2800);
    const [stopLoss, setStopLoss] = useState(2500);
    const [result, setResult] = useState<ActionResult | null>(null);
    const [report, setReport] = useState<ReportEntry[]>([]);

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

    const fetchReport = async () => {
        const res = await fetch('/api/pear/report?limit=10');
        const data = await res.json();
        setReport(data.entries || []);
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold">Pear Trade Execution</h2>
                <p className="text-[var(--muted)] mt-1">
                    Open, close, and manage TP/SL with Salt guardrails.
                </p>
            </header>

            <div className="grid grid-cols-2 gap-6">
                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Open / Close</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <select
                            value={market}
                            onChange={(e) => setMarket(e.target.value)}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            {MARKETS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                        <select
                            value={side}
                            onChange={(e) => setSide(e.target.value as 'BUY' | 'SELL')}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        >
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                        </select>
                        <input
                            type="number"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction('/api/pear/open', { market, side, size })}
                            className="btn btn-accent"
                        >
                            Open Position
                        </button>
                        <button
                            onClick={() => handleAction('/api/pear/close', { market, side, size })}
                            className="btn btn-secondary"
                        >
                            Close Position
                        </button>
                    </div>
                </div>

                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">TP / SL</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="number"
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                        <input
                            type="number"
                            value={stopLoss}
                            onChange={(e) => setStopLoss(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction('/api/pear/set-tp', { market, takeProfit })}
                            className="btn btn-accent"
                        >
                            Set TP
                        </button>
                        <button
                            onClick={() => handleAction('/api/pear/set-sl', { market, stopLoss })}
                            className="btn btn-danger"
                        >
                            Set SL
                        </button>
                    </div>
                </div>
            </div>

            <div className="card space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Pear Report</h3>
                    <button onClick={fetchReport} className="btn btn-secondary">Refresh</button>
                </div>
                {report.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">No pear actions recorded yet.</p>
                ) : (
                    <div className="space-y-2 text-xs">
                        {report.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between border-b border-[var(--card-border)] pb-2">
                                <span>{entry.actionType.replace('pear_', '').toUpperCase()} {entry.market}</span>
                                <span className="text-[var(--muted)]">{entry.status}</span>
                            </div>
                        ))}
                    </div>
                )}
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
