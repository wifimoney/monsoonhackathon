// ============================================
// Hyperliquid Market Types
// ============================================

export interface HyperliquidMarket {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    price: number;
    volume24h: number;
    openInterest: number;
    fundingRate: number;
    spread: number;
    tags: string[];
}

export interface MarketMatch {
    symbol: string;
    market: HyperliquidMarket;
    score: number;
    relevanceScore: number;
    liquidityScore: number;
    riskScore: number;
    matchReasons: string[];
}

// ============================================
// Action Intent Types
// ============================================

// ============================================
// Action Intent Types
// ============================================

export type ActionIntent =
    | {
        type: 'SPOT_MARKET_ORDER' | 'SPOT_LIMIT_ORDER';
        market: string;
        side: 'BUY' | 'SELL';
        notionalUsd: number;
        maxSlippageBps: number;
        validForSeconds: number;
        rationale: string[];
        riskNotes: string[];
    }
    | {
        type: 'SPOT_BUY';
        market: string;
        amount: number;
    }
    | {
        type: 'SPOT_SELL';
        market: string;
        amount: number;
    }
    | {
        type: 'TRANSFER';
        amount: number;
        token: string;
        to: string;
    };

export interface TradePreview {
    intent: ActionIntent;
    matches: MarketMatch[];
    estimatedPrice: number;
    estimatedFees: number;
    guardrailsCheck: {
        passed: boolean;
        issues: string[];
    };
}

// ============================================
// Guardrails Types
// ============================================

import type { GuardiansConfig, GuardianCheckResult } from '@/guardians/types';

// ============================================
// Guardrails Types
// ============================================

export type { GuardiansConfig, GuardianCheckResult };


export interface MonsoonAgentConfig {
    accountId: string;
    guardrails: GuardiansConfig;
}

export interface GuardrailsResult {
    passed: boolean;
    issues: string[];
    warnings: string[];
    denials?: any[]; // Allow generic denials for compatibility
}

export interface ExecutionResult {
    success: boolean;
    stage: string;
    txHash?: string;
    intent: ActionIntent;
    error?: string;
    policyBreach?: any;
}

export interface PreCheckResult {
    valid: boolean;
    reason?: string;
}

// ============================================
// Chat Message Types
// ============================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    data?: {
        intent?: any;
        matches?: MarketMatch[];
        actionIntent?: ActionIntent;
        guardrailsCheck?: GuardrailsResult;
        policyBreach?: any;
    };
    timestamp: number;
}
