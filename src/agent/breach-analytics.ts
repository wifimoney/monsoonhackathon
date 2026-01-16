import type { ActionIntent } from './types';

// ============ TYPES ============
export interface PolicyBreachEvent {
    timestamp: number;
    policyName: string;
    policyType: 'allowlist' | 'amount_limit' | 'cooldown' | 'slippage' | 'salt_policy' | 'other';
    actionIntent: ActionIntent;
    details?: Record<string, any>;
}

export interface BreachAnalytics {
    total: number;
    last24h: number;
    lastWeek: number;
    byType: Record<string, number>;
    byName: Record<string, number>;
    byMarket: Record<string, number>;
    mostCommonPolicy: string | null;
    mostCommonCount: number;
    recentBreaches: PolicyBreachEvent[];
}

// ============ STORAGE ============
const breachHistory: PolicyBreachEvent[] = [];

// ============ FUNCTIONS ============
export function recordBreach(event: Omit<PolicyBreachEvent, 'timestamp'>): void {
    breachHistory.unshift({
        ...event,
        timestamp: Date.now(),
    });
    // Keep last 200
    if (breachHistory.length > 200) breachHistory.pop();
}

export function getBreachAnalytics(): BreachAnalytics {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const last24h = breachHistory.filter(b => b.timestamp > oneDayAgo);
    const lastWeek = breachHistory.filter(b => b.timestamp > oneWeekAgo);

    // Group by policy type
    const byType = lastWeek.reduce((acc, b) => {
        acc[b.policyType] = (acc[b.policyType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Group by policy name
    const byName = lastWeek.reduce((acc, b) => {
        acc[b.policyName] = (acc[b.policyName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Group by market
    const byMarket = lastWeek.reduce((acc, b) => {
        const market = b.actionIntent.market.split('/')[0];
        acc[market] = (acc[market] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Find most common breach
    const entries = Object.entries(byName);
    const mostCommon = entries.length > 0
        ? entries.sort(([, a], [, b]) => b - a)[0]
        : null;

    return {
        total: breachHistory.length,
        last24h: last24h.length,
        lastWeek: lastWeek.length,
        byType,
        byName,
        byMarket,
        mostCommonPolicy: mostCommon ? mostCommon[0] : null,
        mostCommonCount: mostCommon ? mostCommon[1] : 0,
        recentBreaches: breachHistory.slice(0, 10),
    };
}

export function clearBreachHistory(): void {
    breachHistory.length = 0;
}

// Helper to record a breach from a guardrails result
export function recordGuardrailsBreach(
    intent: ActionIntent,
    issues: string[]
): void {
    for (const issue of issues) {
        let policyType: PolicyBreachEvent['policyType'] = 'other';
        let policyName = issue;

        if (issue.toLowerCase().includes('allowlist') || issue.toLowerCase().includes('market')) {
            policyType = 'allowlist';
            policyName = 'Market Allowlist';
        } else if (issue.toLowerCase().includes('size') || issue.toLowerCase().includes('exceeds')) {
            policyType = 'amount_limit';
            policyName = 'Transaction Limit';
        } else if (issue.toLowerCase().includes('cooldown')) {
            policyType = 'cooldown';
            policyName = 'Cooldown';
        } else if (issue.toLowerCase().includes('slippage')) {
            policyType = 'slippage';
            policyName = 'Slippage Limit';
        }

        recordBreach({
            policyName,
            policyType,
            actionIntent: intent,
            details: { reason: issue },
        });
    }
}

export function recordSaltBreach(
    intent: ActionIntent,
    reason: string,
    policies?: string[]
): void {
    recordBreach({
        policyName: 'Salt Policy',
        policyType: 'salt_policy',
        actionIntent: intent,
        details: { reason, policies },
    });
}
