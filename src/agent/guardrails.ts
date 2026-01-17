import type { ActionIntent, GuardrailsConfig, GuardrailsResult } from './types';

const DEFAULT_GUARDRAILS: GuardrailsConfig = {
    allowedMarkets: ['GOLD', 'OIL', 'SILVER'],
    maxPerTx: 250,
    cooldownSeconds: 60,
    maxSlippageBps: 100,
};

let lastExecutionTime = 0;

export function checkGuardrails(
    intent: ActionIntent,
    config: GuardrailsConfig = DEFAULT_GUARDRAILS
): GuardrailsResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check market allowlist
    const marketSymbol = intent.market.split('/')[0];
    if (!config.allowedMarkets.includes(marketSymbol)) {
        issues.push(`Market ${marketSymbol} not in allowlist (allowed: ${config.allowedMarkets.join(', ')})`);
    }

    // Check size limit
    if (intent.notionalUsd > config.maxPerTx) {
        issues.push(`Size $${intent.notionalUsd} exceeds max $${config.maxPerTx}`);
    }

    // Check cooldown
    const elapsed = Date.now() - lastExecutionTime;
    const cooldownMs = config.cooldownSeconds * 1000;
    if (elapsed < cooldownMs && lastExecutionTime > 0) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
        issues.push(`Cooldown active: ${remaining}s remaining`);
    }

    // Check slippage
    if (intent.maxSlippageBps > config.maxSlippageBps) {
        warnings.push(`Slippage ${intent.maxSlippageBps / 100}% exceeds recommended ${config.maxSlippageBps / 100}%`);
    }

    return {
        passed: issues.length === 0,
        issues,
        warnings,
    };
}

export function recordExecution(): void {
    lastExecutionTime = Date.now();
}

export function getDefaultGuardrails(): GuardrailsConfig {
    return { ...DEFAULT_GUARDRAILS };
}
