export const CHAINS = {
    HYPERLIQUID_EVM_TESTNET: {
        chainId: 998,
        name: 'HyperEVM Testnet',
        rpc: 'https://rpc.hyperliquid-testnet.xyz/evm',
        explorer: 'https://testnet.hyperliquid.xyz',
    },
    HYPERLIQUID_EVM_MAINNET: {
        chainId: 999,
        name: 'HyperEVM',
        rpc: 'https://rpc.hyperliquid.xyz/evm',
        explorer: 'https://hyperliquid.xyz',
    },
    ARBITRUM_SEPOLIA: {
        chainId: 421614,
        name: 'Arbitrum Sepolia',
        rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
        explorer: 'https://sepolia.arbiscan.io',
    },
} as const;

// Use HyperEVM testnet for hackathon
export const ACTIVE_CHAIN = CHAINS.HYPERLIQUID_EVM_TESTNET;

export type ChainConfig = typeof CHAINS[keyof typeof CHAINS];
