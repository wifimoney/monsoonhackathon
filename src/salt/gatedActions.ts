/**
 * Salt-Gated Actions for Monsoon
 * 
 * All sensitive operations go through these functions which:
 * 1. Validate against policies
 * 2. Get Salt wallet approval
 * 3. Have Robo Guardian co-sign
 * 4. Log to audit
 */

import { encodeFunctionData, parseEther } from 'viem';
import { PolicyValidator } from './policies';
import { auditLog } from '../audit/logger';
import { HYPEREVM, MONSOON_ALM_ABI } from '../lib/contracts';

// Types
interface SaltWallet {
    address: string;
    sendTransaction: (tx: { to: string; data: string; value?: bigint }) => Promise<string>;
}

interface RoboGuardian {
    validateAndSign: (tx: any, context: any) => Promise<{ approved: boolean; signature?: string; reason?: string }>;
}

// ============ GATED DEPOSIT ============

export async function gatedDeposit(
    saltWallet: SaltWallet,
    guardian: RoboGuardian,
    validator: PolicyValidator,
    params: {
        amount0: bigint;
        amount1: bigint;
        token0Address: string;
        token1Address: string;
        recipient: string;
    }
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const totalValue = params.amount0 + params.amount1;

    // 1. Validate against policy
    const validation0 = validator.validateDeposit(params.amount0, params.token0Address);
    if (!validation0.valid) {
        await auditLog({
            action: 'DEPOSIT_BLOCKED',
            reason: validation0.reason,
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
        });
        return { success: false, error: validation0.reason };
    }

    const validation1 = validator.validateDeposit(params.amount1, params.token1Address);
    if (!validation1.valid) {
        await auditLog({
            action: 'DEPOSIT_BLOCKED',
            reason: validation1.reason,
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
        });
        return { success: false, error: validation1.reason };
    }

    // 2. Prepare transaction
    const txData = encodeFunctionData({
        abi: MONSOON_ALM_ABI,
        functionName: 'deposit',
        args: [params.amount0, params.amount1, 0n, params.recipient],
    });

    const tx = {
        to: HYPEREVM.MONSOON_ALM,
        data: txData,
    };

    // 3. Get Robo Guardian approval
    const guardianResult = await guardian.validateAndSign(tx, {
        action: 'deposit',
        amount0: params.amount0.toString(),
        amount1: params.amount1.toString(),
    });

    if (!guardianResult.approved) {
        await auditLog({
            action: 'DEPOSIT_GUARDIAN_REJECTED',
            reason: guardianResult.reason,
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
        });
        return { success: false, error: `Guardian rejected: ${guardianResult.reason}` };
    }

    // 4. Send via Salt wallet
    try {
        const txHash = await saltWallet.sendTransaction(tx);

        // Record in policy tracker
        validator.recordDeposit(totalValue);

        await auditLog({
            action: 'DEPOSIT_SUCCESS',
            txHash,
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
            recipient: params.recipient,
        });

        return { success: true, txHash };
    } catch (error) {
        await auditLog({
            action: 'DEPOSIT_FAILED',
            error: String(error),
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
        });
        return { success: false, error: String(error) };
    }
}

// ============ GATED REBALANCE ============

export async function gatedAllocateToOB(
    saltWallet: SaltWallet,
    guardian: RoboGuardian,
    validator: PolicyValidator,
    params: {
        amount0: bigint;
        amount1: bigint;
        isBid: boolean;
        currentOBPct: number;
        currentAMMPct: number;
    }
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    // Calculate proposed OB percentage
    // This is simplified - in production, calculate from actual reserves
    const proposedOBPct = params.currentOBPct + 5; // Assume 5% increase

    // 1. Validate against policy
    const validation = validator.validateRebalance(
        params.currentOBPct,
        proposedOBPct,
        params.currentAMMPct
    );

    if (!validation.valid) {
        await auditLog({
            action: 'REBALANCE_BLOCKED',
            reason: validation.reason,
            isBid: params.isBid,
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
        });
        return { success: false, error: validation.reason };
    }

    // 2. Prepare transaction
    const txData = encodeFunctionData({
        abi: MONSOON_ALM_ABI,
        functionName: 'allocateToOB',
        args: [params.amount0, params.amount1, params.isBid],
    });

    const tx = {
        to: HYPEREVM.MONSOON_ALM,
        data: txData,
    };

    // 3. Get Robo Guardian approval
    const guardianResult = await guardian.validateAndSign(tx, {
        action: 'allocateToOB',
        isBid: params.isBid,
        amount0: params.amount0.toString(),
        amount1: params.amount1.toString(),
    });

    if (!guardianResult.approved) {
        await auditLog({
            action: 'REBALANCE_GUARDIAN_REJECTED',
            reason: guardianResult.reason,
        });
        return { success: false, error: `Guardian rejected: ${guardianResult.reason}` };
    }

    // 4. Send via Salt wallet
    try {
        const txHash = await saltWallet.sendTransaction(tx);

        validator.recordRebalance();

        await auditLog({
            action: 'REBALANCE_SUCCESS',
            txHash,
            isBid: params.isBid,
            amount0: params.amount0.toString(),
            amount1: params.amount1.toString(),
        });

        return { success: true, txHash };
    } catch (error) {
        await auditLog({
            action: 'REBALANCE_FAILED',
            error: String(error),
        });
        return { success: false, error: String(error) };
    }
}
