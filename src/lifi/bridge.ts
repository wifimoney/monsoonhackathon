// LI.FI Bridge Integration
// Allows bridging assets from other chains to HyperEVM/Arbitrum Sepolia

const LIFI_API = 'https://li.quest/v1';

interface BridgeQuote {
    id: string;
    fromChainId: number;
    toChainId: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    tool: string;
}

interface BridgeRoute {
    id: string;
    steps: {
        type: string;
        action: {
            fromChainId: number;
            toChainId: number;
            fromToken: { address: string; symbol: string };
            toToken: { address: string; symbol: string };
        };
        estimate: {
            fromAmount: string;
            toAmount: string;
        };
    }[];
}

export async function getQuote(
    fromChainId: number,
    toChainId: number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    fromAddress: string
): Promise<BridgeQuote | null> {
    try {
        const params = new URLSearchParams({
            fromChain: fromChainId.toString(),
            toChain: toChainId.toString(),
            fromToken,
            toToken,
            fromAmount,
            fromAddress,
        });

        const response = await fetch(`${LIFI_API}/quote?${params}`);
        if (!response.ok) {
            console.error('LI.FI quote error:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('LI.FI quote failed:', error);
        return null;
    }
}

export async function getRoutes(
    fromChainId: number,
    toChainId: number,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    fromAddress: string
): Promise<BridgeRoute[]> {
    try {
        const response = await fetch(`${LIFI_API}/routes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromChainId,
                toChainId,
                fromTokenAddress: fromToken,
                toTokenAddress: toToken,
                fromAmount,
                fromAddress,
                options: {
                    slippage: 0.03, // 3% slippage
                    order: 'RECOMMENDED',
                },
            }),
        });

        if (!response.ok) {
            console.error('LI.FI routes error:', await response.text());
            return [];
        }

        const data = await response.json();
        return data.routes || [];
    } catch (error) {
        console.error('LI.FI routes failed:', error);
        return [];
    }
}

// Common token addresses
export const COMMON_TOKENS = {
    // Ethereum Mainnet
    1: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    // Arbitrum One
    42161: {
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    // Arbitrum Sepolia (mocks)
    421614: {
        mUSDC: '0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba',
        mWETH: '0xe4e118a0b252a631b19789d84f504b10167466e2',
    },
};

export const SUPPORTED_CHAINS = [1, 10, 137, 42161, 421614];
