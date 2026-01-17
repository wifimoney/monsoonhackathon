'use client';

import type { ActionIntent, MarketMatch, GuardrailsResult } from '@/agent/types';

interface TradePreviewProps {
    data: {
        actionIntent: ActionIntent;
        matches: MarketMatch[];
        guardrailsCheck: GuardrailsResult | null;
    } | null;
    onExecute: () => void;
    isLoading: boolean;
}

export function TradePreview({ data, onExecute, isLoading }: TradePreviewProps) {
    if (!data) return null;

    const { actionIntent, matches, guardrailsCheck } = data;

    // Default to passed if no check results yet
    const guardrailsPassed = guardrailsCheck?.passed ?? true;
    const warnings = guardrailsCheck?.warnings || [];
    const issues = guardrailsCheck?.issues || [];
    const hasIssues = !guardrailsPassed;

    // Safely extract properties from Union type
    const market = 'market' in actionIntent ? actionIntent.market : 'N/A';
    const side = 'side' in actionIntent ? actionIntent.side : undefined;
    const notionalUsd = 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0);
    const maxSlippage = 'maxSlippageBps' in actionIntent ? actionIntent.maxSlippageBps : 0;
    const rationale = 'rationale' in actionIntent ? actionIntent.rationale : [];
    const riskNotes = 'riskNotes' in actionIntent ? actionIntent.riskNotes : [];
    const typeLabel = actionIntent.type.replace(/_/g, ' ');

    return (
        <div className="card flex flex-col">
            <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Trade Preview</h3>

            {/* Main details */}
            <div className="space-y-3">
                <Row label="Type" value={typeLabel} />
                {market !== 'N/A' && <Row label="Market" value={market} />}
                {side && (
                    <Row
                        label="Side"
                        value={side}
                        valueClass={side === 'BUY' ? 'text-green-400' : 'text-red-400'}
                    />
                )}
                <Row label="Size" value={`$${notionalUsd}`} highlight />
                {maxSlippage > 0 && <Row label="Max Slippage" value={`${maxSlippage / 100}%`} />}
            </div>

            {/* Rationale */}
            {rationale && rationale.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                    <p className="text-xs text-[var(--muted)] mb-2">Why this trade:</p>
                    <ul className="text-xs text-white/70 space-y-1">
                        {rationale.map((r: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                                <span className="text-green-400">✓</span> {r}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Risk notes */}
            {riskNotes && riskNotes.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                    <p className="text-xs text-yellow-400 flex items-center gap-1">
                        <span>⚠️</span> {riskNotes.join(' | ')}
                    </p>
                </div>
            )}

            {/* Guardrails issues */}
            {hasIssues && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <p className="text-xs text-red-400 font-medium mb-1">Guardrails issue:</p>
                    <ul className="text-xs text-red-300">
                        {issues.map((issue: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                                <span>✗</span> {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Guardrails warnings */}
            {warnings.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/10 border border-yellow-800/30 rounded">
                    <ul className="text-xs text-yellow-400/80">
                        {warnings.map((w: string, i: number) => (
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
