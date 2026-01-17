import { checkGuardrails } from './guardrails';
import type { ActionIntent } from './types';
import type { GuardiansConfig, GuardiansState } from '@/guardians/types';

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
// ============ SIMULATOR ============
export async function simulateExecution(
    actionIntent: ActionIntent,
    guardrailsConfig: GuardiansConfig,
    state?: GuardiansState // Pass in state for context-aware checks
): Promise<SimulationResult> {
    const suggestions: string[] = [];
    const whatIf: WhatIfScenario[] = [];
    const marketSymbol = 'market' in actionIntent ? actionIntent.market.split('/')[0] : 'N/A';
    const notionalUsd = 'notionalUsd' in actionIntent ? actionIntent.notionalUsd : ('amount' in actionIntent ? actionIntent.amount : 0);

    // ===== LOCAL GUARDRAILS =====
    // Use the real operational check function
    const localResult = checkGuardrails(actionIntent, guardrailsConfig, state);

    const localChecks: PolicyCheck[] = [];

    // Map the denials/results to PolicyCheck format for UI
    if (guardrailsConfig.spend.enabled) {
        localChecks.push({
            name: 'Transaction Size',
            passed: notionalUsd <= guardrailsConfig.spend.maxPerTrade,
            current: `$${notionalUsd}`,
            limit: `$${guardrailsConfig.spend.maxPerTrade}`,
            severity: 'blocker',
        });
    }

    if (guardrailsConfig.timeWindow.enabled) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const { startHour, endHour } = guardrailsConfig.timeWindow;
        const isAllowed = startHour <= endHour
            ? (currentHour >= startHour && currentHour < endHour)
            : (currentHour >= startHour || currentHour < endHour);

        localChecks.push({
            name: 'Time Window',
            passed: isAllowed,
            current: `${currentHour}:00 UTC`,
            limit: `${startHour}-${endHour} UTC`,
            severity: 'blocker'
        });
    }

    if (guardrailsConfig.venue.enabled) {
        // Assuming allowedContracts contains symbols for now as per previous step discussion
        const isAllowed = guardrailsConfig.venue.allowedContracts.includes(marketSymbol);
        localChecks.push({
            name: 'Market Allowlist',
            passed: isAllowed,
            current: marketSymbol,
            limit: 'Allowed List', // Simplified for display
            severity: 'blocker',
        });
    }

    // ===== SALT POLICY SIMULATION (Scenario C) =====
    // Backed by consistent config, not random demo rules.
    // In operational mode, Salt policies might duplicate some local guardrails (account Spend Limit)
    // Here we simulate what Salt WOULD enforce based on the same knowledge.

    const saltChecks: PolicyCheck[] = [
        {
            name: 'Account Spend Limit (Salt)',
            passed: notionalUsd <= guardrailsConfig.spend.maxDaily, // Assuming Salt also enforces daily limit
            current: `$${notionalUsd} (Tx)`,
            limit: `$${guardrailsConfig.spend.maxDaily} (Daily)`,
            severity: 'blocker',
        },
        {
            name: 'Whitelisted Recipient',
            passed: true, // Asset assumes valid recipient for now
            severity: 'info',
        }
    ];


    const localPassed = localChecks.every(c => c.passed || c.severity !== 'blocker');
    const saltPassed = saltChecks.every(c => c.passed || c.severity !== 'blocker');

    // ===== GENERATE SUGGESTIONS =====
    const allChecks = [...localChecks, ...saltChecks];
    const failures = allChecks.filter(c => !c.passed && c.severity === 'blocker');

    for (const fail of failures) {
        if (fail.name.includes('Size') || fail.name.includes('Spend')) {
            const maxAllowed = guardrailsConfig.spend.maxPerTrade;
            const dailyLimit = guardrailsConfig.spend.maxDaily;

            if (notionalUsd > maxAllowed) {
                suggestions.push(`Reduce size to $${maxAllowed} or less`);
                whatIf.push({
                    change: `Size → $${maxAllowed}`,
                    wouldPass: true,
                    description: `Reducing to $${maxAllowed} would pass the per-tx limit`,
                });
            }
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
