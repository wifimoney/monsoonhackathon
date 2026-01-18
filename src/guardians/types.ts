import type { ActionIntent } from '@/agent/types';

// ============ GUARDIAN TYPES ============
export type GuardianType =
    | 'spend'
    | 'leverage'
    | 'exposure'
    | 'venue'
    | 'rate'
    | 'timeWindow'
    | 'loss';

export interface GuardianDenial {
    guardian: GuardianType;
    name: string;
    reason: string;
    current?: string | number;
    limit?: string | number;
    severity: 'block' | 'warning';
}

export interface GuardianCheckResult {
    passed: boolean;
    denials: GuardianDenial[];
    warnings: GuardianDenial[];
}

// ============ CONFIG TYPES ============
export interface SpendConfig {
    enabled: boolean;
    maxPerTrade: number;
    maxDaily: number;
}

export interface LeverageConfig {
    enabled: boolean;
    maxLeverage: number;
}

export interface ExposureConfig {
    enabled: boolean;
    maxPerAsset: number;
    maxPortfolioPercent?: number;
}

export interface VenueConfig {
    enabled: boolean;
    allowedContracts: string[];
    allowedRecipients: string[];
}

export interface RateConfig {
    enabled: boolean;
    maxPerDay: number;
    cooldownSeconds: number;
}

export interface TimeWindowConfig {
    enabled: boolean;
    startHour: number; // 0-23 UTC
    endHour: number;   // 0-23 UTC
    simulateOutsideHours?: boolean; // Dev toggle for testing
}

export interface LossConfig {
    enabled: boolean;
    maxDrawdown: number;
    halted: boolean;
    simulateDrawdownBreach?: boolean; // Dev toggle for testing
}

// ============ STRATEGY CONFIG ============
export interface StrategyConfig {
    // Basis/Funding Arb
    minFundingRate?: number;      // e.g., 0.0001 (0.01%)
    maxBasisSpread?: number;      // max spot-perp basis

    // Auto-Hedge Delta
    deltaThreshold?: number;      // notional delta to trigger hedge
    maxHedgeSize?: number;        // max hedge per action

    // Market Hours
    weekendLock?: boolean;        // block Sat/Sun trading

    // Drawdown Stop
    accountStatus?: 'active' | 'paused';
    requireManualResume?: boolean;
}

export interface GuardiansConfig {
    spend: SpendConfig;
    leverage: LeverageConfig;
    exposure: ExposureConfig;
    venue: VenueConfig;
    rate: RateConfig;
    timeWindow: TimeWindowConfig;
    loss: LossConfig;
    strategy?: StrategyConfig;
}

// ============ STATE TYPES ============
export interface GuardiansState {
    dailySpend: number;
    dailySpendResetAt: number;
    tradeCount: number;
    tradeCountResetAt: number;
    lastTradeAt: number;
    positions: Record<string, number>; // symbol -> notional
    dailyPnL: number;
}

// ============ EVENT TYPES (Activity Feed) ============
export interface GuardianEvent {
    id: string;
    timestamp: number;
    actionType: 'trade' | 'transfer' | 'test';
    payload: {
        market?: string;
        side?: string;
        amount?: number;
        to?: string;
        token?: string;
    };
    result: {
        passed: boolean;
        denials: GuardianDenial[];
    };
    status: 'approved' | 'denied' | 'pending';
    txHash?: string;
}

export type GuardianEventStatus = 'approved' | 'denied' | 'pending';

// ============ STATUS TYPES (Dashboard) ============
export interface GuardianStatus {
    org: {
        id: string;
        name: string;
    };
    account: {
        id: string;
        name: string;
        address: string;
    };
    quorum: {
        required: number;
        humans: number;
        robos: number;
        total: number;
    };
    network: {
        chainId: number;
        name: string;
    };
    health: 'ready' | 'degraded' | 'offline';
    lastHeartbeat: number;
}

export interface GuardianPolicy {
    id: string;
    name: string;
    type: 'allowlist' | 'amount_limit' | 'cooldown' | 'rate_limit' | 'time_window';
    enabled: boolean;
    config: Record<string, unknown>;
    description: string;
}

