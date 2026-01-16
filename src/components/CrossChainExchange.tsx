'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

const ORIGIN_CHAINS = [
    { id: 1, name: 'Ethereum', icon: 'ETH' },
    { id: 42161, name: 'Arbitrum', icon: 'ARB' },
    { id: 10, name: 'Optimism', icon: 'OP' },
    { id: 137, name: 'Polygon', icon: 'MATIC' },
    { id: 8453, name: 'Base', icon: 'BASE' },
    { id: 56, name: 'BNB Chain', icon: 'BNB' },
    { id: 43114, name: 'Avalanche', icon: 'AVAX' },
];

const ASSETS: Record<number, { symbol: string; name: string; address: string }[]> = {
    1: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'WETH', name: 'Wrapped ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    ],
    42161: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
        { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
    ],
    10: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
        { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042' },
    ],
    137: [
        { symbol: 'MATIC', name: 'Polygon', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
        { symbol: 'WETH', name: 'Wrapped ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' },
    ],
    8453: [
        { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    ],
    56: [
        { symbol: 'BNB', name: 'BNB', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
        { symbol: 'USDT', name: 'Tether', address: '0x55d398326f99059fF775485246999027B3197955' },
    ],
    43114: [
        { symbol: 'AVAX', name: 'Avalanche', address: '0x0000000000000000000000000000000000000000' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
    ],
};

// HyperEVM chain config
const HYPEREVM = {
    chainId: 999,
    name: 'HyperEVM',
    usdcAddress: '0x...' // HyperEVM USDC address
};

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

    const availableAssets = selectedChain ? ASSETS[selectedChain] || [] : [];
    const selectedChainData = ORIGIN_CHAINS.find(c => c.id === selectedChain);
    const selectedAssetData = availableAssets.find(a => a.symbol === selectedAsset);

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

        try {
            // Simulate exchange - in production, integrate with LiFi SDK
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Here you would call LiFi SDK to perform the cross-chain swap
            // Example:
            // const route = await getRoutes({
            //     fromChainId: selectedChain,
            //     fromTokenAddress: selectedAssetData?.address,
            //     toChainId: HYPEREVM.chainId,
            //     toTokenAddress: HYPEREVM.usdcAddress,
            //     fromAmount: parseUnits(amount, 18).toString(),
            //     fromAddress: address,
            // });

            setTxStatus('success');
        } catch (error) {
            console.error('Exchange failed:', error);
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
                            {ORIGIN_CHAINS.map((chain) => (
                                <button
                                    key={chain.id}
                                    onClick={() => handleChainSelect(chain.id)}
                                    className="card py-4 text-center hover:border-[var(--primary)] transition-all"
                                >
                                    <div className="text-2xl mb-2">{chain.icon}</div>
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
                            className="btn btn-accent w-full py-4"
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
                            Something went wrong. Please try again.
                        </p>
                        <button onClick={resetForm} className="btn btn-secondary">
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
