import { checkGuardrails } from './guardrails';
import type { ActionIntent, GuardrailsConfig, GuardrailsResult } from './types';

// ============ TYPES ============
export interface PolicyCheck {
    name: string;
    passed: boolean;
    reason?: string;
    current?: string | number;
    limit?: string | number;
    severity: 'blocker' | 'warning' | 'info';
}

export interface WhatIfScenario {
    change: string;
    wouldPass: boolean;
    description: string;
}

export interface SimulationResult {
    wouldPass: boolean;
    confidence: 'certain' | 'likely' | 'uncertain';

    localGuardrails: {
        passed: boolean;
        checks: PolicyCheck[];
    };
    saltPolicies: {
        passed: boolean;
        checks: PolicyCheck[];
    };

    suggestions?: string[];
    whatIf?: WhatIfScenario[];
}

// ============ SIMULATOR ============
export async function simulateExecution(
    actionIntent: ActionIntent,
    guardrailsConfig: GuardrailsConfig
): Promise<SimulationResult> {
    const suggestions: string[] = [];
    const whatIf: WhatIfScenario[] = [];
    const marketSymbol = actionIntent.market.split('/')[0];

    // ===== LOCAL GUARDRAILS =====
    const localResult = checkGuardrails(actionIntent, guardrailsConfig);

    const localChecks: PolicyCheck[] = [
        {
            name: 'Market Allowlist',
            passed: guardrailsConfig.allowedMarkets.includes(marketSymbol),
            current: marketSymbol,
            limit: guardrailsConfig.allowedMarkets.join(', '),
            severity: 'blocker',
        },
        {
            name: 'Transaction Size',
            passed: actionIntent.notionalUsd <= guardrailsConfig.maxPerTx,
            current: `$${actionIntent.notionalUsd}`,
            limit: `$${guardrailsConfig.maxPerTx}`,
            severity: 'blocker',
        },
        {
            name: 'Slippage Tolerance',
            passed: actionIntent.maxSlippageBps <= guardrailsConfig.maxSlippageBps,
            current: `${actionIntent.maxSlippageBps / 100}%`,
            limit: `${guardrailsConfig.maxSlippageBps / 100}%`,
            severity: 'warning',
        },
    ];

    // ===== SALT POLICY SIMULATION =====
    // For hackathon: simulate Salt policies based on known rules
    const saltChecks: PolicyCheck[] = [
        {
            name: 'Recipient Allowlist (PT1)',
            passed: true, // Simulated router is always allowed
            severity: 'info',
        },
        {
            name: 'Transaction Limits (PT3)',
            passed: actionIntent.notionalUsd <= 500, // Salt hard limit
            current: `$${actionIntent.notionalUsd}`,
            limit: '$500',
            severity: actionIntent.notionalUsd > 500 ? 'blocker' : 'info',
        },
    ];

    const localPassed = localChecks.every(c => c.passed || c.severity !== 'blocker');
    const saltPassed = saltChecks.every(c => c.passed || c.severity !== 'blocker');

    // ===== GENERATE SUGGESTIONS =====
    const allChecks = [...localChecks, ...saltChecks];
    const failures = allChecks.filter(c => !c.passed && c.severity === 'blocker');

    for (const fail of failures) {
        if (fail.name.includes('Size') || fail.name.includes('Limit')) {
            const maxAllowed = guardrailsConfig.maxPerTx;
            suggestions.push(`Reduce size to $${maxAllowed} or less`);

            whatIf.push({
                change: `Size → $${maxAllowed}`,
                wouldPass: true,
                description: `Reducing to $${maxAllowed} would pass the limit`,
            });
        }

        if (fail.name.includes('Market') || fail.name.includes('Allowlist')) {
            const allowed = guardrailsConfig.allowedMarkets[0];
            suggestions.push(`Switch to: ${guardrailsConfig.allowedMarkets.join(', ')}`);

            whatIf.push({
                change: `Market → ${allowed}`,
                wouldPass: true,
                description: `Switching to ${allowed} would pass the allowlist`,
            });
        }
    }

    // ===== FINAL RESULT =====
    const wouldPass = localPassed && saltPassed;

    return {
        wouldPass,
        confidence: wouldPass ? 'certain' : failures.length > 1 ? 'certain' : 'likely',
        localGuardrails: {
            passed: localPassed,
            checks: localChecks,
        },
        saltPolicies: {
            passed: saltPassed,
            checks: saltChecks,
        },
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        whatIf: whatIf.length > 0 ? whatIf : undefined,
    };
}
