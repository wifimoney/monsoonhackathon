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

export interface ActionIntent {
    type: 'SPOT_MARKET_ORDER' | 'SPOT_LIMIT_ORDER';
    market: string;
    side: 'BUY' | 'SELL';
    notionalUsd: number;
    maxSlippageBps: number;
    validForSeconds: number;
    rationale: string[];
    riskNotes: string[];
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

export interface GuardrailsConfig {
    allowedMarkets: string[];
    maxPerTx: number;
    cooldownSeconds: number;
    maxSlippageBps: number;
}

export interface GuardrailsResult {
    passed: boolean;
    issues: string[];
    warnings: string[];
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
