import type { ActionIntent } from './types';

// ============ TYPES ============
export type AutonomyLevel = 0 | 1 | 2 | 3;

export interface AutonomyConfig {
    level: AutonomyLevel;

    // Level 1 specific
    autoApproveMaxSize?: number;
    autoApproveMarkets?: string[];

    // Level 2 specific
    trustSaltCompletely?: boolean;

    // Level 3 specific
    acknowledgedRisks?: boolean;

    // Override: always require approval for these
    alwaysRequireApproval?: {
        marketsAboveSize?: Record<string, number>;
        sides?: ('BUY' | 'SELL')[];
    };
}

export interface AutonomyDecision {
    canAutoExecute: boolean;
    requiresApproval: boolean;
    reason: string;
    riskLevel: 'low' | 'medium' | 'high';
    warnings?: string[];
}

const DEFAULT_CONFIG: AutonomyConfig = {
    level: 1,
    autoApproveMaxSize: 50,
    autoApproveMarkets: ['GOLD', 'OIL'],
};

// ============ DECISION FUNCTION ============
export function checkAutonomy(
    intent: ActionIntent,
    config: AutonomyConfig = DEFAULT_CONFIG
): AutonomyDecision {
    const warnings: string[] = [];

    // Level 0: Always require approval
    if (config.level === 0) {
        return {
            canAutoExecute: false,
            requiresApproval: true,
            reason: 'Manual mode: all actions require approval',
            riskLevel: 'low',
        };
    }

    // Handle TRANSFER intents separately - they don't have a market
    if (intent.type === 'TRANSFER') {
        return {
            canAutoExecute: false,
            requiresApproval: true,
            reason: 'Transfer actions require manual approval',
            riskLevel: 'medium',
            warnings: [`Transfer of ${intent.amount} ${intent.token} to ${intent.to}`],
        };
    }

    const marketSymbol = intent.market.split('/')[0];

    // Check override rules first
    if (config.alwaysRequireApproval) {
        const { marketsAboveSize, sides } = config.alwaysRequireApproval;

        if (marketsAboveSize?.[marketSymbol] !== undefined) {
            if (intent.notionalUsd > marketsAboveSize[marketSymbol]) {
                return {
                    canAutoExecute: false,
                    requiresApproval: true,
                    reason: `${marketSymbol} above $${marketsAboveSize[marketSymbol]} requires approval`,
                    riskLevel: 'medium',
                };
            }
        }

        if (sides?.includes(intent.side)) {
            return {
                canAutoExecute: false,
                requiresApproval: true,
                reason: `${intent.side} orders require approval`,
                riskLevel: 'medium',
            };
        }
    }

    // Level 1: Semi-auto with thresholds
    if (config.level === 1) {
        const withinSize = intent.notionalUsd <= (config.autoApproveMaxSize || 50);
        const withinMarkets = (config.autoApproveMarkets || []).includes(marketSymbol);

        if (withinSize && withinMarkets) {
            return {
                canAutoExecute: true,
                requiresApproval: false,
                reason: `Auto-approved: $${intent.notionalUsd} ${marketSymbol} within limits`,
                riskLevel: 'low',
            };
        }

        const reasons: string[] = [];
        if (!withinSize) reasons.push(`size $${intent.notionalUsd} > $${config.autoApproveMaxSize}`);
        if (!withinMarkets) reasons.push(`${marketSymbol} not in auto-approve list`);

        return {
            canAutoExecute: false,
            requiresApproval: true,
            reason: `Requires approval: ${reasons.join(', ')}`,
            riskLevel: 'medium',
        };
    }

    // Level 2: Trust Salt policies completely
    if (config.level === 2) {
        if (intent.notionalUsd > 200) {
            warnings.push('Large position - Salt will enforce limits');
        }

        return {
            canAutoExecute: true,
            requiresApproval: false,
            reason: 'Auto-bounded mode: Salt policies are the only gatekeeper',
            riskLevel: 'medium',
            warnings,
        };
    }

    // Level 3: Full auto (dangerous)
    if (config.level === 3) {
        if (!config.acknowledgedRisks) {
            return {
                canAutoExecute: false,
                requiresApproval: true,
                reason: 'Full auto requires risk acknowledgment',
                riskLevel: 'high',
                warnings: ['Full auto mode gives agent maximum freedom'],
            };
        }

        warnings.push('⚠️ Full auto mode active - agent has maximum freedom');

        return {
            canAutoExecute: true,
            requiresApproval: false,
            reason: 'Full auto: Salt is the only constraint',
            riskLevel: 'high',
            warnings,
        };
    }

    // Default fallback
    return {
        canAutoExecute: false,
        requiresApproval: true,
        reason: 'Unknown autonomy level',
        riskLevel: 'high',
    };
}

// ============ AUTO-EXECUTION LOG ============
interface AutoExecutionEntry {
    timestamp: number;
    intent: ActionIntent;
    decision: AutonomyDecision;
}

const autoExecutionLog: AutoExecutionEntry[] = [];

export function logAutoExecution(intent: ActionIntent, decision: AutonomyDecision): void {
    autoExecutionLog.unshift({ timestamp: Date.now(), intent, decision });
    if (autoExecutionLog.length > 100) autoExecutionLog.pop();
}

export function getAutoExecutionLog(): AutoExecutionEntry[] {
    return autoExecutionLog;
}

export function getDefaultAutonomyConfig(): AutonomyConfig {
    return { ...DEFAULT_CONFIG };
}
