// Single Source of Truth - Deployed Addresses
// Import from contracts/addresses.arbitrum-sepolia.json

import addressesJson from '../../../contracts/addresses.hyperevm-testnet.json';

// Type definitions
interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
}

interface DeployedAddresses {
    network: string;
    chainId: number;
    rpcUrl: string;
    blockExplorer: string;
    contracts: {
        MonsoonALM: string;
        HyperCoreQuoter: string;
        SovereignPool: string;
        MockFactory: string;
    };
    tokens: {
        TOKEN0: TokenInfo;
        TOKEN1: TokenInfo;
    };
    roles: {
        deployer: string;
        strategist: string;
        priceUpdater: string;
        executor: string;
    };
}

// Export typed addresses
export const DEPLOYED = addressesJson as DeployedAddresses;

// Convenience exports for backward compatibility
export const HYPEREVM = {
    chainId: DEPLOYED.chainId,
    name: DEPLOYED.network,
    rpcUrl: DEPLOYED.rpcUrl,
    blockExplorer: DEPLOYED.blockExplorer,

    // Contracts
    MONSOON_ALM: DEPLOYED.contracts.MonsoonALM,
    HYPERCORE_QUOTER: DEPLOYED.contracts.HyperCoreQuoter,
    SOVEREIGN_POOL: DEPLOYED.contracts.SovereignPool,
    PROTOCOL_FACTORY: DEPLOYED.contracts.MockFactory,
    SOVEREIGN_POOL_FACTORY: DEPLOYED.contracts.MockFactory,
    SWAP_ROUTER: '0x0000000000000000000000000000000000000000',

    // Tokens
    TOKEN0: DEPLOYED.tokens.TOKEN0.address,
    TOKEN1: DEPLOYED.tokens.TOKEN1.address,
    USDC_TESTNET: '0xd9CBEC81df392A88AEff575E962d149d57F4d6bc', // Official HyperEVM Testnet USDC
    WHYPE: '0x5555555555555555555555555555555555555555', // Legacy placeholder
} as const;

export const ARBITRUM_SEPOLIA = {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    SALT_ACCOUNT_FACTORY: '0x...', // Not deployed
} as const;

// Token metadata
export const TOKEN_METADATA = {
    TOKEN0: DEPLOYED.tokens.TOKEN0,
    TOKEN1: DEPLOYED.tokens.TOKEN1,
} as const;
