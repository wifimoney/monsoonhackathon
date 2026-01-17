'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { switchChain, writeContract, waitForTransactionReceipt, readContract } from '@wagmi/core';
import { wagmiConfig } from '@/lib/wagmi';
import { parseUnits } from 'viem';

// HyperEVM config
const HYPEREVM = {
    chainId: 999,
    name: 'HyperEVM',
    usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f' as `0x${string}`,
    coreDepositWalletAddress: '0x6b9e773128f453f5c2c60935ee2de2cbc5390a24' as `0x${string}`,
};

// ERC20 ABI
const ERC20_ABI = [
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
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// CoreDepositWallet ABI
const CORE_DEPOSIT_WALLET_ABI = [
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDex', type: 'uint32' },
        ],
        outputs: [],
    },
] as const;

interface DepositFundsProps {
    onClose?: () => void;
}

export function DepositFunds({ onClose }: DepositFundsProps) {
    const { address, chain, isConnected } = useAccount();
    const [amount, setAmount] = useState('');
    const [destinationDex, setDestinationDex] = useState<'spot' | 'perps'>('spot');
    const [isLoading, setIsLoading] = useState(false);
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    if (!isConnected || !address) {
        return (
            <div className="card text-center py-12 min-w-[400px]">
                <div className="text-5xl mb-4">🔗</div>
                <h3 className="text-xl font-bold mb-2">Connect Wallet</h3>
                <p className="text-[var(--muted)]">
                    Please connect your wallet to deposit funds
                </p>
            </div>
        );
    }

    const handleDeposit = async () => {
        if (!amount || parseFloat(amount) <= 0) return;

        setIsLoading(true);
        setTxStatus('pending');
        setErrorMessage('');

        try {
            // Switch to HyperEVM if not already on it
            if (chain?.id !== HYPEREVM.chainId) {
                await switchChain(wagmiConfig, { chainId: HYPEREVM.chainId as any });
            }

            // Convert amount to BigInt (USDC has 6 decimals)
            const amountBigInt = parseUnits(amount, 6);

            // Check and approve USDC if needed
            const currentAllowance = await readContract(wagmiConfig, {
                address: HYPEREVM.usdcAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, HYPEREVM.coreDepositWalletAddress],
                chainId: HYPEREVM.chainId,
            });

            if (currentAllowance < amountBigInt) {
                const approveHash = await writeContract(wagmiConfig, {
                    address: HYPEREVM.usdcAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [HYPEREVM.coreDepositWalletAddress, amountBigInt],
                    chainId: HYPEREVM.chainId,
                });

                await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
            }

            // Deposit to HyperCore
            const destinationDexValue = destinationDex === 'spot' ? 4294967295 : 0;
            const depositHash = await writeContract(wagmiConfig, {
                address: HYPEREVM.coreDepositWalletAddress,
                abi: CORE_DEPOSIT_WALLET_ABI,
                functionName: 'deposit',
                args: [amountBigInt, destinationDexValue],
                chainId: HYPEREVM.chainId,
            });

            await waitForTransactionReceipt(wagmiConfig, { hash: depositHash });

            setTxStatus('success');
            
            // Auto-close after 2 seconds
            if (onClose) {
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (error: any) {
            const errorMsg = error?.message || error?.toString() || '';
            const isUserRejection =
                errorMsg.toLowerCase().includes('user rejected') ||
                errorMsg.toLowerCase().includes('user denied') ||
                error?.code === 4001 ||
                error?.code === 'ACTION_REJECTED';

            if (isUserRejection) {
                setTxStatus('idle');
                setErrorMessage('');
                return;
            }

            setErrorMessage(errorMsg || 'Deposit failed. Please try again.');
            setTxStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card min-w-[420px] max-w-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Deposit Funds</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl"
                    >
                        ✕
                    </button>
                )}
            </div>

            {txStatus === 'idle' && (
                <div className="space-y-4">
                    {/* Amount Input */}
                    <div className="card bg-black">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--muted)]">Amount</span>
                            <span className="text-sm text-[var(--muted)]">HyperEVM</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                className="flex-1 bg-transparent text-2xl font-bold focus:outline-none"
                            />
                            <div className="px-3 py-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] font-semibold">
                                USDC
                            </div>
                        </div>
                    </div>

                    {/* Destination Selection */}
                    <div className="card bg-black">
                        <label className="block text-sm font-semibold mb-3">
                            Deposit Destination
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDestinationDex('spot')}
                                className={`card p-4 text-left transition-all ${
                                    destinationDex === 'spot'
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                        : 'hover:border-[var(--primary)]/50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        destinationDex === 'spot'
                                            ? 'border-[var(--primary)] bg-[var(--primary)]'
                                            : 'border-[var(--card-border)]'
                                    }`}>
                                        {destinationDex === 'spot' && (
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold">Spot Account</div>
                                        <div className="text-xs text-[var(--muted)] mt-1">
                                            For spot trading
                                        </div>
                                    </div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDestinationDex('perps')}
                                className={`card p-4 text-left transition-all ${
                                    destinationDex === 'perps'
                                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                        : 'hover:border-[var(--primary)]/50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        destinationDex === 'perps'
                                            ? 'border-[var(--primary)] bg-[var(--primary)]'
                                            : 'border-[var(--card-border)]'
                                    }`}>
                                        {destinationDex === 'perps' && (
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold">Perps Account</div>
                                        <div className="text-xs text-[var(--muted)] mt-1">
                                            For perpetuals trading
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleDeposit}
                        disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                        className="btn btn-accent w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin">⟳</span>
                                Depositing...
                            </>
                        ) : (
                            'Deposit to HyperCore'
                        )}
                    </button>
                </div>
            )}

            {txStatus === 'pending' && (
                <div className="text-center py-8">
                    <div className="text-5xl mb-4 animate-spin">⟳</div>
                    <h4 className="text-lg font-bold mb-2">Processing Deposit</h4>
                    <p className="text-[var(--muted)] text-sm">
                        Depositing {amount} USDC to {destinationDex === 'spot' ? 'Spot' : 'Perps'} account...
                    </p>
                </div>
            )}

            {txStatus === 'success' && (
                <div className="text-center py-8">
                    <div className="text-5xl mb-4">✓</div>
                    <h4 className="text-lg font-bold text-[var(--accent)] mb-2">Deposit Successful!</h4>
                    <p className="text-[var(--muted)] text-sm mb-4">
                        {amount} USDC deposited to HyperCore {destinationDex === 'spot' ? 'Spot' : 'Perps'} account
                    </p>
                </div>
            )}

            {txStatus === 'error' && (
                <div className="text-center py-8">
                    <div className="text-5xl mb-4">✗</div>
                    <h4 className="text-lg font-bold text-[var(--danger)] mb-2">Deposit Failed</h4>
                    <p className="text-[var(--muted)] text-sm mb-4">
                        {errorMessage}
                    </p>
                    <button
                        onClick={() => setTxStatus('idle')}
                        className="btn btn-secondary"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}

