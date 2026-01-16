'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { getWalletClient, switchChain } from '@wagmi/core';
import { executeRoute, getRoutes, createConfig, EVM } from '@lifi/sdk';
import { arbitrum, mainnet, optimism, polygon, base, bsc, avalanche, hyperEvm } from 'viem/chains';
import { wagmiConfig } from '@/lib/wagmi';

// Use viem chain definitions
const SUPPORTED_CHAINS = [mainnet, arbitrum, optimism, polygon, base, bsc, avalanche, hyperEvm];

const CHAIN_ICONS: Record<number, string> = {
    [mainnet.id]: 'ETH',
    [arbitrum.id]: 'ARB',
    [optimism.id]: 'OP',
    [polygon.id]: 'MATIC',
    [base.id]: 'BASE',
    [bsc.id]: 'BNB',
    [avalanche.id]: 'AVAX',
};

const ASSETS: Record<number, { symbol: string; name: string; address: string; decimals: number }[]> = {
    1: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    ],
    42161: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
        { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
    ],
    10: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
        { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18 },
    ],
    137: [
        { symbol: 'MATIC', name: 'Polygon', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    ],
    8453: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    ],
    56: [
        { symbol: 'BNB', name: 'BNB', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 }, // BSC USDC has 18 decimals
        { symbol: 'USDT', name: 'Tether', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 }, // BSC USDT has 18 decimals
    ],
    43114: [
        { symbol: 'AVAX', name: 'Avalanche', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    ],
};

// Convert human-readable amount to token amount with decimals
const parseTokenAmount = (amount: string, decimals: number): string => {
    if (!amount || isNaN(parseFloat(amount))) return '0';

    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    const result = whole + paddedFraction;

    // Remove leading zeros but keep at least one digit
    return result.replace(/^0+/, '') || '0';
};

// Format token amount from raw to human-readable
const formatTokenAmount = (amount: string, decimals: number): string => {
    if (!amount || amount === '0') return '0';

    const padded = amount.padStart(decimals + 1, '0');
    const whole = padded.slice(0, -decimals) || '0';
    const fraction = padded.slice(-decimals);

    // Remove trailing zeros from fraction
    const trimmedFraction = fraction.replace(/0+$/, '');

    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
};

// HyperEVM chain config
const HYPEREVM = {
    chainId: 999,
    name: 'HyperEVM',
    usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f'
};

// Configure LiFi SDK at module level using wagmi/core functions
createConfig({
    integrator: 'Monsoon',
    providers: [
        EVM({
            getWalletClient: () => getWalletClient(wagmiConfig),
            switchChain: async (chainId) => {
                console.log(`[LiFi] Switching chain to ${chainId}...`);
                const chain = await switchChain(wagmiConfig, { chainId } as any);
                console.log(`[LiFi] Chain switched to ${chain.name} (${chain.id})`);
                return getWalletClient(wagmiConfig, { chainId: chain.id });
            },
        }),
    ],
});

interface CrossChainExchangeProps {
    onClose?: () => void;
}

