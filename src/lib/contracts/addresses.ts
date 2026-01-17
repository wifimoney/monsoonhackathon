export const HYPEREVM = {
    // Re-purposing HYPEREVM config for Arbitrum Sepolia (Hackathon Demo)
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',

    // Valantis Core (Mocks were used if factories not found)
    PROTOCOL_FACTORY: '0x2746977b2921af42984f7d7f64597890d6e7f351', // MockFactory
    SOVEREIGN_POOL_FACTORY: '0x2746977b2921af42984f7d7f64597890d6e7f351', // MockFactory
    SWAP_ROUTER: '0x0000000000000000000000000000000000000000', // Not used in demo

    // Tokens
    TOKEN0: '0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba',
    TOKEN1: '0xe4e118a0b252a631b19789d84f504b10167466e2',
    WHYPE: '0x5555555555555555555555555555555555555555', // Legacy

    // Monsoon deployments (ARBITRUM SEPOLIA)
    HYPERCORE_QUOTER: '0x37f4e2a0a4a59f2a0405c4e539a39d90cf355d84',
    SOVEREIGN_POOL: '0x82b785a3ab55772c88381c4387083399422cdfcd',
    MONSOON_ALM: '0x63825fb627b0e85b2f70a3b42fe530c7e6d72498',
} as const;

export const ARBITRUM_SEPOLIA = {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',

    // Salt contracts (for testing)
    SALT_ACCOUNT_FACTORY: '0x...', // Your deployed factory
} as const;
