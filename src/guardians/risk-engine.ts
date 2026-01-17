import type { ActionIntent } from '@/agent/types';
import type { GuardianDenial, GuardianCheckResult, GuardiansConfig, GuardiansState } from './types';
import { getGuardiansState, getGuardiansConfig, getPosition, getCooldownRemaining } from './state';

// ============ INDIVIDUAL GUARDIAN CHECKS ============

function checkSpend(
    intent: ActionIntent,
    config: GuardiansConfig,
    state: GuardiansState
): GuardianDenial | null {
    if (!config.spend.enabled) return null;

    // Per-trade check
    if (intent.notionalUsd > config.spend.maxPerTrade) {
        return {
            guardian: 'spend',
            name: 'Spend Guardian',
            reason: `Trade size $${intent.notionalUsd} exceeds max $${config.spend.maxPerTrade}`,
            current: intent.notionalUsd,
            limit: config.spend.maxPerTrade,
            severity: 'block',
        };
    }

    // Daily limit check
    const dailyRemaining = config.spend.maxDaily - state.dailySpend;
    if (intent.notionalUsd > dailyRemaining) {
        return {
            guardian: 'spend',
            name: 'Spend Guardian',
            reason: `Trade would exceed daily limit ($${dailyRemaining} remaining of $${config.spend.maxDaily})`,
            current: state.dailySpend + intent.notionalUsd,
            limit: config.spend.maxDaily,
            severity: 'block',
        };
    }

    return null;
}

function checkLeverage(
    intent: ActionIntent,
    config: GuardiansConfig
): GuardianDenial | null {
    if (!config.leverage.enabled) return null;

    // Extract leverage from intent if present
    const leverage = (intent as any).leverage || 1;

    if (leverage > config.leverage.maxLeverage) {
        return {
            guardian: 'leverage',
            name: 'Leverage Guardian',
            reason: `Leverage ${leverage}x exceeds max ${config.leverage.maxLeverage}x`,
            current: leverage,
            limit: config.leverage.maxLeverage,
            severity: 'block',
        };
    }

    return null;
}

function checkExposure(
    intent: ActionIntent,
    config: GuardiansConfig
): GuardianDenial | null {
    if (!config.exposure.enabled) return null;

    const symbol = intent.market.split('/')[0];
    const currentPosition = getPosition(symbol);
    const newExposure = currentPosition + intent.notionalUsd;

    if (newExposure > config.exposure.maxPerAsset) {
        return {
            guardian: 'exposure',
            name: 'Exposure Guardian',
            reason: `${symbol} exposure would reach $${newExposure}, exceeding max $${config.exposure.maxPerAsset}`,
            current: newExposure,
            limit: config.exposure.maxPerAsset,
            severity: 'block',
        };
    }

    return null;
}

function checkVenue(
    intent: ActionIntent,
    config: GuardiansConfig
): GuardianDenial | null {
    if (!config.venue.enabled) return null;

    // For demo: assume all intents go through our allowlisted router
    // In production, check the actual contract address
    const targetContract = (intent as any).targetContract || '0x1111111111111111111111111111111111111111';

    if (!config.venue.allowedContracts.includes(targetContract)) {
        return {
            guardian: 'venue',
            name: 'Venue Guardian',
            reason: `Contract ${targetContract.slice(0, 10)}... not in allowlist`,
            current: targetContract,
            severity: 'block',
        };
    }

    return null;
}

function checkRate(
    intent: ActionIntent,
    config: GuardiansConfig,
    state: GuardiansState
): GuardianDenial | null {
    if (!config.rate.enabled) return null;

    // Trades per day check
    if (state.tradeCount >= config.rate.maxPerDay) {
        return {
            guardian: 'rate',
            name: 'Rate Guardian',
            reason: `Daily trade limit reached (${state.tradeCount}/${config.rate.maxPerDay})`,
            current: state.tradeCount,
            limit: config.rate.maxPerDay,
            severity: 'block',
        };
    }

    // Cooldown check
    const cooldownRemaining = getCooldownRemaining();
    if (cooldownRemaining > 0) {
        return {
            guardian: 'rate',
            name: 'Rate Guardian',
            reason: `Cooldown active: ${Math.ceil(cooldownRemaining / 1000)}s remaining`,
            current: `${Math.ceil(cooldownRemaining / 1000)}s`,
            limit: `${config.rate.cooldownSeconds}s`,
            severity: 'block',
        };
    }

    return null;
}

