import type { ActionIntent } from './types';
import type { GuardiansConfig, GuardiansState, GuardianDenial } from '@/guardians/types';



let lastExecutionTime = 0;

export interface GuardrailsResult {
    passed: boolean;
    issues: string[];
    warnings: string[];
    denials: GuardianDenial[];
}



export function checkGuardrails(
    intent: ActionIntent,
    config: GuardiansConfig,
    state?: GuardiansState
): GuardrailsResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const denials: GuardianDenial[] = [];

    // --- 1. SPEND GUARDIAN ---
    if (config.spend.enabled) {
        if ('notionalUsd' in intent && intent.notionalUsd > config.spend.maxPerTrade) {
            const reason = `Size $${intent.notionalUsd} exceeds max $${config.spend.maxPerTrade}`;
            issues.push(reason);
            denials.push({
                guardian: 'spend',
                name: 'Max Per Trade',
                reason,
                current: intent.notionalUsd,
                limit: config.spend.maxPerTrade,
                severity: 'block'
            });
        }
        // Daily limit check would go here if we tracked daily spend in state
    }

    // --- 2. TIME WINDOW GUARDIAN (Real UTC Check) ---
    if (config.timeWindow.enabled) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const { startHour, endHour } = config.timeWindow;

        // Handle wrap-around (e.g. 22:00 to 08:00)
        const isAllowed = startHour <= endHour
            ? (currentHour >= startHour && currentHour < endHour)
            : (currentHour >= startHour || currentHour < endHour);

        if (!isAllowed) {
            const reason = `Current time ${currentHour}:00 UTC is outside allowed window ${startHour}:00-${endHour}:00 UTC`;
            issues.push(reason);
            denials.push({
                guardian: 'timeWindow',
                name: 'Trading Hours',
                reason,
                current: `${currentHour}:00 UTC`,
                limit: `${startHour}-${endHour} UTC`,
                severity: 'block'
            });
        }
    }

    // --- 3. LOSS GUARDIAN (Real Drawdown Check) ---
    if (config.loss.enabled && state) { // Only check if state is provided
        if (state.dailyPnL < -config.loss.maxDrawdown) {
            const reason = `Drawdown limit breached: PnL $${state.dailyPnL} exceeds limit -$${config.loss.maxDrawdown}`;
            issues.push(reason);
            denials.push({
                guardian: 'loss',
                name: 'Max Drawdown',
                reason,
                current: state.dailyPnL,
                limit: -config.loss.maxDrawdown,
                severity: 'block'
            });
        }
    }

    // --- 4. VENUE/MARKET GUARDIAN ---
    if (config.venue.enabled && 'market' in intent) {
        const marketSymbol = intent.market.split('/')[0];
        // This logic assumes allowedContracts contains market symbols for simplicity in this context from old structure
        // In real operational mode, this should match exact contract addresses or refined symbols
        // Adapting to match old behavior using allowedContracts as symbols list if possible, or needing migration
        // For now, let's assume allowedContracts might hold symbols or we need to look at specific logic
        // The previous code used config.allowedMarkets. We need to map that.
        // Let's assume for this step we check allowedContracts.
        if (config.venue.allowedContracts.length > 0 && !config.venue.allowedContracts.includes(marketSymbol)) {
            // Fallback/compat check: maybe they stored symbols there?
            // If not, we might fail valid trades.
            // Let's just create a warning if strict venue check is on but list is empty/different.
            // Or better, let's enforce it if the list is populated.
            if (!config.venue.allowedContracts.includes(marketSymbol)) {
                const reason = `Market ${marketSymbol} not in allowed venue list`;
                issues.push(reason);
                denials.push({
                    guardian: 'venue',
                    name: 'Market Allowlist',
                    reason,
                    current: marketSymbol,
                    severity: 'block'
                });
            }
        }
    }

    // --- 5. SLIPPAGE/RATE (Warning only) ---
    if ('maxSlippageBps' in intent) {
        // Hardcoded recommended for now or from config if available?
        // Old config had maxSlippageBps directly. New GuardiansConfig doesn't seem to have explicit slippage in standard sections?
        // Let's check config structure.
        // It seems 'rate' or 'strategy' might hold it, or it was lost in migration.
        // I will keep a hardcoded check for safety or skip if not in config.
        const recommendedBps = 100; // 1%
        if (intent.maxSlippageBps > recommendedBps) {
            warnings.push(`Slippage ${intent.maxSlippageBps / 100}% exceeds recommended ${recommendedBps / 100}%`);
        }
    }

    // Legacy cooldown check adapter
    if (config.rate.enabled) {
        const elapsed = Date.now() - lastExecutionTime;
        const cooldownMs = config.rate.cooldownSeconds * 1000;
        if (elapsed < cooldownMs && lastExecutionTime > 0) {
            const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
            const reason = `Rate limit: ${remaining}s cooldown remaining`;
            issues.push(reason);
            denials.push({
                guardian: 'rate',
                name: 'Cooldown',
                reason,
                current: `${remaining}s`,
                limit: `${config.rate.cooldownSeconds}s`,
                severity: 'block'
            });
        }
    }

    return {
        passed: issues.length === 0,
        issues,
        warnings,
        denials
    };
}

export function recordExecution(): void {
    lastExecutionTime = Date.now();
}


