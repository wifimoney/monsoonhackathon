/**
 * LI.FI Bridge Integration
 * 
 * Bridges assets from any chain to HyperEVM.
 */

import { createConfig, getQuote, executeRoute, RouteExtended } from '@lifi/sdk';

// Initialize LI.FI
createConfig({
    integrator: 'monsoon',
});

// ============ TYPES ============

export interface BridgeParams {
    fromChainId: number;
    toChainId: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
}

export interface BridgeQuote {
    route: RouteExtended;
    estimatedOutput: string;
    estimatedTime: number;
    fees: string;
}

// ============ CONSTANTS ============

export const SUPPORTED_CHAINS = {
    ETHEREUM: 1,
    ARBITRUM: 42161,
    OPTIMISM: 10,
    POLYGON: 137,
    BASE: 8453,
    HYPEREVM: 999,
};

export const COMMON_TOKENS: Record<number, Record<string, string>> = {
    [SUPPORTED_CHAINS.ETHEREUM]: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    [SUPPORTED_CHAINS.ARBITRUM]: {
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    [SUPPORTED_CHAINS.HYPEREVM]: {
        WHYPE: '0x5555555555555555555555555555555555555555',
        // Add USDC when available on HyperEVM
    },
};

// ============ BRIDGE FUNCTIONS ============

export async function getBridgeQuote(params: BridgeParams): Promise<BridgeQuote> {
    const quote = await getQuote({
        fromChain: params.fromChainId,
        toChain: params.toChainId,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
    });

    return {
        route: quote,
        estimatedOutput: quote.estimate.toAmount,
        estimatedTime: quote.estimate.executionDuration,
        fees: quote.estimate.feeCosts?.reduce(
            (acc, fee) => acc + parseFloat(fee.amountUSD || '0'),
            0
        ).toFixed(2) || '0',
    };
}

export async function executeBridge(
    route: RouteExtended,
    signer: any // ethers Signer or viem WalletClient
): Promise<{
    txHash: string;
    status: 'pending' | 'success' | 'failed';
}> {
    return new Promise((resolve, reject) => {
        executeRoute(route, {
            updateRouteHook: (updatedRoute) => {
                const step = updatedRoute.steps[0];
                if (step?.execution?.status === 'DONE') {
                    resolve({
                        txHash: step.execution.process[0]?.txHash || '',
                        status: 'success',
                    });
                } else if (step?.execution?.status === 'FAILED') {
                    reject(new Error('Bridge failed'));
                }
            },
            // @ts-ignore - signer type mismatch
            signer,
        });
    });
}

// ============ HELPER ============

export function getEstimatedBridgeTime(fromChain: number, toChain: number): string {
    // Rough estimates
    if (fromChain === SUPPORTED_CHAINS.HYPEREVM || toChain === SUPPORTED_CHAINS.HYPEREVM) {
        return '~5-10 minutes'; // HyperEVM bridging
    }
    if (fromChain === toChain) {
        return '< 1 minute';
    }
    return '~2-5 minutes';
}