function checkTimeWindow(
    config: GuardiansConfig
): GuardianDenial | null {
    if (!config.timeWindow.enabled) return null;

    // Dev toggle for demo
    if (config.timeWindow.simulateOutsideHours) {
        return {
            guardian: 'timeWindow',
            name: 'Time Window',
            reason: `Trading disabled outside ${config.timeWindow.startHour}:00-${config.timeWindow.endHour}:00 UTC (simulated)`,
            severity: 'block',
        };
    }

    const now = new Date();
    const currentHour = now.getUTCHours();

    if (currentHour < config.timeWindow.startHour || currentHour >= config.timeWindow.endHour) {
        return {
            guardian: 'timeWindow',
            name: 'Time Window',
            reason: `Trading only allowed ${config.timeWindow.startHour}:00-${config.timeWindow.endHour}:00 UTC (current: ${currentHour}:00)`,
            current: `${currentHour}:00`,
            limit: `${config.timeWindow.startHour}:00-${config.timeWindow.endHour}:00`,
            severity: 'block',
        };
    }

    return null;
}

function checkLoss(config: GuardiansConfig): GuardianDenial | null {
    if (!config.loss.enabled) return null;

    // Dev toggle or actual halt
    if (config.loss.halted || config.loss.simulateDrawdownBreach) {
        return {
            guardian: 'loss',
            name: 'Loss Guardian',
            reason: `Trading halted: drawdown limit breached (>${config.loss.maxDrawdown})`,
            current: 'HALTED',
            limit: config.loss.maxDrawdown,
            severity: 'block',
        };
    }

    return null;
}

// ============ MAIN CHECK FUNCTION ============

export function checkAllGuardians(intent: ActionIntent): GuardianCheckResult {
    const config = getGuardiansConfig();
    const state = getGuardiansState();

    const denials: GuardianDenial[] = [];
    const warnings: GuardianDenial[] = [];

    // Run all checks
    const checks = [
        checkLoss(config), // Check loss first (kill switch)
        checkSpend(intent, config, state),
        checkLeverage(intent, config),
        checkExposure(intent, config),
        checkVenue(intent, config),
        checkRate(intent, config, state),
        checkTimeWindow(config),
    ];

    for (const result of checks) {
        if (result) {
            if (result.severity === 'block') {
                denials.push(result);
            } else {
                warnings.push(result);
            }
        }
    }

    return {
        passed: denials.length === 0,
        denials,
        warnings,
    };
}

// ============ TEST TRIGGERS ============

export function testGuardian(guardian: keyof GuardiansConfig): GuardianDenial {
    const config = getGuardiansConfig();

    switch (guardian) {
        case 'spend':
            return {
                guardian: 'spend',
                name: 'Spend Guardian',
                reason: `TEST: Trade size $500 exceeds max $${config.spend.maxPerTrade}`,
                current: 500,
                limit: config.spend.maxPerTrade,
                severity: 'block',
            };
        case 'leverage':
            return {
                guardian: 'leverage',
                name: 'Leverage Guardian',
                reason: `TEST: Leverage 10x exceeds max ${config.leverage.maxLeverage}x`,
                current: 10,
                limit: config.leverage.maxLeverage,
                severity: 'block',
            };
        case 'exposure':
            return {
                guardian: 'exposure',
                name: 'Exposure Guardian',
                reason: `TEST: GOLD exposure $600 exceeds max $${config.exposure.maxPerAsset}`,
                current: 600,
                limit: config.exposure.maxPerAsset,
                severity: 'block',
            };
        case 'venue':
            return {
                guardian: 'venue',
                name: 'Venue Guardian',
                reason: 'TEST: Contract 0xdead...beef not in allowlist',
                current: '0xdead...beef',
                severity: 'block',
            };
        case 'rate':
            return {
                guardian: 'rate',
                name: 'Rate Guardian',
                reason: `TEST: Cooldown active: ${config.rate.cooldownSeconds}s remaining`,
                current: `${config.rate.cooldownSeconds}s`,
                limit: `${config.rate.cooldownSeconds}s`,
                severity: 'block',
            };
        case 'timeWindow':
            return {
                guardian: 'timeWindow',
                name: 'Time Window',
                reason: `TEST: Trading disabled outside ${config.timeWindow.startHour}:00-${config.timeWindow.endHour}:00 UTC`,
                severity: 'block',
            };
        case 'loss':
            return {
                guardian: 'loss',
                name: 'Loss Guardian',
                reason: `TEST: Trading halted due to drawdown > $${config.loss.maxDrawdown}`,
                current: 'HALTED',
                limit: config.loss.maxDrawdown,
                severity: 'block',
            };
        default:
            return {
                guardian: 'spend',
                name: 'Unknown Guardian',
                reason: 'Unknown guardian test',
                severity: 'block',
            };
    }
}
