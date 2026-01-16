// ============================================
// Action Intent Types
// ============================================

export type ActionIntent =
    | { type: 'SPOT_BUY'; market: string; amount: number; }
    | { type: 'SPOT_SELL'; market: string; amount: number; }
    | { type: 'TRANSFER'; to: string; token: string; amount: number; };

// ============================================
// Agent Configuration
// ============================================

export interface MonsoonAgentConfig {
    accountId: string;
    guardrails: {
        allowedMarkets: string[];
        maxPerTx: number;
        cooldownSeconds: number;
    };
}

// ============================================
// Execution Results
// ============================================

export type ExecutionStage =
    | 'pre_check'
    | 'salt_policy'
    | 'broadcast'
    | 'confirmed';

export interface ExecutionResult {
    success: boolean;
    stage: ExecutionStage;
    txHash?: string;
    intent?: ActionIntent;
    error?: string;
    policyBreach?: {
        denied: boolean;
        rejectedPolicies?: any[];
        reason: string;
        details?: any;
    };
}

// ============================================
// Pre-check Results
// ============================================

export interface PreCheckResult {
    valid: boolean;
    reason?: string;
}