export function CrossChainExchange({ onClose }: CrossChainExchangeProps) {
    const { isConnected, address } = useAccount();
    const [selectedChain, setSelectedChain] = useState<number | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'chain' | 'asset' | 'amount' | 'confirm'>('chain');
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const availableAssets = selectedChain ? ASSETS[selectedChain] || [] : [];
    const selectedChainData = SUPPORTED_CHAINS.find((c) => c.id === selectedChain);
    const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset);

    const handleChainSelect = (chainId: number) => {
        setSelectedChain(chainId);
        setSelectedAsset(null);
        setStep('asset');
    };

    const handleAssetSelect = (symbol: string) => {
        setSelectedAsset(symbol);
        setStep('amount');
    };

    const handleBack = () => {
        if (step === 'asset') {
            setStep('chain');
            setSelectedChain(null);
        } else if (step === 'amount') {
            setStep('asset');
            setSelectedAsset(null);
        } else if (step === 'confirm') {
            setStep('amount');
        }
    };

    const handleContinue = () => {
        if (step === 'amount' && amount) {
            setStep('confirm');
        }
    };

    const handleExchange = async () => {
        if (!selectedChain || !selectedAsset || !amount) return;

        setIsLoading(true);
        setTxStatus('pending');

        console.log('\n========== CROSS-CHAIN EXCHANGE STARTED ==========');
        console.log(`[Exchange] From: ${amount} ${selectedAsset} on ${selectedChainData?.name} (Chain ID: ${selectedChain})`);
        console.log(`[Exchange] To: USDC on HyperEVM (Chain ID: ${HYPEREVM.chainId})`);
        console.log(`[Exchange] User Address: ${address}`);
        console.log('===================================================\n');

        try {
            if (!selectedAssetData?.address) {
                throw new Error('Selected asset address is not defined');
            }

            // Convert amount to token units with correct decimals
            const tokenAmount = parseTokenAmount(amount, selectedAssetData.decimals);
            console.log(`[LiFi] Token amount: ${amount} ${selectedAsset} = ${tokenAmount} (${selectedAssetData.decimals} decimals)`);

            // Get routes from LiFi with slippage tolerance
            console.log('[LiFi] Fetching routes...');
            const result = await getRoutes({
                fromChainId: selectedChain,
                fromTokenAddress: selectedAssetData.address,
                toChainId: HYPEREVM.chainId,
                toTokenAddress: HYPEREVM.usdcAddress,
                fromAmount: tokenAmount,
                fromAddress: address,
                options: {
                    slippage: 0.03, // 3% slippage tolerance
                    order: 'RECOMMENDED',
                },
            });

            console.log(`[LiFi] Found ${result.routes.length} route(s)`);

            if (result.routes.length === 0) {
                throw new Error('No route found');
            }

            const route = result.routes[0];
            const fromTokenDecimals = route.fromToken?.decimals || 18;
            const toTokenDecimals = route.toToken?.decimals || 6; // USDC default
            console.log('[LiFi] Selected route:', {
                id: route.id,
                fromToken: route.fromToken?.symbol,
                toToken: route.toToken?.symbol,
                fromAmount: `${formatTokenAmount(route.fromAmount, fromTokenDecimals)} ${route.fromToken?.symbol}`,
                toAmount: `${formatTokenAmount(route.toAmount, toTokenDecimals)} ${route.toToken?.symbol}`,
                steps: route.steps?.length,
            });

            // Execute the route using the configured wallet client
            console.log('\n[LiFi] Executing route...');
            const executedRoute = await executeRoute(route, {
                updateRouteHook(updatedRoute) {
                    const currentStep = updatedRoute.steps?.find(
                        (step) => step.execution?.status === 'PENDING' || step.execution?.status === 'ACTION_REQUIRED'
                    );

                    console.log('\n[LiFi] Route Update:');
                    console.log(`  Status: ${updatedRoute.steps?.map(s => s.execution?.status || 'NOT_STARTED').join(' -> ')}`);

                    if (currentStep) {
                        console.log(`  Current Step: ${currentStep.type} - ${currentStep.tool}`);
                        if (currentStep.execution?.process) {
                            currentStep.execution.process.forEach((proc) => {
                                console.log(`    Process: ${proc.type} - ${proc.status} ${proc.txHash ? `(TX: ${proc.txHash})` : ''}`);
                            });
                        }
                    }

                    // Log completed steps
                    updatedRoute.steps?.forEach((step, index) => {
                        if (step.execution?.status === 'DONE') {
                            const lastProcess = step.execution.process?.[step.execution.process.length - 1];
                            if (lastProcess?.txHash) {
                                console.log(`  Step ${index + 1} Complete - TX: ${lastProcess.txHash}`);
                            }
                        }
                    });
                }
            });

            if (!executedRoute) {
                throw new Error('Exchange failed');
            }

            console.log('\n========== EXCHANGE SUCCESSFUL ==========');
            console.log(`[Exchange] ${amount} ${selectedAsset} -> USDC on HyperEVM`);
            console.log('==========================================\n');

            setTxStatus('success');
        } catch (error: any) {
            console.error('\n========== EXCHANGE FAILED ==========');
            console.error('[Exchange] Error:', error);
            console.error('======================================\n');

            // Check if user rejected the transaction
            const errorMsg = error?.message || error?.toString() || '';
            const isUserRejection =
                errorMsg.toLowerCase().includes('user rejected') ||
                errorMsg.toLowerCase().includes('user denied') ||
                errorMsg.toLowerCase().includes('rejected by user') ||
                errorMsg.toLowerCase().includes('user cancelled') ||
                errorMsg.toLowerCase().includes('user canceled') ||
                error?.code === 4001 || // MetaMask user rejection code
                error?.code === 'ACTION_REJECTED';

            if (isUserRejection) {
                setErrorMessage('Transaction rejected. You can try again when ready.');
            } else if (errorMsg.includes('No route found')) {
                setErrorMessage('No route found for this swap. Try a different amount or token.');
            } else {
                setErrorMessage(errorMsg || 'Something went wrong. Please try again.');
            }

            setTxStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedChain(null);
        setSelectedAsset(null);
        setAmount('');
        setStep('chain');
        setTxStatus('idle');
        setErrorMessage('');
    };

    const retryTransaction = () => {
        setTxStatus('idle');
        setErrorMessage('');
    };

    if (!isConnected) {
        return (
            <div className="card text-center py-12 min-w-[400px]">
                <div className="text-5xl mb-4">🔗</div>
                <h3 className="text-xl font-bold mb-2">Connect Wallet</h3>
                <p className="text-[var(--muted)]">
                    Connect your wallet to exchange assets
                </p>
            </div>
        );
    }

    return (
        <div className="card min-w-[420px] max-w-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    {step !== 'chain' && (
                        <button
                            onClick={handleBack}
                            className="w-8 h-8 rounded-lg bg-[var(--card-border)] flex items-center justify-center hover:bg-[var(--primary)]/20 transition-colors"
                        >
                            ←
                        </button>
                    )}
                    <h3 className="text-xl font-bold">Exchange to HyperEVM</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-6">
                {['chain', 'asset', 'amount', 'confirm'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            step === s
                                ? 'bg-[var(--primary)] text-white'
                                : ['chain', 'asset', 'amount', 'confirm'].indexOf(step) > i
                                    ? 'bg-[var(--accent)] text-white'
                                    : 'bg-[var(--card-border)] text-[var(--muted)]'
                        }`}>
                            {i + 1}
                        </div>
                        {i < 3 && (
                            <div className={`flex-1 h-1 rounded ${
                                ['chain', 'asset', 'amount', 'confirm'].indexOf(step) > i
                                    ? 'bg-[var(--accent)]'
                                    : 'bg-[var(--card-border)]'
                            }`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="space-y-4">
                {/* Step 1: Select Chain */}
                {step === 'chain' && (
                    <>
                        <p className="text-[var(--muted)] text-sm">Select your origin chain</p>
                        <div className="grid grid-cols-2 gap-3">
                            {SUPPORTED_CHAINS.map((chain) => (
                                <button
                                    key={chain.id}
                                    onClick={() => handleChainSelect(chain.id)}
                                    className="card py-4 text-center hover:border-[var(--primary)] transition-all"
                                >
                                    <div className="text-2xl mb-2">{CHAIN_ICONS[chain.id]}</div>
                                    <div className="font-semibold">{chain.name}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Step 2: Select Asset */}
                {step === 'asset' && (
                    <>
                        <p className="text-[var(--muted)] text-sm">
                            Select asset from {selectedChainData?.name}
                        </p>
                        <div className="space-y-2">
                            {availableAssets.map((asset) => (
                                <button
                                    key={asset.symbol}
                                    onClick={() => handleAssetSelect(asset.symbol)}
                                    className="card w-full py-4 flex items-center gap-4 hover:border-[var(--primary)] transition-all"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center font-bold">
                                        {asset.symbol.slice(0, 2)}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">{asset.symbol}</div>
                                        <div className="text-sm text-[var(--muted)]">{asset.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Step 3: Enter Amount */}
                {step === 'amount' && (
                    <>
                        <p className="text-[var(--muted)] text-sm">Enter amount to exchange</p>

                        <div className="card bg-black">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--muted)]">From</span>
                                <span className="text-sm text-[var(--muted)]">{selectedChainData?.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0"
                                    className="flex-1 bg-transparent text-2xl font-bold focus:outline-none"
                                />
                                <div className="px-3 py-2 rounded-lg bg-[var(--card)] font-semibold">
                                    {selectedAsset}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center text-2xl text-[var(--muted)]">
                            ↓
                        </div>

                        <div className="card bg-black">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--muted)]">To</span>
                                <span className="text-sm text-[var(--muted)]">HyperEVM</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 text-2xl font-bold text-[var(--muted)]">
                                    {amount ? '~' + amount : '0.0'}
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] font-semibold">
                                    USDC
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleContinue}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="btn btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    </>
                )}

                {/* Step 4: Confirm */}
                {step === 'confirm' && txStatus === 'idle' && (
                    <>
                        <p className="text-[var(--muted)] text-sm">Review your exchange</p>

                        <div className="space-y-3">
                            <div className="card bg-black flex items-center justify-between">
                                <span className="text-[var(--muted)]">From</span>
                                <span className="font-semibold">{amount} {selectedAsset} on {selectedChainData?.name}</span>
                            </div>
                            <div className="card bg-black flex items-center justify-between">
                                <span className="text-[var(--muted)]">To</span>
                                <span className="font-semibold text-[var(--accent)]">~{amount} USDC on HyperEVM</span>
                            </div>
                            <div className="card bg-black flex items-center justify-between">
                                <span className="text-[var(--muted)]">Recipient</span>
                                <span className="font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleExchange}
                            disabled={isLoading}
                            className="btn btn-accent w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Exchange
                        </button>
                    </>
                )}

                {/* Transaction Status */}
                {txStatus === 'pending' && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4 animate-spin">⟳</div>
                        <h4 className="text-lg font-bold mb-2">Processing Exchange</h4>
                        <p className="text-[var(--muted)] text-sm">
                            Bridging {amount} {selectedAsset} to USDC on HyperEVM...
                        </p>
                    </div>
                )}

                {txStatus === 'success' && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">✓</div>
                        <h4 className="text-lg font-bold text-[var(--accent)] mb-2">Exchange Successful!</h4>
                        <p className="text-[var(--muted)] text-sm mb-4">
                            {amount} {selectedAsset} exchanged to USDC on HyperEVM
                        </p>
                        <button onClick={resetForm} className="btn btn-secondary">
                            New Exchange
                        </button>
                    </div>
                )}

                {txStatus === 'error' && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">✗</div>
                        <h4 className="text-lg font-bold text-[var(--danger)] mb-2">Exchange Failed</h4>
                        <p className="text-[var(--muted)] text-sm mb-4">
                            {errorMessage}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={retryTransaction} className="btn btn-primary">
                                Try Again
                            </button>
                            <button onClick={resetForm} className="btn btn-secondary">
                                Start Over
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
