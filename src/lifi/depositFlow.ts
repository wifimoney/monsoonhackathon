// Bridge and Deposit Flow
// Combines LI.FI bridging with Monsoon vault deposit

import { getQuote, getRoutes, COMMON_TOKENS } from './bridge';
import { gatedDeposit } from '../salt/gatedActions';

interface BridgeAndDepositParams {
    fromChainId: number;
    fromToken: string;
    amount: string;
    userAddress: string;
    executeDeposit: () => Promise<string>;
}

interface BridgeAndDepositResult {
    success: boolean;
    bridgeTxHash?: string;
    depositTxHash?: string;
    error?: string;
}

/**
 * Bridge assets to Arbitrum Sepolia and deposit into Monsoon vault
 */
export async function bridgeAndDeposit(
    params: BridgeAndDepositParams
): Promise<BridgeAndDepositResult> {
    const { fromChainId, fromToken, amount, userAddress, executeDeposit } = params;

    console.log('[Bridge] Starting bridge and deposit flow...');
    console.log(`   From: Chain ${fromChainId}, Token ${fromToken}`);
    console.log(`   Amount: ${amount}`);

    // Step 1: Get bridge quote
    const quote = await getQuote(
        fromChainId,
        421614, // Arbitrum Sepolia
        fromToken,
        COMMON_TOKENS[421614].mUSDC,
        amount,
        userAddress
    );

    if (!quote) {
        return {
            success: false,
            error: 'Failed to get bridge quote',
        };
    }

    console.log('[Bridge] Quote received:', quote.tool);
    console.log(`   Estimated output: ${quote.toAmount}`);

    // Step 2: Execute bridge (in production, sign and send tx)
    console.log('[Bridge] Executing bridge...');
    // For demo, simulate success
    const bridgeTxHash = '0xbridge...demo';
    console.log('[Bridge] Bridge complete:', bridgeTxHash);

    // Step 3: Wait for bridge completion
    console.log('[Bridge] Waiting for bridge confirmation...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Execute gated deposit
    console.log('[Bridge] Executing Salt-gated deposit...');
    const depositResult = await gatedDeposit(
        BigInt(quote.toAmount),
        COMMON_TOKENS[421614].mUSDC,
        executeDeposit
    );

    if (!depositResult.success) {
        return {
            success: false,
            bridgeTxHash,
            error: `Deposit blocked: ${depositResult.error}`,
        };
    }

    return {
        success: true,
        bridgeTxHash,
        depositTxHash: depositResult.txHash,
    };
}

/**
 * Get available routes for bridging to Monsoon
 */
export async function getAvailableRoutes(
    fromChainId: number,
    fromToken: string,
    amount: string,
    userAddress: string
) {
    return getRoutes(
        fromChainId,
        421614,
        fromToken,
        COMMON_TOKENS[421614].mUSDC,
        amount,
        userAddress
    );
}
