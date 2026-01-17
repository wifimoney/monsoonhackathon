'use client';

interface RejectedPolicy {
    policyId?: string;
    name?: string;
    reason?: string;
    limit?: string | number;
    actual?: string | number;
}

interface PolicyBreach {
    denied: boolean;
    reason: string;
    rule: string;
    rejectedPolicies?: RejectedPolicy[];
    details?: Record<string, unknown>;
}

interface Props {
    breach: PolicyBreach;
    className?: string;
}

export function PolicyDenialDisplay({ breach, className = '' }: Props) {
    const policies = breach.rejectedPolicies || [
        { name: breach.rule, reason: breach.reason, ...breach.details }
    ];

    return (
        <div className={`bg-[var(--danger)]/10 border border-[var(--danger)]/50 rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[var(--danger)] text-xl">✕</span>
                <span className="text-[var(--danger)] font-semibold text-lg">
                    Blocked by Policy
                </span>
                <span className="text-[var(--accent)] text-sm ml-2">✓ Guardrails Working!</span>
            </div>

            {/* Rejected Policies */}
            <div className="space-y-2">
                {policies.map((policy, i) => (
                    <div
                        key={policy.policyId || i}
                        className="bg-black/30 rounded-lg p-3"
                    >
                        <p className="text-white font-medium text-sm">
                            {policy.name || policy.policyId || breach.rule}
                        </p>
                        {policy.reason && (
                            <p className="text-[var(--muted)] text-xs mt-1">
                                {policy.reason}
                            </p>
                        )}
                        {(policy.limit !== undefined && policy.actual !== undefined) && (
                            <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-[var(--muted)]">
                                    Limit: <span className="text-white">{policy.limit}</span>
                                </span>
                                <span className="text-[var(--muted)]">
                                    Attempted: <span className="text-[var(--danger)]">{policy.actual}</span>
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Details JSON if present */}
            {breach.details && Object.keys(breach.details).length > 0 && (
                <div className="mt-3 bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-[var(--muted)] mb-1">Policy Details:</p>
                    <pre className="text-xs text-[var(--muted)] overflow-auto">
                        {JSON.stringify(breach.details, null, 2)}
                    </pre>
                </div>
            )}

            {/* Footer */}
            <p className="text-[var(--muted)] text-xs mt-3 pt-3 border-t border-[var(--card-border)]">
                The agent proposed this action, but Salt denied it based on your guardrails.
            </p>
        </div>
    );
}
