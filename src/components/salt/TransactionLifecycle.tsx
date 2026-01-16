'use client';

import { useEffect, useState } from 'react';

// ============ TYPES ============
export type TransactionStage =
    | 'idle'
    | 'proposed'
    | 'policy_check'
    | 'signing'
    | 'broadcasting'
    | 'confirming'
    | 'confirmed'
    | 'denied'
    | 'failed';

export interface TransactionState {
    stage: TransactionStage;
    startedAt: number;
    completedAt?: number;
    txHash?: string;
    error?: string;
    policyDenial?: {
        reason: string;
        policies: string[];
    };
}

interface Props {
    transaction: TransactionState | null;
}

const STAGES: { key: TransactionStage; label: string; icon: string }[] = [
    { key: 'proposed', label: 'Proposed', icon: '📝' },
    { key: 'policy_check', label: 'Policy Check', icon: '🔐' },
    { key: 'signing', label: 'Signing', icon: '✍️' },
    { key: 'broadcasting', label: 'Broadcasting', icon: '📡' },
    { key: 'confirming', label: 'Confirming', icon: '⏳' },
    { key: 'confirmed', label: 'Confirmed', icon: '✅' },
];

const STAGE_ORDER = ['proposed', 'policy_check', 'signing', 'broadcasting', 'confirming', 'confirmed'];

export function TransactionLifecycle({ transaction }: Props) {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        if (!transaction || transaction.stage === 'idle' || transaction.stage === 'confirmed' || transaction.stage === 'denied' || transaction.stage === 'failed') {
            return;
        }

        const interval = setInterval(() => {
            setElapsedTime(Date.now() - transaction.startedAt);
        }, 100);

        return () => clearInterval(interval);
    }, [transaction]);

    if (!transaction || transaction.stage === 'idle') {
        return (
            <div className="card">
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Transaction Lifecycle</h3>
                <p className="text-[var(--muted)] text-xs">Execute a trade to see the Salt orchestration flow</p>
            </div>
        );
    }

    const currentStageIndex = STAGE_ORDER.indexOf(transaction.stage);
    const isDenied = transaction.stage === 'denied';
    const isFailed = transaction.stage === 'failed';
    const isComplete = transaction.stage === 'confirmed';

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Transaction Lifecycle</h3>
                {!isComplete && !isDenied && !isFailed && (
                    <span className="text-xs text-[var(--muted)]">
                        {(elapsedTime / 1000).toFixed(1)}s
                    </span>
                )}
            </div>

            {/* Stages */}
            <div className="space-y-2">
                {STAGES.map((stage, i) => {
                    const stageIndex = STAGE_ORDER.indexOf(stage.key);
                    const isPast = stageIndex < currentStageIndex;
                    const isCurrent = stage.key === transaction.stage;
                    const isFuture = stageIndex > currentStageIndex;

                    // Handle denial at policy_check
                    const isDeniedAtThisStage = isDenied && stage.key === 'policy_check';
                    const isFailedAtThisStage = isFailed && stageIndex === currentStageIndex;

                    return (
                        <div
                            key={stage.key}
                            className={`flex items-center gap-3 p-2 rounded transition-all ${isDeniedAtThisStage || isFailedAtThisStage
                                    ? 'bg-red-900/30 border border-red-700'
                                    : isPast || (isComplete && stage.key === 'confirmed')
                                        ? 'bg-green-900/20 border border-green-800/50'
                                        : isCurrent
                                            ? 'bg-blue-900/30 border border-blue-700'
                                            : 'bg-black/20 border border-transparent opacity-40'
                                }`}
                        >
                            {/* Icon */}
                            <span className={`text-lg ${isCurrent && !isDeniedAtThisStage ? 'animate-pulse' : ''}`}>
                                {isDeniedAtThisStage ? '🚫' : isFailedAtThisStage ? '❌' : stage.icon}
                            </span>

                            {/* Label */}
                            <span className={`text-sm flex-1 ${isDeniedAtThisStage || isFailedAtThisStage
                                    ? 'text-red-400'
                                    : isPast || (isComplete && stage.key === 'confirmed')
                                        ? 'text-green-400'
                                        : isCurrent
                                            ? 'text-white'
                                            : 'text-[var(--muted)]'
                                }`}>
                                {stage.label}
                            </span>

                            {/* Status indicator */}
                            <div className="w-4">
                                {isPast && !isDeniedAtThisStage && (
                                    <span className="text-green-400 text-xs">✓</span>
                                )}
                                {isCurrent && !isDeniedAtThisStage && !isComplete && (
                                    <span className="w-2 h-2 bg-blue-400 rounded-full inline-block animate-ping" />
                                )}
                                {isDeniedAtThisStage && (
                                    <span className="text-red-400 text-xs">✗</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Denial details */}
            {isDenied && transaction.policyDenial && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <p className="text-red-400 text-xs font-medium mb-1">Policy Denial</p>
                    <p className="text-red-300 text-sm">{transaction.policyDenial.reason}</p>
                    {transaction.policyDenial.policies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {transaction.policyDenial.policies.map((p, i) => (
                                <span key={i} className="text-xs bg-red-800/30 text-red-400 px-2 py-0.5 rounded">
                                    {p}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Success details */}
            {isComplete && transaction.txHash && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <p className="text-green-400 text-xs font-medium mb-1">Transaction Confirmed</p>
                    <p className="text-green-300 text-sm font-mono break-all">
                        {transaction.txHash.slice(0, 10)}...{transaction.txHash.slice(-8)}
                    </p>
                    {transaction.completedAt && (
                        <p className="text-[var(--muted)] text-xs mt-1">
                            Completed in {((transaction.completedAt - transaction.startedAt) / 1000).toFixed(2)}s
                        </p>
                    )}
                </div>
            )}

            {/* Salt badge */}
            <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded">Salt</span>
                <span className="text-xs text-[var(--muted)]">Orchestrating transaction flow</span>
            </div>
        </div>
    );
}
