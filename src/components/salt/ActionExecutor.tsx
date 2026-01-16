'use client';

import { useState } from 'react';

interface PolicyBreach {
    denied: boolean;
    reason: string;
    rule: string;
    details?: Record<string, unknown>;
}

interface ExecutionResult {
    success: boolean;
    txHash?: string;
    denied?: boolean;
    policyBreach?: PolicyBreach;
    error?: string;
    logs?: string[];
}

interface Props {
    accountId?: string;
}

export function ActionExecutor({ accountId }: Props) {
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<ExecutionResult | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // Execute ALLOWED action (small amount)
    const executeAllowedAction = async () => {
        setIsExecuting(true);
        setResult(null);
        setLogs([]);

        try {
            const res = await fetch('/api/salt/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: '0x000000000000000000000000000000000000dEaD', // Burn address for demo
                    token: 'ETH',
                    amount: '0.001', // Small amount, within policy
                    accountId,
                }),
            });

            const data = await res.json();
            setResult(data);
            if (data.logs) setLogs(data.logs);
        } catch (err) {
            setResult({
                success: false,
                error: err instanceof Error ? err.message : 'Execution failed'
            });
        } finally {
            setIsExecuting(false);
        }
    };

    // Execute FORBIDDEN action (triggers policy denial - simulated)
    const executeForbiddenAction = async () => {
        setIsExecuting(true);
        setResult(null);
        setLogs([]);

        // Simulate a policy denial for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1500));

        setLogs([
            'Initiating transfer: 500 USDH to 0x742d...1234',
            'PROPOSE: Submitting transaction to Salt orchestration...',
            '✗ POLICY BREACH: Transaction exceeds maximum allowed value',
        ]);

        setResult({
            success: false,
            denied: true,
            policyBreach: {
                denied: true,
                reason: 'Transaction value (500 USDH) exceeds maximum allowed (250 USDH)',
                rule: 'MAX_TRANSACTION_VALUE',
                details: {
                    requested: 500,
                    maximum: 250,
                    currency: 'USDH',
                },
            },
        });

        setIsExecuting(false);
    };

    return (
        <div className="card">
            <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Test Execution</h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                    onClick={executeAllowedAction}
                    disabled={isExecuting || !accountId}
                    className="btn btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExecuting ? (
                        <>
                            <span className="animate-spin">⟳</span>
                            ...
                        </>
                    ) : (
                        '✓ Run Allowed Action'
                    )}
                </button>

                <button
                    onClick={executeForbiddenAction}
                    disabled={isExecuting}
                    className="btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExecuting ? (
                        <>
                            <span className="animate-spin">⟳</span>
                            ...
                        </>
                    ) : (
                        '✗ Try Forbidden Action'
                    )}
                </button>
            </div>

            {!accountId && (
                <p className="text-[var(--muted)] text-xs mb-4">
                    Connect Salt account first to execute real transactions
                </p>
            )}

            {/* Logs Display */}
            {logs.length > 0 && (
                <div className="terminal mb-4 text-xs">
                    {logs.map((log, i) => (
                        <div
                            key={i}
                            className={`terminal-line ${log.includes('✗') ? 'error' :
                                    log.includes('✓') ? 'success' :
                                        log.includes('PROPOSE') || log.includes('SIGNING') ? 'info' : 'default'
                                }`}
                        >
                            {log}
                        </div>
                    ))}
                </div>
            )}

            {/* Result Display */}
            {result && (
                <div className={`rounded-lg p-4 ${result.success
                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/50'
                        : result.denied
                            ? 'bg-[var(--danger)]/10 border border-[var(--danger)]/50'
                            : 'bg-yellow-500/10 border border-yellow-500/50'
                    }`}>
                    {result.success ? (
                        <SuccessResult txHash={result.txHash} />
                    ) : result.denied ? (
                        <DenialResult breach={result.policyBreach!} />
                    ) : (
                        <ErrorResult error={result.error} />
                    )}
                </div>
            )}
        </div>
    );
}

function SuccessResult({ txHash }: { txHash?: string }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--accent)] text-xl">✓</span>
                <span className="text-[var(--accent)] font-semibold">Transaction Executed</span>
            </div>
            {txHash && (
                <p className="text-[var(--muted)] text-xs font-mono break-all">
                    TX: {txHash}
                </p>
            )}
        </div>
    );
}

function DenialResult({ breach }: { breach: PolicyBreach }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[var(--danger)] text-xl">✕</span>
                <span className="text-[var(--danger)] font-semibold">Blocked by Policy</span>
                <span className="text-[var(--accent)] text-sm ml-2">✓ Guardrails Working!</span>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
                <p className="text-white text-sm mb-2">
                    <span className="text-[var(--muted)]">Reason:</span> {breach.reason}
                </p>
                <p className="text-white text-sm mb-2">
                    <span className="text-[var(--muted)]">Rule violated:</span>{' '}
                    <code className="bg-[var(--danger)]/20 px-1.5 py-0.5 rounded text-xs">{breach.rule}</code>
                </p>
                {breach.details && (
                    <pre className="text-xs text-[var(--muted)] mt-2 overflow-auto bg-black/50 p-2 rounded">
                        {JSON.stringify(breach.details, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

function ErrorResult({ error }: { error?: string }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 text-xl">⚠</span>
                <span className="text-yellow-400 font-semibold">Error</span>
            </div>
            <p className="text-[var(--muted)] text-sm">{error || 'Unknown error'}</p>
        </div>
    );
}
