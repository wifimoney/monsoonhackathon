import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { HYPEREVM, MONSOON_ALM_ABI, ERC20_ABI } from './index';

// ============ READ HOOKS ============

export function usePoolInfo() {
    return useReadContract({
        address: HYPEREVM.MONSOON_ALM as `0x${string}`,
        abi: MONSOON_ALM_ABI,
        functionName: 'getPoolInfo',
        query: {
            refetchInterval: 10000, // 10 seconds
        },
    });
}

export function useLPBalance(address: string | undefined) {
    return useReadContract({
        address: HYPEREVM.MONSOON_ALM as `0x${string}`,
        abi: MONSOON_ALM_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        },
    });
}

export function useSwapQuote(isZeroToOne: boolean, amountIn: bigint) {
    return useReadContract({
        address: HYPEREVM.MONSOON_ALM as `0x${string}`,
        abi: MONSOON_ALM_ABI,
        functionName: 'getAmountOut',
        args: [isZeroToOne, amountIn],
        query: {
            enabled: amountIn > 0n,
            refetchInterval: 5000,
        },
    });
}

export function useTokenBalance(tokenAddress: string, userAddress: string | undefined) {
    return useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
        query: {
            enabled: !!userAddress,
        },
    });
}

export function useTokenAllowance(
    tokenAddress: string,
    ownerAddress: string | undefined,
    spenderAddress: string
) {
    return useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: ownerAddress ? [ownerAddress, spenderAddress] : undefined,
        query: {
            enabled: !!ownerAddress,
        },
    });
}

// ============ WRITE HOOKS ============

export function useDeposit() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const deposit = async (
        amount0: bigint,
        amount1: bigint,
        minShares: bigint,
        recipient: string
    ) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'deposit',
            args: [amount0, amount1, minShares, recipient],
        });
    };

    return { deposit, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const withdraw = async (
        shares: bigint,
        minAmount0: bigint,
        minAmount1: bigint,
        recipient: string
    ) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'withdraw',
            args: [shares, minAmount0, minAmount1, recipient],
        });
    };

    return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useApprove(tokenAddress: string) {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const approve = async (spender: string, amount: bigint) => {
        writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spender, amount],
        });
    };

    return { approve, hash, isPending, isConfirming, isSuccess, error };
}

// ============ STRATEGIST HOOKS ============

export function useAllocateToOB() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const allocate = async (amount0: bigint, amount1: bigint, isBid: boolean) => {
        writeContract({
            address: HYPEREVM.MONSOON_ALM as `0x${string}`,
            abi: MONSOON_ALM_ABI,
            functionName: 'allocateToOB',
            args: [amount0, amount1, isBid],
        });
    };

    return { allocate, hash, isPending, isConfirming, isSuccess, error };
}

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

    return { deallocate, hash, isPending, isConfirming, isSuccess, error };
}
