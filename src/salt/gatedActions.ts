// Salt-Gated Actions
// These functions wrap contract calls with Salt policy validation

import { defaultValidator, PolicyValidationResult } from './policies';

interface GatedActionResult {
    success: boolean;
    validationResult: PolicyValidationResult;
    txHash?: string;
    error?: string;
}

/**
 * Salt-gated deposit function
 * Validates deposit against policies before execution
 */
export async function gatedDeposit(
    amount: bigint,
    token: string,
    executeDeposit: () => Promise<string>
): Promise<GatedActionResult> {
    // Step 1: Validate against policy
    const validation = defaultValidator.validateDeposit(amount, token);

    if (!validation.valid) {
        console.log('[Salt] Deposit blocked:', validation.reason);
        return {
            success: false,
            validationResult: validation,
            error: validation.reason,
        };
    }

    // Step 2: Execute deposit
    try {
        console.log('[Salt] Deposit approved, executing...');
        const txHash = await executeDeposit();
        console.log('[Salt] Deposit complete:', txHash);

        return {
            success: true,
            validationResult: validation,
            txHash,
        };
    } catch (error) {
        return {
            success: false,
            validationResult: validation,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Salt-gated rebalance function
 * Validates rebalance against policies before execution
 */
export async function gatedRebalance(
    allocationPercent: number,
    lastRebalanceTime: number,
    executeRebalance: () => Promise<string>
): Promise<GatedActionResult> {
    // Step 1: Validate against policy
    const validation = defaultValidator.validateRebalance(allocationPercent, lastRebalanceTime);

    if (!validation.valid) {
        console.log('[Salt] Rebalance blocked:', validation.reason);
        return {
            success: false,
            validationResult: validation,
            error: validation.reason,
        };
    }

    // Step 2: Execute rebalance
    try {
        console.log('[Salt] Rebalance approved, executing...');
        const txHash = await executeRebalance();
        console.log('[Salt] Rebalance complete:', txHash);

        return {
            success: true,
            validationResult: validation,
            txHash,
        };
    } catch (error) {
        return {
            success: false,
            validationResult: validation,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Salt-gated OB order placement
 */
export async function gatedOBOrder(
    spreadBps: number,
    orderSizePercent: number,
    assetIndex: number,
    executeOrder: () => Promise<string>
): Promise<GatedActionResult> {
    // Step 1: Validate against policy
    const validation = defaultValidator.validateOBOrder(spreadBps, orderSizePercent, assetIndex);

    if (!validation.valid) {
        console.log('[Salt] OB Order blocked:', validation.reason);
        return {
            success: false,
            validationResult: validation,
            error: validation.reason,
        };
    }

    // Step 2: Execute order
    try {
        console.log('[Salt] OB Order approved, executing...');
        const txHash = await executeOrder();
        console.log('[Salt] OB Order complete:', txHash);

        return {
            success: true,
            validationResult: validation,
            txHash,
        };
    } catch (error) {
        return {
            success: false,
            validationResult: validation,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
