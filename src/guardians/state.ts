import type { GuardiansState, GuardiansConfig, GuardianEvent, GuardianDenial, GuardianPreset } from './types';
import { GUARDIAN_PRESETS } from './types';

// ============ STATE ============
let state: GuardiansState = {
    dailySpend: 0,
    dailySpendResetAt: getNextDayReset(),
    tradeCount: 0,
    tradeCountResetAt: getNextDayReset(),
    lastTradeAt: 0,
    positions: {},
    dailyPnL: 0,
};

let config: GuardiansConfig = { ...GUARDIAN_PRESETS.default };

// ============ EVENT STORE ============
const events: GuardianEvent[] = [];
const MAX_EVENTS = 50;
let lastHealthCheck = Date.now();

function getNextDayReset(): number {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
}

// ============ STATE ACCESSORS ============
export function getGuardiansState(): GuardiansState {
    const now = Date.now();

    // Daily reset check
    if (now >= state.dailySpendResetAt) {
        state.dailySpend = 0;
        state.dailySpendResetAt = getNextDayReset();
    }

    if (now >= state.tradeCountResetAt) {
        state.tradeCount = 0;
        state.tradeCountResetAt = getNextDayReset();
    }

    return { ...state };
}

export function getGuardiansConfig(): GuardiansConfig {
    return { ...config };
}

// ============ STATE MUTATORS ============
export function recordTrade(market: string, notional: number): void {
    state.dailySpend += notional;
    state.tradeCount += 1;
    state.lastTradeAt = Date.now();

    // Update position
    const symbol = market.split('/')[0];
    state.positions[symbol] = (state.positions[symbol] || 0) + notional;
}

export function updatePnL(pnl: number): void {
    state.dailyPnL = pnl;
}

export function getPosition(symbol: string): number {
    return state.positions[symbol] || 0;
}

export function getCooldownRemaining(): number {
    const elapsed = Date.now() - state.lastTradeAt;
    const cooldownMs = config.rate.cooldownSeconds * 1000;
    return Math.max(0, cooldownMs - elapsed);
}

export function getTradesRemaining(): number {
    getGuardiansState(); // Ensure reset check
    return Math.max(0, config.rate.maxPerDay - state.tradeCount);
}

export function getDailySpendRemaining(): number {
    getGuardiansState(); // Ensure reset check
    return Math.max(0, config.spend.maxDaily - state.dailySpend);
}

// ============ CONFIG MUTATORS ============
export function setGuardiansConfig(newConfig: Partial<GuardiansConfig>): void {
    config = { ...config, ...newConfig };
}

export function applyPreset(preset: GuardianPreset): void {
    config = { ...GUARDIAN_PRESETS[preset] };
}

export function setGuardianEnabled(guardian: keyof GuardiansConfig, enabled: boolean): void {
    (config[guardian] as any).enabled = enabled;
}

// ============ LOSS GUARDIAN CONTROLS ============
export function haltTrading(): void {
    config.loss.halted = true;
}

export function resumeTrading(): void {
    config.loss.halted = false;
    config.loss.simulateDrawdownBreach = false;
}

export function simulateDrawdownBreach(simulate: boolean): void {
    config.loss.simulateDrawdownBreach = simulate;
    if (simulate) {
        config.loss.halted = true;
    }
}

// ============ TIME WINDOW CONTROLS ============
export function simulateOutsideHours(simulate: boolean): void {
    config.timeWindow.simulateOutsideHours = simulate;
}

// ============ RESET ============
export function resetState(): void {
    state = {
        dailySpend: 0,
        dailySpendResetAt: getNextDayReset(),
        tradeCount: 0,
        tradeCountResetAt: getNextDayReset(),
        lastTradeAt: 0,
        positions: {},
        dailyPnL: 0,
    };
}

// ============ EVENT TRACKING ============
export function recordEvent(
    actionType: GuardianEvent['actionType'],
    payload: GuardianEvent['payload'],
    passed: boolean,
    denials: GuardianDenial[] = [],
    txHash?: string
): GuardianEvent {
    const event: GuardianEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        actionType,
        payload,
        result: { passed, denials },
        status: passed ? 'approved' : 'denied',
        txHash,
    };

    // Add to front (newest first)
    events.unshift(event);

    // Trim to max
    if (events.length > MAX_EVENTS) {
        events.pop();
    }

    // Update health
    lastHealthCheck = Date.now();

    return event;
}

export function getEvents(limit = 10): GuardianEvent[] {
    return events.slice(0, limit);
}

export function getLastHealthCheck(): number {
    return lastHealthCheck;
}

export function clearEvents(): void {
    events.length = 0;
}
