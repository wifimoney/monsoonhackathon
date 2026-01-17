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

const MARKETS = ['GOLD', 'OIL'];

export default function OrderbookPage() {
    const [market, setMarket] = useState('GOLD');
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [size, setSize] = useState(100);
    const [price, setPrice] = useState(2650);
    const [orderId, setOrderId] = useState('');
    const [result, setResult] = useState<ActionResult | null>(null);

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

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold">Orderbook Executor</h2>
                <p className="text-[var(--muted)] mt-1">
                    Place and cancel orderbook actions with Salt guardrails.
                </p>
            </header>

            <div className="grid grid-cols-2 gap-6">
                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Place Order</h3>
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
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)]"
                        />
                    </div>
                    <button
                        onClick={() => handleAction('/api/orderbook/place', { market, side, size, price })}
                        className="btn btn-accent"
                    >
                        Submit Limit Order
                    </button>
                </div>

                <div className="card space-y-4">
                    <h3 className="text-sm font-semibold text-white">Cancel Order</h3>
                    <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="Order ID"
                        className="bg-black text-white text-sm rounded p-2 border border-[var(--card-border)] w-full"
                    />
                    <button
                        onClick={() => handleAction('/api/orderbook/cancel', { market, orderId })}
                        className="btn btn-danger"
                    >
                        Cancel Order
                    </button>
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
