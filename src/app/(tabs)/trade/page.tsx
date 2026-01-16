'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TerminalOutput, useTerminal } from '@/components/TerminalOutput';

const STRATEGIES = [
    { id: 'chorus-one', name: 'Chorus One', description: 'Direct staking on Ethereum', yield: '4.2%' },
    { id: 'somnia', name: 'Somnia', description: 'Delegate stake to validators', yield: '5.8%' },
    { id: 'aave', name: 'AAVE', description: 'Deposit to lending pools', yield: '3.1%' },
    { id: 'hyperswap', name: 'HyperSwap', description: 'AMM liquidity provision', yield: '12.5%' },
];

export default function TradePage() {
    const { isConnected, address } = useAccount();
    const { lines, addLine, clear } = useTerminal();
    const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
    const [amount, setAmount] = useState('0.1');
    const [isExecuting, setIsExecuting] = useState(false);

    const handleExecute = async () => {
        if (!selectedStrategy || !amount) return;

        setIsExecuting(true);
        clear();

        const strategy = STRATEGIES.find(s => s.id === selectedStrategy);

        addLine(`Initializing ${strategy?.name} strategy...`, 'info');
        await sleep(500);

        addLine(`Connected wallet: ${address?.slice(0, 10)}...`, 'default');
        await sleep(300);

        addLine(`Amount: ${amount} ETH`, 'default');
        await sleep(300);

        addLine('PROPOSE: Submitting transaction to Salt orchestration...', 'info');
        await sleep(800);

        addLine('SIGNING: Collecting MPC signatures...', 'info');
        await sleep(1000);

        // Simulate policy check - randomly succeed or fail for demo
        const policyPassed = Math.random() > 0.3;

        if (policyPassed) {
            addLine('✓ Policy check passed', 'success');
            await sleep(500);

            addLine('COMBINE: Aggregating signatures...', 'info');
            await sleep(700);

            addLine('BROADCAST: Submitting to network...', 'info');
            await sleep(1000);

            const fakeTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
            addLine(`✓ Transaction broadcasted: ${fakeTxHash.slice(0, 22)}...`, 'success');
            addLine(`✓ Strategy ${strategy?.name} executed successfully!`, 'success');
        } else {
            addLine('✗ PROPOSE->END Policy breach detected', 'error');
            addLine(`✗ Transaction rejected: Amount ${amount} ETH exceeds daily limit`, 'error');
            addLine('Guardrail prevented unauthorized transaction', 'warning');
        }

        setIsExecuting(false);
    };

    if (!isConnected) {
        return (
            <div className="card text-center py-12">
                <div className="text-6xl mb-4">🔗</div>
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-[var(--muted)]">
                    Please connect your wallet to access trading functions.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Execute Strategy</h2>
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span className="status-dot connected" />
                    Ready to trade
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Strategy Selection */}
                <div className="space-y-4">
                    <h3 className="font-semibold">Select Strategy</h3>
                    <div className="grid gap-3">
                        {STRATEGIES.map((strategy) => (
                            <button
                                key={strategy.id}
                                onClick={() => setSelectedStrategy(strategy.id)}
                                className={`card text-left transition-all hover:border-[var(--primary)] ${selectedStrategy === strategy.id
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                        : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">{strategy.name}</h4>
                                        <p className="text-sm text-[var(--muted)]">{strategy.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[var(--accent)] font-mono font-bold">{strategy.yield}</div>
                                        <div className="text-xs text-[var(--muted)]">APY</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Amount Input */}
                    <div className="card">
                        <label className="block font-semibold mb-2">Amount (ETH)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0.01"
                            step="0.01"
                            className="w-full bg-black border border-[var(--card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    <button
                        onClick={handleExecute}
                        disabled={!selectedStrategy || !amount || isExecuting}
                        className="btn btn-accent w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExecuting ? (
                            <>
                                <span className="animate-spin">⟳</span>
                                Executing...
                            </>
                        ) : (
                            'Execute Strategy'
                        )}
                    </button>
                </div>

                {/* Terminal Output */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Salt CLI Output</h3>
                        {lines.length > 0 && (
                            <button
                                onClick={clear}
                                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <TerminalOutput lines={lines} title="salt-autofi" />
                </div>
            </div>
        </div>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
