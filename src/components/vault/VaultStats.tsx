'use client';

import { formatEther } from 'viem';
import { usePoolInfo, useLPBalance } from '@/lib/contracts/hooks';
import { useAccount } from 'wagmi';

export function VaultStats() {
    const { address } = useAccount();
    const { data: poolInfo, isLoading } = usePoolInfo();
    const { data: lpBalance } = useLPBalance(address);

    if (isLoading) {
        return <div className="p-4">Loading...</div>;
    }

    if (!poolInfo) {
        return <div className="p-4">Failed to load pool info</div>;
    }

    const [
        poolAddress,
        token0Address,
        token1Address,
        totalReserve0,
        totalReserve1,
        ammReserve0,
        ammReserve1,
        obAlloc0,
        obAlloc1,
        lpTotalSupply,
        feeBps,
        isPaused,
        oraclePrice,
    ] = poolInfo;

    return (
        <div className="p-6 bg-gray-900 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Pool Statistics</h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Total Reserves */}
                <div className="p-4 bg-gray-800 rounded">
                    <div className="text-sm text-gray-400">Total Token0</div>
                    <div className="text-lg font-mono">{formatEther(totalReserve0)}</div>
                </div>
                <div className="p-4 bg-gray-800 rounded">
                    <div className="text-sm text-gray-400">Total Token1</div>
                    <div className="text-lg font-mono">{formatEther(totalReserve1)}</div>
                </div>

                {/* AMM Reserves */}
                <div className="p-4 bg-gray-800 rounded">
                    <div className="text-sm text-gray-400">AMM Token0</div>
                    <div className="text-lg font-mono">{formatEther(ammReserve0)}</div>
                </div>
                <div className="p-4 bg-gray-800 rounded">
                    <div className="text-sm text-gray-400">AMM Token1</div>
                    <div className="text-lg font-mono">{formatEther(ammReserve1)}</div>
                </div>

                {/* OB Allocations */}
                <div className="p-4 bg-gray-800 rounded">
                    <div className="text-sm text-gray-400">OB Alloc Token0</div>
                    <div className="text-lg font-mono text-yellow-500">{formatEther(obAlloc0)}</div>
                </div>
                <div className="p-4 bg-gray-800 rounded">
                    <div className="text-sm text-gray-400">OB Alloc Token1</div>
                    <div className="text-lg font-mono text-yellow-500">{formatEther(obAlloc1)}</div>
                </div>

                {/* Oracle Price */}
                <div className="p-4 bg-gray-800 rounded col-span-2">
                    <div className="text-sm text-gray-400">HyperCore Oracle Price</div>
                    <div className="text-2xl font-mono text-green-400">
                        ${formatEther(oraclePrice)}
                    </div>
                </div>

                {/* User LP Balance */}
                {lpBalance !== undefined && (
                    <div className="p-4 bg-blue-900 rounded col-span-2">
                        <div className="text-sm text-blue-300">Your LP Tokens</div>
                        <div className="text-xl font-mono">{formatEther(lpBalance)}</div>
                        <div className="text-xs text-gray-400">
                            {lpTotalSupply > 0n
                                ? `${((Number(lpBalance) / Number(lpTotalSupply)) * 100).toFixed(2)}% of pool`
                                : '0%'}
                        </div>
                    </div>
                )}

                {/* Status */}
                <div className="col-span-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span>{isPaused ? 'Paused' : 'Active'}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                        Fee: {Number(feeBps) / 100}%
                    </div>
                </div>
            </div>
        </div>
    );
}
