'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TerminalOutput, useTerminal } from '@/components/TerminalOutput';

interface Policy {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    value?: string;
}

const DEFAULT_POLICIES: Policy[] = [
    { id: 'max-tx', name: 'Max Transaction Value', description: 'Maximum value per single transaction', enabled: true, value: '1.0 ETH' },
    { id: 'daily-limit', name: 'Daily Spending Limit', description: 'Maximum total value transferred per day', enabled: true, value: '5.0 ETH' },
    { id: 'whitelist', name: 'Recipient Whitelist', description: 'Only allow transfers to approved addresses', enabled: false },
    { id: 'contract-filter', name: 'Contract Interaction Filter', description: 'Block interactions with unverified contracts', enabled: true },
    { id: 'time-lock', name: 'Time Lock', description: 'Require multi-sig approval for large transactions', enabled: false },
];

export default function GuardrailsPage() {
    const { isConnected } = useAccount();
    const { lines, addLine, clear } = useTerminal();
    const [policies, setPolicies] = useState(DEFAULT_POLICIES);
    const [isChecking, setIsChecking] = useState(false);

    const togglePolicy = (id: string) => {
        setPolicies(prev => prev.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
        ));
    };

    const runSanityCheck = async () => {
        setIsChecking(true);
        clear();

        addLine('Starting Salt CLI sanity check...', 'info');
        await sleep(300);

        addLine('$ cd /Users/elibelilty/Documents/GitHub/salt-autofi', 'default');
        await sleep(200);

        addLine('$ npm start', 'default');
        await sleep(500);

        addLine('Loading environment variables...', 'info');
        await sleep(300);

        addLine('ORCHESTRATION_NETWORK_RPC_NODE_URL: https://sepolia-rollup.arbitrum.io/rpc', 'default');
        addLine('BROADCASTING_NETWORK_ID: 421614 (Arbitrum Sepolia)', 'default');
        addLine('AGENT: SOMNIA', 'default');
        await sleep(400);

        addLine('Initializing Salt SDK (TESTNET environment)...', 'info');
        await sleep(600);

        addLine('✓ Salt SDK initialized', 'success');
        await sleep(300);

        addLine('Authenticating signer...', 'info');
        await sleep(500);

        addLine('✓ Signer authenticated', 'success');
        await sleep(300);

        addLine('Setting up nudge listener...', 'info');
        await sleep(400);

        addLine('✓ Nudge listener active', 'success');
        await sleep(300);

        addLine('AGENT STATE: watching', 'info');
        addLine('', 'default');
        addLine('Salt CLI is running successfully!', 'success');
        addLine('Active policies:', 'info');

        policies.filter(p => p.enabled).forEach(p => {
            addLine(`  ✓ ${p.name}${p.value ? `: ${p.value}` : ''}`, 'success');
        });

        addLine('', 'default');
        addLine('Ready to process transactions...', 'info');

        setIsChecking(false);
    };

    const simulateDeniedTx = async () => {
        setIsChecking(true);
        clear();

        addLine('Simulating transaction that violates policy...', 'warning');
        await sleep(300);

        addLine('PROPOSE: Submitting tx value=10 ETH to=0x1234...abcd', 'info');
        await sleep(500);

        addLine('Checking policies...', 'info');
        await sleep(400);

        addLine('  - Max Transaction Value (1.0 ETH): FAILED', 'error');
        addLine('  - Daily Spending Limit (5.0 ETH): FAILED', 'error');
        await sleep(300);

        addLine('', 'default');
        addLine('✗ PROPOSE->END Policy breach', 'error');
        addLine('Error: Transaction value 10 ETH exceeds maximum allowed 1.0 ETH', 'error');
        addLine('', 'default');
        addLine('Transaction DENIED by guardrails', 'error');

        setIsChecking(false);
    };

    const simulateAllowedTx = async () => {
        setIsChecking(true);
        clear();

        addLine('Simulating compliant transaction...', 'info');
        await sleep(300);

        addLine('PROPOSE: Submitting tx value=0.5 ETH to=0xABC...123', 'info');
        await sleep(500);

        addLine('Checking policies...', 'info');
        await sleep(400);

        addLine('  - Max Transaction Value (1.0 ETH): PASSED ✓', 'success');
        addLine('  - Daily Spending Limit (5.0 ETH): PASSED ✓', 'success');
        addLine('  - Contract Interaction Filter: PASSED ✓', 'success');
        await sleep(300);

        addLine('', 'default');
        addLine('SIGNING: Collecting MPC signatures...', 'info');
        await sleep(700);

        addLine('COMBINE: Aggregating partial signatures...', 'info');
        await sleep(500);

        addLine('BROADCAST: Submitting to Arbitrum Sepolia...', 'info');
        await sleep(800);

        const fakeTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        addLine(`Transaction hash: ${fakeTxHash}`, 'success');
        addLine('', 'default');
        addLine('Transaction ALLOWED and broadcasted ✓', 'success');

        setIsChecking(false);
    };

    if (!isConnected) {
        return (
            <div className="card text-center py-12">
                <div className="text-6xl mb-4">🛡️</div>
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-[var(--muted)]">
                    Please connect your wallet to configure guardrails.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Transaction Guardrails</h2>
                    <p className="text-[var(--muted)]">Configure policies that protect your accounts</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Policies */}
                <div className="space-y-4">
                    <h3 className="font-semibold">Active Policies</h3>
                    <div className="space-y-3">
                        {policies.map((policy) => (
                            <div
                                key={policy.id}
                                className={`card flex items-center justify-between ${policy.enabled ? 'border-[var(--accent)]/30' : 'opacity-60'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold">{policy.name}</h4>
                                        {policy.value && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
                                                {policy.value}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--muted)]">{policy.description}</p>
                                </div>
                                <button
                                    onClick={() => togglePolicy(policy.id)}
                                    className={`w-12 h-6 rounded-full transition-colors ${policy.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${policy.enabled ? 'translate-x-6' : 'translate-x-0.5'
                                        }`} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={runSanityCheck}
                            disabled={isChecking}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            {isChecking ? '...' : 'Sanity Check'}
                        </button>
                        <button
                            onClick={simulateAllowedTx}
                            disabled={isChecking}
                            className="btn btn-accent disabled:opacity-50"
                        >
                            {isChecking ? '...' : 'Simulate ✓'}
                        </button>
                        <button
                            onClick={simulateDeniedTx}
                            disabled={isChecking}
                            className="btn btn-danger disabled:opacity-50"
                        >
                            {isChecking ? '...' : 'Simulate ✗'}
                        </button>
                    </div>
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
                    <TerminalOutput lines={lines} title="guardrails-check" />
                </div>
            </div>
        </div>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
