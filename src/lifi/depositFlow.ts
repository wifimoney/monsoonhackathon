/**
 * Complete Flow: Bridge → Deposit
 * 
 * Two-step flow for hackathon (simpler than single-step with callbacks)
 */

import { getBridgeQuote, executeBridge, BridgeParams } from './bridge';
import { gatedDeposit } from '../salt/gatedActions';
import { PolicyValidator } from '../salt/policies';
import { auditLog } from '../audit/logger';

interface BridgeAndDepositParams {
    // Bridge params
    sourceChain: number;
    sourceToken: string;
    amount: string;

    // Deposit params
    token0Amount: bigint;
    token1Amount: bigint;

    // Wallets
    signer: any;
    saltWallet: any;
    guardian: any;
}

export async function bridgeAndDeposit(params: BridgeAndDepositParams) {
    const validator = new PolicyValidator();

    console.log('🌉 Step 1: Bridging to HyperEVM...');

    // Step 1: Get bridge quote
    const bridgeParams: BridgeParams = {
        fromChainId: params.sourceChain,
        toChainId: 999, // HyperEVM
        fromToken: params.sourceToken,
        toToken: params.sourceToken, // Same token on destination
        fromAmount: params.amount,
        fromAddress: params.saltWallet.address,
        toAddress: params.saltWallet.address,
    };

    try {
        const quote = await getBridgeQuote(bridgeParams);

        await auditLog({
            action: 'BRIDGE_QUOTE',
            sourceChain: params.sourceChain,
            amount: params.amount,
            estimatedOutput: quote.estimatedOutput,
            estimatedTime: quote.estimatedTime,
            fees: quote.fees,
        });

        // Step 2: Execute bridge
        console.log(`   Estimated output: ${quote.estimatedOutput}`);
        console.log(`   Estimated time: ${quote.estimatedTime}s`);
        console.log(`   Fees: $${quote.fees}`);

        const bridgeResult = await executeBridge(quote.route, params.signer);

        await auditLog({
            action: 'BRIDGE_COMPLETE',
            txHash: bridgeResult.txHash,
            status: bridgeResult.status,
        });

        console.log(`✅ Bridge complete: ${bridgeResult.txHash}`);

        // Wait for funds to arrive (simplified - in production, poll for balance)
        console.log('⏳ Waiting for funds to arrive on HyperEVM...');
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute wait

        // Step 3: Deposit to vault (Salt-gated)
        console.log('🏦 Step 2: Depositing to Monsoon Vault...');

        const depositResult = await gatedDeposit(
            params.saltWallet,
            params.guardian,
            validator,
            {
                amount0: params.token0Amount,
                amount1: params.token1Amount,
                token0Address: '', // Set from pool info
                token1Address: '',
                recipient: params.saltWallet.address,
            }
        );

        if (depositResult.success) {
            console.log(`✅ Deposit complete: ${depositResult.txHash}`);
            return {
                success: true,
                bridgeTxHash: bridgeResult.txHash,
                depositTxHash: depositResult.txHash,
            };
        } else {
            console.error(`❌ Deposit failed: ${depositResult.error}`);
            return {
                success: false,
                bridgeTxHash: bridgeResult.txHash,
                error: depositResult.error,
            };
        }
    } catch (error) {
        console.error('❌ Bridge and deposit failed:', error);

        await auditLog({
            action: 'BRIDGE_DEPOSIT_FAILED',
            error: String(error),
        });

        return {
            success: false,
            error: String(error),
        };
    }
}
