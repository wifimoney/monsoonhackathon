'use client';

import { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { usePoolInfo, useAllocateToOB, useDeallocateFromOB } from '@/lib/contracts/hooks';

export function RebalancePanel() {
    const { address } = useAccount();
    const { data: poolInfo } = usePoolInfo();
    const [allocAmount, setAllocAmount] = useState('');
    const [isBid, setIsBid] = useState(true);

    const { allocate, isPending: allocating } = useAllocateToOB();
    const { deallocate, isPending: deallocating } = useDeallocateFromOB();

    // Check if user is strategist
    const isStrategist = poolInfo && address &&
        address.toLowerCase() === poolInfo[0]?.toLowerCase(); // Simplified check

    const handleAllocate = async () => {
        const amount = parseEther(allocAmount || '0');
        if (isBid) {
            await allocate(0n, amount, true);
        } else {
            await allocate(amount, 0n, false);
        }
    };

    const handleDeallocateAll = async () => {
        if (!poolInfo) return;
        const [, , , , , , , obAlloc0, obAlloc1] = poolInfo;
        await deallocate(obAlloc0, obAlloc1);
    };

    if (!isStrategist) {
        return (
            <div className="p-6 bg-gray-900 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Strategist Panel</h2>
                <p className="text-gray-400">Only the strategist can access this panel.</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-900 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Strategist: Rebalance</h2>

            {/* Allocation Type */}
            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Order Type</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBid(true)}
                        className={`flex-1 py-2 rounded ${isBid ? 'bg-green-600' : 'bg-gray-700'
                            }`}
                    >
                        BID (Buy Token0)
                    </button>
                    <button
                        onClick={() => setIsBid(false)}
                        className={`flex-1 py-2 rounded ${!isBid ? 'bg-red-600' : 'bg-gray-700'
                            }`}
                    >
                        ASK (Sell Token0)
                    </button>
                </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">
                    Amount ({isBid ? 'Token1' : 'Token0'})
                </label>
                <input
                    type="number"
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-3 bg-gray-800 rounded border border-gray-700"
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleAllocate}
                    disabled={allocating || !allocAmount}
                    className="flex-1 py-3 bg-yellow-600 rounded font-bold hover:bg-yellow-700 disabled:opacity-50"
                >
                    {allocating ? 'Allocating...' : 'Allocate to OB'}
                </button>
                <button
                    onClick={handleDeallocateAll}
                    disabled={deallocating}
                    className="px-4 py-3 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                    {deallocating ? '...' : 'Reset All'}
                </button>
            </div>

            <p className="mt-4 text-sm text-gray-500">
                Allocating emits an event that the off-chain executor picks up to place orders on HyperCore.
            </p>
        </div>
    );
}
