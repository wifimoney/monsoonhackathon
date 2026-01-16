'use client';

import type { ActionIntent, MarketMatch, GuardrailsResult } from '@/agent/types';

interface Props {
    preview: {
        actionIntent: ActionIntent;
        matches: MarketMatch[];
        guardrailsCheck: GuardrailsResult | null;
    } | null;
    onExecute: () => void;
    isLoading: boolean;
}

export function TradePreview({ preview, onExecute, isLoading }: Props) {
    if (!preview) {
        return (
            <div className="card h-full flex flex-col justify-center items-center text-center p-6">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-sm font-medium text-white mb-2">Trade Preview</h3>
                <p className="text-[var(--muted)] text-sm">
                    Describe a trade intent in the chat to see a preview here.
                </p>
            </div>
        );
    }

    const { actionIntent, guardrailsCheck } = preview;
    const hasIssues = guardrailsCheck && !guardrailsCheck.passed;

    return (
        <div className="card flex flex-col">
            <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Trade Preview</h3>

            {/* Main details */}
            <div className="space-y-3">
                <Row label="Market" value={actionIntent.market} />
                <Row
                    label="Side"
                    value={actionIntent.side}
                    valueClass={actionIntent.side === 'BUY' ? 'text-green-400' : 'text-red-400'}
                />
                <Row label="Size" value={`$${actionIntent.notionalUsd}`} highlight />
                <Row label="Max Slippage" value={`${actionIntent.maxSlippageBps / 100}%`} />
                <Row label="Type" value={actionIntent.type.replace(/_/g, ' ')} />
            </div>

            {/* Rationale */}
            {actionIntent.rationale?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-2">Why this trade:</p>
                    <ul className="text-xs text-white/70 space-y-1">
                        {actionIntent.rationale.map((r: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                                <span className="text-green-400">✓</span> {r}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Risk notes */}
            {actionIntent.riskNotes?.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                    <p className="text-xs text-yellow-400 flex items-center gap-1">
                        <span>⚠️</span> {actionIntent.riskNotes.join(' | ')}
                    </p>
                </div>
            )}

            {/* Guardrails issues */}
            {hasIssues && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <p className="text-xs text-red-400 font-medium mb-1">Guardrails issue:</p>
                    <ul className="text-xs text-red-300">
                        {guardrailsCheck.issues.map((issue: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                                <span>✗</span> {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Guardrails warnings */}
            {guardrailsCheck?.warnings?.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/10 border border-yellow-800/30 rounded">
                    <ul className="text-xs text-yellow-400/80">
                        {guardrailsCheck.warnings.map((w: string, i: number) => (
                            <li key={i}>⚡ {w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Execute button */}
            <button
                onClick={onExecute}
                disabled={isLoading || hasIssues}
                className={`w-full mt-4 font-medium py-3 px-4 rounded-lg transition-colors ${hasIssues
                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⟳</span> Executing...
                    </span>
                ) : hasIssues ? (
                    'Fix Issues to Execute'
                ) : (
                    '✓ Approve & Execute'
                )}
            </button>
        </div>
    );
}

function Row({
    label,
    value,
    valueClass = 'text-white',
    highlight = false,
}: {
    label: string;
    value: string;
    valueClass?: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[var(--muted)] text-sm">{label}</span>
            <span className={`text-sm font-medium ${valueClass} ${highlight ? 'text-lg' : ''}`}>
                {value}
            </span>
        </div>
    );
}
