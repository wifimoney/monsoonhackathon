// Monsoon ALM ABI (key functions)
export const MONSOON_ALM_ABI = [
    // Read functions
    {
        name: 'getPoolInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'pool', type: 'address' },
            { name: 'token0', type: 'address' },
            { name: 'token1', type: 'address' },
            { name: 'reserve0', type: 'uint256' },
            { name: 'reserve1', type: 'uint256' },
            { name: 'obAllocation0', type: 'uint256' },
            { name: 'obAllocation1', type: 'uint256' },
            { name: 'ammReserve0', type: 'uint256' },
            { name: 'ammReserve1', type: 'uint256' },
            { name: 'feeRate', type: 'uint256' },
            { name: 'totalSupply', type: 'uint256' },
            { name: 'oraclePrice', type: 'uint256' },
        ],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    // Write functions
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
            { name: 'recipient', type: 'address' },
        ],
        outputs: [{ name: 'lpMinted', type: 'uint256' }],
    },
    {
        name: 'withdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'lpAmount', type: 'uint256' },
            { name: 'recipient', type: 'address' },
        ],
        outputs: [
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
    },
    {
        name: 'allocateToOB',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'deallocateFromOB',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount0', type: 'uint256' },
            { name: 'amount1', type: 'uint256' },
        ],
        outputs: [],
    },
    // Events
    {
        name: 'Deposit',
        type: 'event',
        inputs: [
            { name: 'provider', type: 'address', indexed: true },
            { name: 'amount0', type: 'uint256', indexed: false },
            { name: 'amount1', type: 'uint256', indexed: false },
            { name: 'lpMinted', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'Withdraw',
        type: 'event',
        inputs: [
            { name: 'provider', type: 'address', indexed: true },
            { name: 'lpBurned', type: 'uint256', indexed: false },
            { name: 'amount0', type: 'uint256', indexed: false },
            { name: 'amount1', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'AllocateToOB',
        type: 'event',
        inputs: [
            { name: 'amount0', type: 'uint256', indexed: false },
            { name: 'amount1', type: 'uint256', indexed: false },
        ],
    },
] as const;

// ERC20 ABI (standard functions)
export const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
    {
        name: 'symbol',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
] as const;

// HyperCore Quoter ABI
export const HYPERCORE_QUOTER_ABI = [
    {
        name: 'getMidPrice',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'isPrecompileActive',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'updateFallbackPrice',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'newPrice', type: 'uint256' }],
        outputs: [],
    },
] as const;

// Sovereign Pool ABI (minimal)
export const SOVEREIGN_POOL_ABI = [
    {
        name: 'getReserves',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'reserve0', type: 'uint256' },
            { name: 'reserve1', type: 'uint256' },
        ],
    },
    {
        name: 'token0',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'token1',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
] as const;