// ============ PRESETS ============
export type GuardianPreset =
    | 'default' | 'conservative' | 'pro'
    | 'basisArb' | 'autoHedge' | 'marketHours' | 'drawdownStop';

export const GUARDIAN_PRESETS: Record<GuardianPreset, GuardiansConfig> = {
    default: {
        spend: { enabled: true, maxPerTrade: 250, maxDaily: 1000 },
        leverage: { enabled: true, maxLeverage: 3 },
        exposure: { enabled: true, maxPerAsset: 500 },
        venue: {
            enabled: true,
            allowedContracts: ['0x1111111111111111111111111111111111111111', 'ETH-PERP', 'BTC-PERP', 'PORTFOLIO_TRADE'], // Added standard perps
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 10, cooldownSeconds: 60 },
        timeWindow: { enabled: false, startHour: 9, endHour: 17 },
        loss: { enabled: true, maxDrawdown: 200, halted: false },
    },
    conservative: {
        spend: { enabled: true, maxPerTrade: 100, maxDaily: 500 },
        leverage: { enabled: true, maxLeverage: 1 },
        exposure: { enabled: true, maxPerAsset: 250 },
        venue: {
            enabled: true,
            allowedContracts: ['0x1111111111111111111111111111111111111111', 'ETH-PERP', 'BTC-PERP', 'PORTFOLIO_TRADE'],
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 5, cooldownSeconds: 120 },
        timeWindow: { enabled: true, startHour: 9, endHour: 17 },
        loss: { enabled: true, maxDrawdown: 100, halted: false },
    },
    pro: {
        spend: { enabled: true, maxPerTrade: 500, maxDaily: 5000 },
        leverage: { enabled: true, maxLeverage: 5 },
        exposure: { enabled: true, maxPerAsset: 1000 },
        venue: {
            enabled: true,
            allowedContracts: ['0x1111111111111111111111111111111111111111'],
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 50, cooldownSeconds: 10 },
        timeWindow: { enabled: false, startHour: 0, endHour: 24 },
        loss: { enabled: true, maxDrawdown: 500, halted: false },
    },
    // ============ STRATEGY PRESETS ============
    basisArb: {
        spend: { enabled: true, maxPerTrade: 250, maxDaily: 1000 },
        leverage: { enabled: true, maxLeverage: 3 },
        exposure: { enabled: true, maxPerAsset: 1000 },
        venue: {
            enabled: true,
            allowedContracts: ['GOLD-USDH', 'OIL-USDH', 'ETH-PERP'],
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 20, cooldownSeconds: 30 },
        timeWindow: { enabled: false, startHour: 0, endHour: 24 },
        loss: { enabled: true, maxDrawdown: 200, halted: false },
        strategy: {
            minFundingRate: 0.0001,  // 0.01% per 8h
            maxBasisSpread: 0.005,   // 0.5% max
        },
    },
    autoHedge: {
        spend: { enabled: true, maxPerTrade: 100, maxDaily: 500 },
        leverage: { enabled: true, maxLeverage: 2 },
        exposure: { enabled: true, maxPerAsset: 500 },
        venue: {
            enabled: true,
            allowedContracts: ['ETH-PERP', 'BTC-PERP'],
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 50, cooldownSeconds: 10 },
        timeWindow: { enabled: true, startHour: 8, endHour: 22 },
        loss: { enabled: true, maxDrawdown: 150, halted: false },
        strategy: {
            deltaThreshold: 50,    // $50 notional drift triggers hedge
            maxHedgeSize: 100,     // max $100 hedge per action
        },
    },
    marketHours: {
        spend: { enabled: true, maxPerTrade: 250, maxDaily: 1000 },
        leverage: { enabled: true, maxLeverage: 3 },
        exposure: { enabled: true, maxPerAsset: 500 },
        venue: {
            enabled: true,
            allowedContracts: [],
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 20, cooldownSeconds: 30 },
        timeWindow: { enabled: true, startHour: 9, endHour: 17 },
        loss: { enabled: true, maxDrawdown: 200, halted: false },
        strategy: {
            weekendLock: true,     // Block Sat/Sun
        },
    },
    drawdownStop: {
        spend: { enabled: true, maxPerTrade: 250, maxDaily: 1000 },
        leverage: { enabled: true, maxLeverage: 3 },
        exposure: { enabled: true, maxPerAsset: 500 },
        venue: {
            enabled: true,
            allowedContracts: [],
            allowedRecipients: [],
        },
        rate: { enabled: true, maxPerDay: 20, cooldownSeconds: 30 },
        timeWindow: { enabled: false, startHour: 0, endHour: 24 },
        loss: { enabled: true, maxDrawdown: 100, halted: false },
        strategy: {
            accountStatus: 'active',
            requireManualResume: true,
        },
    },
};

