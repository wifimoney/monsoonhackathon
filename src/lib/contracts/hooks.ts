'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { HYPEREVM } from './addresses';
import { MONSOON_ALM_ABI, ERC20_ABI, HYPERCORE_QUOTER_ABI } from './abis';
import { parseUnits, formatUnits } from 'viem';

// ============ READ HOOKS ============

/**
 * Get pool information from MonsoonALM
 */
export function usePoolInfo() {
    return useReadContract({
        address: HYPEREVM.MONSOON_ALM as `0x${string}`,
        abi: MONSOON_ALM_ABI,
        functionName: 'getPoolInfo',
    });
}

/**
 * Get user's LP token balance
 */
export function useLPBalance(address: `0x${string}` | undefined) {
    return useReadContract({
        address: HYPEREVM.MONSOON_ALM as `0x${string}`,
        abi: MONSOON_ALM_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });
}

/**
 * Get user's token balance
 */
export function useTokenBalance(tokenAddress: string, userAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
        query: { enabled: !!userAddress && !!tokenAddress },
    });
}

/**
 * Get token allowance for MonsoonALM
 */
export function useTokenAllowance(tokenAddress: string, ownerAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: ownerAddress ? [ownerAddress, HYPEREVM.MONSOON_ALM as `0x${string}`] : undefined,
        query: { enabled: !!ownerAddress && !!tokenAddress },
    });
}

/**
 * Get oracle price from HyperCoreQuoter
 */
export function useOraclePrice() {
    return useReadContract({
        address: HYPEREVM.HYPERCORE_QUOTER as `0x${string}`,
        abi: HYPERCORE_QUOTER_ABI,
        functionName: 'getMidPrice',
    });
}

// ============ WRITE HOOKS ============

/**
 * Approve token spending
 */
export function useApproveToken() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const approve = async (tokenAddress: string, amount: bigint) => {
        writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [HYPEREVM.MONSOON_ALM as `0x${string}`, amount],
        });
    };

    return { approve, isPending, isConfirming, isSuccess, error, hash };
}

/**
 * Deposit tokens into MonsoonALM
 */
export function useDeposit() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const deposit = async (amount0: bigint, amount1: bigint, recipient: `0x${string}`) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'deposit',
            args: [amount0, amount1, recipient],
        });
    };

    return { deposit, isPending, isConfirming, isSuccess, error, hash };
}

/**
 * Withdraw tokens from MonsoonALM
 */
export function useWithdraw() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const withdraw = async (lpAmount: bigint, recipient: `0x${string}`) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'withdraw',
            args: [lpAmount, recipient],
        });
    };

    return { withdraw, isPending, isConfirming, isSuccess, error, hash };
}

/**
 * Allocate liquidity to OB (strategist only)
 */
export function useAllocateToOB() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const allocate = async (amount0: bigint, amount1: bigint) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'allocateToOB',
            args: [amount0, amount1],
        });
    };

    return { allocate, isPending, isConfirming, isSuccess, error, hash };
}

/**
 * Deallocate liquidity from OB (strategist only)
 */
export function useDeallocateFromOB() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const deallocate = async (amount0: bigint, amount1: bigint) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'deallocateFromOB',
            args: [amount0, amount1],
        });
    };

    return { deallocate, isPending, isConfirming, isSuccess, error, hash };
}

// ============ UTILITY FUNCTIONS ============

export function formatTokenAmount(amount: bigint | undefined, decimals: number = 18): string {
    if (!amount) return '0';
    return formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
    return parseUnits(amount, decimals);
}
