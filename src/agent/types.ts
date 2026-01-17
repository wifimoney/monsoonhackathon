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

// Base type for market-based intents
interface MarketIntent {
    market: string;
    notionalUsd: number;
    side: 'BUY' | 'SELL';
}

export type ActionIntent =
    | (MarketIntent & {
        type: 'SPOT_MARKET_ORDER' | 'SPOT_LIMIT_ORDER';
        maxSlippageBps: number;
        validForSeconds: number;
        rationale: string[];
        riskNotes: string[];
    })
    | (MarketIntent & {
        type: 'SPOT_BUY';
        side: 'BUY';
    })
    | (MarketIntent & {
        type: 'SPOT_SELL';
        side: 'SELL';
    })
    | {
        type: 'TRANSFER';
        amount: number;
        token: string;
        to: string;
    };

// Helper type guard for market intents
export function isMarketIntent(intent: ActionIntent): intent is Exclude<ActionIntent, { type: 'TRANSFER' }> {
    return intent.type !== 'TRANSFER';
}

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