// ============ GUARDIAN METADATA ============
export const GUARDIAN_INFO: Record<GuardianType, {
    name: string;
    icon: string;
    description: string;
    saltNative: boolean;
}> = {
    spend: {
        name: 'Spend Guardian',
        icon: '💰',
        description: 'Limits per-trade and daily spending',
        saltNative: true,
    },
    leverage: {
        name: 'Leverage Guardian',
        icon: '📊',
        description: 'Caps maximum leverage',
        saltNative: false,
    },
    exposure: {
        name: 'Exposure Guardian',
        icon: '🎯',
        description: 'Limits concentration per asset',
        saltNative: false,
    },
    venue: {
        name: 'Venue Guardian',
        icon: '🏛️',
        description: 'Allowlists contracts and recipients',
        saltNative: true,
    },
    rate: {
        name: 'Rate Guardian',
        icon: '⏱️',
        description: 'Enforces trade limits and cooldowns',
        saltNative: false,
    },
    timeWindow: {
        name: 'Time Window',
        icon: '🕐',
        description: 'Restricts trading hours',
        saltNative: false,
    },
    loss: {
        name: 'Loss Guardian',
        icon: '🛑',
        description: 'Kill switch on drawdown',
        saltNative: false,
    },
};

// ============ STRATEGY PRESET METADATA ============
export type StrategyPresetType = 'basisArb' | 'autoHedge' | 'marketHours' | 'drawdownStop';

export const STRATEGY_PRESET_INFO: Record<StrategyPresetType, {
    name: string;
    icon: string;
    description: string;
    keyPolicies: string[];
    passCondition: string;
    failCondition: string;
}> = {
    basisArb: {
        name: 'Basis/Funding Arb',
        icon: '📊',
        description: 'Execute only when funding ≥ threshold and exposure < cap',
        keyPolicies: ['Max leverage ≤ 3x', 'Max exposure $1000', 'Only GOLD/OIL markets'],
        passCondition: 'Funding ≥ 0.01% & exposure under cap',
        failCondition: 'Funding too low or exposure cap reached',
    },
    autoHedge: {
        name: 'Auto-Hedge Delta',
        icon: '⚖️',
        description: 'Hedge when delta drift exceeds threshold',
        keyPolicies: ['Delta threshold $50', 'Max hedge $100', 'ETH/BTC perps only'],
        passCondition: 'Delta > $50, hedge within limits',
        failCondition: 'Delta < threshold or hedge exceeds cap',
    },
    marketHours: {
        name: 'Market Hours Mode',
        icon: '🕐',
        description: 'Block all trades outside 9AM-5PM UTC',
        keyPolicies: ['Trading hours 9-17 UTC', 'Weekend lock enabled', 'All trades blocked'],
        passCondition: 'Within trading window (weekday)',
        failCondition: 'Outside hours or weekend',
    },
    drawdownStop: {
        name: 'Drawdown Stop',
        icon: '🛑',
        description: 'Freeze trading when PnL drops below threshold',
        keyPolicies: ['Max drawdown $100', 'Manual resume required', 'Circuit breaker'],
        passCondition: 'PnL above -$100 threshold',
        failCondition: 'Drawdown ≥ $100 → PAUSED',
    },
};

