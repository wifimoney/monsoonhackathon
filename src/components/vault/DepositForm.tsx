'use client';

import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import {
    usePoolInfo,
    useTokenBalance,
    useTokenAllowance,
    useApprove,
    useDeposit,
} from '@/lib/contracts/hooks';
import { HYPEREVM } from '@/lib/contracts/addresses';

export function DepositForm() {
    const { address } = useAccount();
    const [amount0, setAmount0] = useState('');
    const [amount1, setAmount1] = useState('');
    const [needsApproval0, setNeedsApproval0] = useState(false);
    const [needsApproval1, setNeedsApproval1] = useState(false);

    // Pool info
    const { data: poolInfo, isLoading: poolLoading } = usePoolInfo();

    // Balances
    const { data: balance0 } = useTokenBalance(poolInfo?.[1] || '', address);
    const { data: balance1 } = useTokenBalance(poolInfo?.[2] || '', address);

    // Allowances
    const { data: allowance0 } = useTokenAllowance(
        poolInfo?.[1] || '',
        address,
        HYPEREVM.MONSOON_ALM
    );
    const { data: allowance1 } = useTokenAllowance(
        poolInfo?.[2] || '',
        address,
        HYPEREVM.MONSOON_ALM
    );

    // Actions
    const { approve: approve0, isPending: approving0 } = useApprove(poolInfo?.[1] || '');
    const { approve: approve1, isPending: approving1 } = useApprove(poolInfo?.[2] || '');
    const { deposit, isPending: depositing, isSuccess } = useDeposit();

    // Check if approval needed
    useEffect(() => {
        const amt0 = amount0 ? parseEther(amount0) : 0n;
        const amt1 = amount1 ? parseEther(amount1) : 0n;

        setNeedsApproval0(allowance0 !== undefined && amt0 > allowance0);
        setNeedsApproval1(allowance1 !== undefined && amt1 > allowance1);
    }, [amount0, amount1, allowance0, allowance1]);

    const handleDeposit = async () => {
        if (!address) return;

        const amt0 = amount0 ? parseEther(amount0) : 0n;
        const amt1 = amount1 ? parseEther(amount1) : 0n;

        await deposit(amt0, amt1, 0n, address);
    };

    const handleApprove0 = async () => {
        await approve0(HYPEREVM.MONSOON_ALM, parseEther(amount0 || '0'));
    };

    const handleApprove1 = async () => {
        await approve1(HYPEREVM.MONSOON_ALM, parseEther(amount1 || '0'));
    };

    if (poolLoading) {
        return <div className="p-4">Loading pool info...</div>;
    }

    return (
        <div className="p-6 bg-gray-900 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Deposit Liquidity</h2>

            {/* Token 0 Input */}
            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">
                    Token 0 Amount
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={amount0}
                        onChange={(e) => setAmount0(e.target.value)}
                        placeholder="0.0"
                        className="flex-1 p-3 bg-gray-800 rounded border border-gray-700"
                    />
                    {needsApproval0 && (
                        <button
                            onClick={handleApprove0}
                            disabled={approving0}
                            className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                            {approving0 ? 'Approving...' : 'Approve'}
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    Balance: {balance0 ? formatEther(balance0) : '0'}
                </div>
            </div>

            {/* Token 1 Input */}
            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">
                    Token 1 Amount
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={amount1}
                        onChange={(e) => setAmount1(e.target.value)}
                        placeholder="0.0"
                        className="flex-1 p-3 bg-gray-800 rounded border border-gray-700"
                    />
                    {needsApproval1 && (
                        <button
                            onClick={handleApprove1}
                            disabled={approving1}
                            className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                            {approving1 ? 'Approving...' : 'Approve'}
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    Balance: {balance1 ? formatEther(balance1) : '0'}
                </div>
            </div>

            {/* Deposit Button */}
            <button
                onClick={handleDeposit}
                disabled={depositing || needsApproval0 || needsApproval1 || (!amount0 && !amount1)}
                className="w-full py-3 bg-blue-600 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
            >
                {depositing ? 'Depositing...' : 'Deposit'}
            </button>

            {isSuccess && (
                <div className="mt-4 p-3 bg-green-900 rounded text-green-200">
                    ✓ Deposit successful!
                </div>
            )}
        </div>
    );
}
