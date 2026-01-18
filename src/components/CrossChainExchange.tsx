'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getWalletClient, switchChain, writeContract, waitForTransactionReceipt, readContract, getChainId, getPublicClient } from '@wagmi/core';
import { executeRoute, createConfig, EVM } from '@lifi/sdk';
import { arbitrum, mainnet, optimism, polygon, base, bsc, avalanche } from 'viem/chains';
import { wagmiConfig, allChains } from '@/lib/wagmi';
import { parseUnits } from 'viem';

// Use viem chain definitions - get hyperEvm from wagmi config
const hyperEvm = allChains.find(c => c.id === 999);
if (!hyperEvm) {
    throw new Error('HyperEVM chain not found in wagmi config');
}
const SUPPORTED_CHAINS = [mainnet, arbitrum, optimism, polygon, base, bsc, avalanche, hyperEvm];

const CHAIN_ICONS: Record<number, string> = {
    [mainnet.id]: 'ETH',
    [arbitrum.id]: 'ARB',
    [optimism.id]: 'OP',
    [polygon.id]: 'MATIC',
    [base.id]: 'BASE',
    [bsc.id]: 'BNB',
    [avalanche.id]: 'AVAX',
    [hyperEvm.id]: 'HYPE',
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
    // HyperEVM assets - for direct deposit to Hyperliquid
    999: [
        { symbol: 'USDC', name: 'USD Coin', address: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', decimals: 6 },
    ],
};

// Map chain IDs to LiFi chain identifiers (uppercase format for token API)
const LIFI_CHAIN_MAP: Record<number, string> = {
    1: 'ETH',           // Ethereum
    42161: 'ARB1',      // Arbitrum One
    10: 'OPE',          // Optimism
    137: 'POL',         // Polygon
    8453: 'BAS',        // Base
    56: 'BSC',          // BSC
    43114: 'AVA',       // Avalanche
    999: '999',         // HyperEVM (using chain ID directly)
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
    usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
    // CoreDepositWallet contract - handles transfers from HyperEVM to HyperCore
    // Contract address from Hyperliquid mainnet
    coreDepositWalletAddress: '0x6b9e773128f453f5c2c60935ee2de2cbc5390a24' as `0x${string}`,
};

// ERC20 ABI for approve and transfer functions
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

// CoreDepositWallet ABI - for depositing USDC from HyperEVM to HyperCore
// destinationDex: 0 = Perps, 4294967295 (uint32.max) = Spot
const CORE_DEPOSIT_WALLET_ABI = [
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDex', type: 'uint32' }, // 0 = Perps, 4294967295 = Spot
        ],
        outputs: [],
    },
] as const;

// Configure LiFi SDK at module level using wagmi/core functions
createConfig({
    integrator: 'Monsoon',
    providers: [
        EVM({
            getWalletClient: async () => {
                const walletClient = await getWalletClient(wagmiConfig);
                if (!walletClient) {
                    throw new Error('Wallet client not available. Please connect your wallet.');
                }
                return walletClient;
            },
            switchChain: async (chainId) => {
                console.log(`[LiFi] Switching chain to ${chainId}...`);
                try {
                    await switchChain(wagmiConfig, { chainId } as any);
                    const walletClient = await getWalletClient(wagmiConfig, { chainId });
                    if (!walletClient) {
                        throw new Error('Failed to get wallet client after chain switch');
                    }
                    console.log(`[LiFi] Chain switched to ${chainId}`);
                    return walletClient;
                } catch (error) {
                    console.error(`[LiFi] Failed to switch chain:`, error);
                    throw error;
                }
            },
        }),
    ],
});

interface CrossChainExchangeProps {
    onClose?: () => void;
}

export function CrossChainExchange({ onClose }: CrossChainExchangeProps) {
    const { isConnected, address, chain } = useAccount();
    const [selectedChain, setSelectedChain] = useState<number | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'chain' | 'asset' | 'amount' | 'confirm'>('chain');
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [destinationDex, setDestinationDex] = useState<'spot' | 'perps'>('spot'); // Spot = 4294967295, Perps = 0
    const [bridgedAmount, setBridgedAmount] = useState<string>(''); // Amount bridged to HyperEVM
    const [showDepositAfterBridge, setShowDepositAfterBridge] = useState(false); // Show deposit option after bridge
    const [progressStep, setProgressStep] = useState<number>(0); // 0 = not started, 1, 2, 3 = steps
    const [progressSteps, setProgressSteps] = useState<string[]>([]); // Array of step descriptions
    const [showDepositDropdown, setShowDepositDropdown] = useState(false); // Deposit dropdown visibility
    const [estimatedReceivedAmount, setEstimatedReceivedAmount] = useState<string>(''); // Estimated USDC received from LiFi route

    const availableAssets = selectedChain ? ASSETS[selectedChain] || [] : [];
    const selectedChainData = SUPPORTED_CHAINS.find((c) => c.id === selectedChain);
    const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset);
    const isHyperEVMSelected = selectedChain === HYPEREVM.chainId;

    // Calculate estimated received amount when amount/chain/asset changes (for cross-chain exchange)
    useEffect(() => {
        const calculateEstimatedAmount = async () => {
            // Only calculate for cross-chain exchanges (not HyperEVM direct deposits)
            if (isHyperEVMSelected || !selectedChain || !selectedAsset || !amount || !address) {
                setEstimatedReceivedAmount('');
                return;
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                setEstimatedReceivedAmount('');
                return;
            }

            try {
                const assetData = ASSETS[selectedChain]?.find((a) => a.symbol === selectedAsset);
                if (!assetData?.address) {
                    setEstimatedReceivedAmount('');
                    return;
                }

                // Get LiFi chain identifiers for token endpoint (uses uppercase chain keys like "ETH")
                const toChainKey = LIFI_CHAIN_MAP[HYPEREVM.chainId] || HYPEREVM.chainId.toString();

                // Get token info from LiFi API to verify decimals
                const fromTokenAddress = assetData.address === '0x0000000000000000000000000000000000000000' 
                    ? 'native' 
                    : assetData.address.toLowerCase();
                const toTokenAddress = HYPEREVM.usdcAddress.toLowerCase();

                // Fetch token info for destination USDC to get decimals using token API
                // Token API uses: chain={CHAIN_KEY}&token={TOKEN_SYMBOL} (e.g., "ETH" and "USDC")
                let toTokenDecimals = 6; // Default USDC decimals
                try {
                    const tokenResponse = await fetch(
                        `https://li.quest/v1/token?chain=${toChainKey}&token=USDC`
                    );
                    if (tokenResponse.ok) {
                        const tokenData = await tokenResponse.json();
                        if (tokenData?.decimals) {
                            toTokenDecimals = tokenData.decimals;
                        }
                    }
                } catch (tokenError) {
                    console.warn('[CrossChainExchange] Could not fetch token info, using default decimals:', tokenError);
                }

                // Convert amount to token units (as string for API)
                const tokenAmount = parseTokenAmount(amount, assetData.decimals);

                // Fetch quote from LiFi API to get estimated received amount
                // Quote endpoint uses numeric chain IDs (same as SDK)
                const quoteParams = new URLSearchParams({
                    fromChain: selectedChain.toString(),
                    toChain: HYPEREVM.chainId.toString(),
                    fromToken: fromTokenAddress,
                    toToken: toTokenAddress,
                    fromAmount: tokenAmount,
                    fromAddress: address || '',
                    slippage: '0.03', // 3% slippage tolerance
                });

                const quoteResponse = await fetch(`https://li.quest/v1/quote?${quoteParams.toString()}`);
                
                if (!quoteResponse.ok) {
                    throw new Error(`LiFi API error: ${quoteResponse.status} ${quoteResponse.statusText}`);
                }

                const quoteData = await quoteResponse.json();

                // Extract estimated received amount from quote response
                // The estimate.toAmount is in smallest units (raw amount)
                if (quoteData?.estimate?.toAmount) {
                    const toAmountRaw = quoteData.estimate.toAmount.toString();
                    const estimatedAmount = formatTokenAmount(toAmountRaw, toTokenDecimals);
                    setEstimatedReceivedAmount(estimatedAmount);
                } else if (quoteData?.toAmount) {
                    // Fallback: check root-level toAmount
                    const toAmountRaw = quoteData.toAmount.toString();
                    const estimatedAmount = formatTokenAmount(toAmountRaw, toTokenDecimals);
                    setEstimatedReceivedAmount(estimatedAmount);
                } else {
                    setEstimatedReceivedAmount('');
                }
            } catch (error) {
                console.error('[CrossChainExchange] Error calculating estimated amount:', error);
                setEstimatedReceivedAmount('');
            }
        };

        // Debounce the calculation
        const timeoutId = setTimeout(() => {
            calculateEstimatedAmount();
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(timeoutId);
    }, [amount, selectedChain, selectedAsset, address, isHyperEVMSelected]);

    const handleChainSelect = (chainId: number) => {
        setSelectedChain(chainId);
        setSelectedAsset(null);
        // If HyperEVM is selected, skip asset selection and go to amount
        if (chainId === HYPEREVM.chainId) {
            setSelectedAsset('USDC'); // Auto-select USDC for HyperEVM
            setStep('amount');
        } else {
        setStep('asset');
        }
    };

    const handleAssetSelect = (symbol: string) => {
        setSelectedAsset(symbol);
        setStep('amount');
    };

    const handleBack = () => {
        // If transaction is complete (success or error), reset the form instead of going back
        if (txStatus === 'success' || txStatus === 'error') {
            resetForm();
            return;
        }
        
        if (step === 'asset') {
            setStep('chain');
            setSelectedChain(null);
        } else if (step === 'amount') {
            if (isHyperEVMSelected) {
                setStep('chain');
                setSelectedChain(null);
                setSelectedAsset(null);
            } else {
            setStep('asset');
            setSelectedAsset(null);
            }
        } else if (step === 'confirm') {
            setStep('amount');
        }
    };

    const handleContinue = () => {
        if (step === 'amount' && amount) {
            setStep('confirm');
        }
    };

    const handleDeposit = async (depositAmountOverride?: string, depositChainOverride?: number, depositAssetOverride?: string) => {
        // Use override values if provided (for post-bridge deposits), otherwise use current state
        const depositAmount = depositAmountOverride || amount;
        const depositChain = depositChainOverride || selectedChain;
        const depositAsset = depositAssetOverride || selectedAsset;
        
        if (!depositChain || !depositAsset || !depositAmount || !address) return;

        setIsLoading(true);
        setTxStatus('pending');
        
        // Initialize progress steps for deposit
        // Check if we already have progress steps (from previous bridge)
        if (progressSteps.length === 3) {
            // Post-bridge deposit - continue from bridge progress
            // Update step 3 description with current destinationDex
            setProgressSteps([
                progressSteps[0], // Keep step 1: Sending tokens
                progressSteps[1], // Keep step 2: Receiving on HyperEVM
                `Depositing ${depositAmount} USDC to HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`
            ]);
            setProgressStep(3); // Step 3: Depositing (steps 1 and 2 are already complete)
        } else {
            // Direct deposit (no bridge) - only one step
            setProgressSteps([
                `Depositing ${depositAmount} USDC to HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`
            ]);
            setProgressStep(1);
        }

        console.log('\n========== DEPOSIT TO HYPERLIQUID STARTED ==========');
        console.log(`[Deposit] Amount: ${depositAmount} ${depositAsset} on HyperEVM`);
        console.log(`[Deposit] Account Address: ${address}`);
        console.log('===================================================\n');

        try {
            // Get asset data - use override if provided, otherwise use state
            const assetData = depositAssetOverride && depositChainOverride
                ? ASSETS[depositChainOverride]?.find((a) => a.symbol === depositAssetOverride)
                : selectedAssetData;
            
            if (!assetData?.address) {
                throw new Error('Selected asset address is not defined');
            }

            // Check if user is on HyperEVM network
            // Always check the actual wallet client, not just wagmi's state (which can be stale)
            const walletClientForCheck = await getWalletClient(wagmiConfig);
            let currentChainId = walletClientForCheck ? await walletClientForCheck.getChainId() : chain?.id;
            
            console.log(`[Deposit] Current chain check - Wagmi state: ${chain?.id}, Wallet client: ${currentChainId}`);
            
            if (currentChainId !== HYPEREVM.chainId) {
                console.log(`[Deposit] Switching to HyperEVM network...`);
                await switchChain(wagmiConfig, { chainId: HYPEREVM.chainId });
            }

            // Convert amount to token units
            const tokenAmount = parseTokenAmount(depositAmount, assetData.decimals);
            const amountBigInt = BigInt(tokenAmount);
            
            // Note: The contract will enforce minimum deposit amount for new accounts (1 USDC)
            // Existing accounts can deposit any amount. We let the contract handle validation
            // to avoid blocking existing accounts from making smaller deposits.
            
            // Warn user if depositing less than 1 USDC (might fail for new accounts)
            const depositAmountNum = parseFloat(depositAmount);
            if (depositAmountNum > 0 && depositAmountNum < 1) {
                console.warn(`[Deposit] Warning: Depositing ${depositAmount} USDC which is less than 1 USDC. This will fail if you don't have a HyperCore account yet.`);
            }

            console.log(`[Deposit] Preparing USDC deposit to Hyperliquid...`);
            console.log(`[Deposit] Amount: ${depositAmount} USDC = ${tokenAmount} (${assetData.decimals} decimals)`);
            console.log(`[Deposit] Amount in BigInt: ${amountBigInt.toString()}`);
            console.log(`[Deposit] Minimum required (1 USDC): 1000000`);
            console.log(`[Deposit] Amount check: ${amountBigInt >= BigInt('1000000') ? 'PASS' : 'FAIL'} (${amountBigInt.toString()} >= 1000000)`);

            // Step 1: Approve USDC spending to CoreDepositWallet contract
            const usdcAddress = assetData.address as `0x${string}`;
            const coreDepositWallet = HYPEREVM.coreDepositWalletAddress;

            // Contract address is now configured

            // Update progress: Starting deposit
            if (!isHyperEVMSelected) {
                setProgressStep(3); // Step 3: Depositing
            } else {
                setProgressStep(1);
            }

            // Verify we're on HyperEVM by checking wallet client directly
            // This check happens after the chain switch above, so we should be on HyperEVM
            const walletClient = await getWalletClient(wagmiConfig);
            if (!walletClient) {
                throw new Error('Wallet client not available');
            }
            
            // Double-check the chain ID from the wallet client (most reliable source)
            const actualChainId = await walletClient.getChainId();
            console.log(`[Deposit] Wallet client chain ID: ${actualChainId}, Expected: ${HYPEREVM.chainId}`);
            
            if (actualChainId !== HYPEREVM.chainId) {
                // If we're still not on HyperEVM, try switching again
                console.log(`[Deposit] Still not on HyperEVM, attempting chain switch again...`);
                try {
                    await switchChain(wagmiConfig, { chainId: HYPEREVM.chainId });
                    // Wait and verify the switch
                    let attempts = 0;
                    const maxAttempts = 30; // 15 seconds
                    while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const newChainId = await walletClient.getChainId();
                        if (newChainId === HYPEREVM.chainId) {
                            console.log(`[Deposit] Successfully switched to HyperEVM after retry`);
                            break;
                        }
                        attempts++;
                    }
                    
                    // Final check
                    const finalChainId = await walletClient.getChainId();
                    if (finalChainId !== HYPEREVM.chainId) {
                        throw new Error(`Failed to switch to HyperEVM. Current chain: ${finalChainId}. Please switch to HyperEVM (Chain ID: ${HYPEREVM.chainId}) manually in your wallet and try again.`);
                    }
                } catch (switchError: any) {
                    throw new Error(`Must be on HyperEVM to deposit. Current chain: ${actualChainId}. Please switch to HyperEVM (Chain ID: ${HYPEREVM.chainId}) in your wallet and try again. Error: ${switchError.message || 'Unknown error'}`);
                }
            }
            
            console.log(`[Deposit] Verified on HyperEVM (chain ID: ${actualChainId})`);
            console.log(`[Deposit] Wallet Address: ${address}`);
            console.log(`[Deposit] USDC Contract: ${usdcAddress}`);
            console.log(`[Deposit] CoreDepositWallet: ${coreDepositWallet}`);
            
            // Check current allowance
            console.log(`[Deposit] Checking USDC allowance for CoreDepositWallet...`);
            
            // Check USDC balance first
            try {
                const balance = await readContract(wagmiConfig, {
                    address: usdcAddress,
                    abi: [
                        {
                            name: 'balanceOf',
                            type: 'function',
                            stateMutability: 'view',
                            inputs: [{ name: 'account', type: 'address' }],
                            outputs: [{ name: '', type: 'uint256' }],
                        },
                    ] as const,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`],
                    chainId: HYPEREVM.chainId,
                });
                const balanceFormatted = formatTokenAmount(balance.toString(), assetData.decimals);
                console.log(`[Deposit] USDC Balance: ${balanceFormatted} USDC`);
                
                if (BigInt(balance.toString()) < amountBigInt) {
                    throw new Error(`Insufficient USDC balance. You have ${balanceFormatted} USDC but need ${depositAmount} USDC.`);
                }
            } catch (error: any) {
                if (error.message?.includes('Insufficient USDC balance')) {
                    throw error;
                }
                console.warn(`[Deposit] Could not check balance:`, error);
            }
            
            const currentAllowance = await readContract(wagmiConfig, {
                address: usdcAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address as `0x${string}`, coreDepositWallet],
                chainId: HYPEREVM.chainId,
            });

            console.log(`[Deposit] Current allowance: ${currentAllowance.toString()}`);

            // Approve if allowance is insufficient
            if (currentAllowance < amountBigInt) {
                console.log(`[Deposit] Approving USDC spending to CoreDepositWallet contract...`);
                
                const approveHash = await writeContract(wagmiConfig, {
                    address: usdcAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [coreDepositWallet, amountBigInt],
                    chainId: HYPEREVM.chainId,
                });

                console.log(`[Deposit] Approve transaction submitted: ${approveHash}`);
                const approveReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
                console.log(`[Deposit] Approval confirmed: ${approveReceipt.transactionHash}`);
            }

            // Step 2: Call deposit() on CoreDepositWallet to transfer USDC from HyperEVM to HyperCore
            // destinationDex: 0 = Perps account, 4294967295 (uint32.max) = Spot account
            // Use the user's selected destination
            const destinationDexValue = destinationDex === 'spot' ? 4294967295 : 0;
            
            console.log(`[Deposit] Depositing ${depositAmount} USDC to HyperCore (${destinationDex === 'spot' ? 'Spot' : 'Perps'} account)...`);
            console.log(`[Deposit] Destination: ${destinationDex} (destinationDex = ${destinationDexValue})`);
            console.log(`[Deposit] Note: First-time deposits may incur a 1 USDC account creation fee`);
            console.log(`[Deposit] Final amount being sent to contract: ${amountBigInt.toString()} (${depositAmount} USDC)`);
            
            const depositHash = await writeContract(wagmiConfig, {
                address: coreDepositWallet,
                abi: CORE_DEPOSIT_WALLET_ABI,
                functionName: 'deposit',
                args: [amountBigInt, destinationDexValue],
                chainId: HYPEREVM.chainId,
            });

            console.log(`[Deposit] Deposit transaction submitted: ${depositHash}`);

            // Wait for transaction confirmation
            const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: depositHash });
            
            // Mark final step as complete
            const isPostBridge = depositAmountOverride !== undefined;
            if (isPostBridge) {
                setProgressStep(3); // Step 3 complete (deposit after bridge)
            } else {
                setProgressStep(1); // Step 1 complete (direct deposit)
            }
            
            console.log('\n========== DEPOSIT SUCCESSFUL ==========');
            console.log(`[Deposit] ${depositAmount} USDC transferred from HyperEVM to HyperCore`);
            console.log(`[Deposit] Funds are now available in your HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`);
            console.log(`[Deposit] Transaction: ${receipt.transactionHash}`);
            console.log('==========================================\n');

            // Clear bridge state if this was a post-bridge deposit
            // Also set selectedChain to HyperEVM so success message shows correctly
            if (isPostBridge) {
                setSelectedChain(HYPEREVM.chainId);
                setSelectedAsset('USDC');
                setAmount(depositAmount);
            }
            setBridgedAmount('');
            setShowDepositAfterBridge(false);
            setTxStatus('success');
        } catch (error: any) {
            const errorMsg = error?.message || error?.toString() || '';
            
            // Check for minimum deposit amount error
            if (errorMsg.includes('Amount must exceed new account fee') || 
                errorMsg.includes('amount must be at least')) {
                // Log detailed information for debugging
                const depositAmountNum = parseFloat(depositAmount || '0');
                const expectedTokenAmount = depositAmountNum * 1000000; // USDC has 6 decimals
                
                console.error('[Deposit] Amount validation error details:', {
                    depositAmount,
                    depositAmountNum,
                    expectedTokenAmount,
                    minimumRequired: '1000000',
                    isAboveMinimum: depositAmountNum >= 1,
                    errorMessage: errorMsg,
                });
                
                // Provide more helpful error message
                if (depositAmountNum >= 1) {
                    setErrorMessage(`The deposit failed even though you deposited ${depositAmount} USDC (which is above the 1 USDC minimum). This might be a contract issue. Please check: 1) You have sufficient USDC balance on HyperEVM, 2) The amount was correctly converted (should be ${expectedTokenAmount} in smallest units), 3) Try again or contact support if the issue persists.`);
                } else {
                    setErrorMessage(`For new accounts, the deposit amount must be at least 1 USDC to cover the account creation fee. You attempted to deposit ${depositAmount} USDC. Please increase your deposit amount to at least 1 USDC.`);
                }
                setTxStatus('error');
                setIsLoading(false);
                return;
            }
            
            const isUserRejection =
                errorMsg.toLowerCase().includes('user rejected') ||
                errorMsg.toLowerCase().includes('user denied') ||
                errorMsg.toLowerCase().includes('rejected by user') ||
                errorMsg.toLowerCase().includes('user cancelled') ||
                errorMsg.toLowerCase().includes('user canceled') ||
                error?.code === 4001 ||
                error?.code === 'ACTION_REJECTED';

            if (isUserRejection) {
                // User rejected - just reset to confirm step without showing error
                console.log('[Deposit] Transaction rejected by user');
                setTxStatus('idle');
                setErrorMessage('');
                return;
            }

            // Only show error for actual failures
            console.error('\n========== DEPOSIT FAILED ==========');
            console.error('[Deposit] Error:', error);
            console.error('[Deposit] Error Details:', {
                message: errorMsg,
                code: error?.code,
                data: error?.data,
                address: address,
                chainId: chain?.id,
            });
            console.error('======================================\n');

            // Provide more specific error messages
            if (errorMsg.includes('Chain not configured')) {
                setErrorMessage('Please switch to HyperEVM network in your wallet.');
            } else if (errorMsg.includes('Insufficient')) {
                setErrorMessage(errorMsg);
            } else if (errorMsg.includes('user rejected') || errorMsg.includes('User rejected')) {
                // Already handled above, but just in case
                setTxStatus('idle');
                setErrorMessage('');
                return;
            } else {
                // Include address in error message for debugging
                setErrorMessage(`${errorMsg || 'Something went wrong. Please try again.'} (Address: ${address?.slice(0, 6)}...${address?.slice(-4)})`);
            }

            setTxStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExchange = async () => {
        if (!selectedChain || !selectedAsset || !amount) return;

        setIsLoading(true);
        setTxStatus('pending');
        // Initialize progress steps for cross-chain operation
        // Use the pre-selected destinationDex that user chose in amount step
        setProgressSteps([
            `Sending ${amount} ${selectedAsset} on ${selectedChainData?.name}`,
            `Receiving USDC on HyperEVM`,
            `Depositing to HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`
        ]);
        setProgressStep(1); // Step 1: Sending tokens

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
            const amountBigInt = BigInt(tokenAmount);
            console.log(`[LiFi] Token amount: ${amount} ${selectedAsset} = ${tokenAmount} (${selectedAssetData.decimals} decimals)`);

            // Check balance on source chain before attempting bridge
            console.log('[Exchange] Checking balance on source chain...');
            try {
                // Check if it's native token (ETH) or ERC20
                if (selectedAssetData.address === '0x0000000000000000000000000000000000000000') {
                    // Native token - check ETH balance using public client
                    const publicClient = getPublicClient(wagmiConfig, { chainId: selectedChain });
                    if (!publicClient) {
                        throw new Error('Public client not available for source chain');
                    }
                    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
                    console.log(`[Exchange] Native token balance: ${balance.toString()} (${formatTokenAmount(balance.toString(), 18)} ${selectedAsset})`);
                    if (balance < amountBigInt) {
                        throw new Error(`Insufficient ${selectedAsset} balance. You have ${formatTokenAmount(balance.toString(), 18)} ${selectedAsset} but need ${amount} ${selectedAsset}.`);
                    }
                } else {
                    // ERC20 token - check token balance
                    const balance = await readContract(wagmiConfig, {
                        address: selectedAssetData.address as `0x${string}`,
                        abi: [
                            {
                                name: 'balanceOf',
                                type: 'function',
                                stateMutability: 'view',
                                inputs: [{ name: 'account', type: 'address' }],
                                outputs: [{ name: '', type: 'uint256' }],
                            },
                        ] as const,
                        functionName: 'balanceOf',
                        args: [address as `0x${string}`],
                        chainId: selectedChain,
                    });
                    const balanceFormatted = formatTokenAmount(balance.toString(), selectedAssetData.decimals);
                    console.log(`[Exchange] Token balance: ${balance.toString()} (${balanceFormatted} ${selectedAsset})`);
                    if (BigInt(balance.toString()) < amountBigInt) {
                        throw new Error(`Insufficient ${selectedAsset} balance. You have ${balanceFormatted} ${selectedAsset} but need ${amount} ${selectedAsset}.`);
                    }
                }
                console.log(`[Exchange] Balance check passed: ${amount} ${selectedAsset} available`);
            } catch (balanceError: any) {
                if (balanceError.message?.includes('Insufficient')) {
                    throw balanceError;
                }
                console.warn(`[Exchange] Could not check balance:`, balanceError);
                // Continue anyway - LiFi will check balance too
            }

            // Get routes from LiFi API with slippage tolerance
            console.log('[LiFi] Fetching routes from API...');
            
            // Prepare token addresses for API
            const fromTokenAddressForRoutes = selectedAssetData.address === '0x0000000000000000000000000000000000000000'
                ? 'native'
                : selectedAssetData.address.toLowerCase();
            const toTokenAddressForRoutes = HYPEREVM.usdcAddress.toLowerCase();

            // Fetch routes from LiFi API
            const routesParams = new URLSearchParams({
                fromChain: selectedChain.toString(),
                toChain: HYPEREVM.chainId.toString(),
                fromToken: fromTokenAddressForRoutes,
                toToken: toTokenAddressForRoutes,
                fromAmount: tokenAmount,
                fromAddress: address || '',
                slippage: '0.03', // 3% slippage tolerance
                order: 'RECOMMENDED',
            });

            const routesResponse = await fetch(`https://li.quest/v1/routes?${routesParams.toString()}`);
            
            if (!routesResponse.ok) {
                throw new Error(`LiFi API error: ${routesResponse.status} ${routesResponse.statusText}`);
            }

            const routesData = await routesResponse.json();
            
            console.log(`[LiFi] Found ${routesData.routes?.length || 0} route(s)`);

            if (!routesData.routes || routesData.routes.length === 0) {
                throw new Error('No route found');
            }

            const route = routesData.routes[0];
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
                // Disable bundling to avoid bundle ID errors
                updateRouteHook(updatedRoute) {
                    const currentStep = updatedRoute.steps?.find(
                        (step) => step.execution?.status === 'PENDING' || step.execution?.status === 'ACTION_REQUIRED'
                    );

                    console.log('\n[LiFi] Route Update:');
                    console.log(`  Status: ${updatedRoute.steps?.map(s => s.execution?.status || 'NOT_STARTED').join(' -> ')}`);

                    // Update progress based on route steps
                    const doneSteps = updatedRoute.steps?.filter(s => s.execution?.status === 'DONE') || [];
                    const totalSteps = updatedRoute.steps?.length || 1;
                    
                    // If all bridge steps are done, move to step 2 (receiving)
                    if (doneSteps.length === totalSteps && totalSteps > 0) {
                        setProgressStep(2); // Step 2: Receiving on HyperEVM
                    } else if (currentStep && currentStep.execution?.status === 'PENDING') {
                        setProgressStep(1); // Step 1: Still sending/bridging
                    }

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
                throw new Error('Exchange failed - no route executed');
            }

            // Verify that the bridge was actually successful
            // Check if all steps completed successfully
            const allStepsCompleted = executedRoute.steps?.every(
                step => step.execution?.status === 'DONE'
            );
            
            if (!allStepsCompleted) {
                const failedSteps = executedRoute.steps?.filter(
                    step => step.execution?.status !== 'DONE'
                );
                console.error('[Exchange] Bridge incomplete. Failed steps:', failedSteps);
                throw new Error('Bridge transaction did not complete successfully. Please try again.');
            }

            // Verify we received tokens on HyperEVM
            const receivedAmount = executedRoute.toAmount || route.toAmount;
            if (!receivedAmount || BigInt(receivedAmount) === BigInt(0)) {
                throw new Error('Bridge completed but no tokens were received on HyperEVM');
            }

            const receivedAmountFormatted = receivedAmount 
                ? formatTokenAmount(receivedAmount, route.toToken?.decimals || 6)
                : amount;

            // Mark step 2 as complete (receiving on HyperEVM)
            setProgressStep(2);

            console.log('\n========== EXCHANGE SUCCESSFUL ==========');
            console.log(`[Exchange] ${amount} ${selectedAsset} -> ${receivedAmountFormatted} USDC on HyperEVM`);
            console.log(`[Exchange] Bridge verified: All steps completed successfully`);
            console.log('==========================================\n');

            // Store bridged amount
            setBridgedAmount(receivedAmountFormatted);

            // Only trigger deposit if bridge was successful
            // Verify the bridge completed successfully before depositing
            console.log('\n========== VERIFYING BRIDGE SUCCESS ==========');
            console.log(`[Verification] Bridge completed: ${receivedAmountFormatted} USDC received on HyperEVM`);
            console.log(`[Verification] All bridge steps completed successfully`);
            console.log('===============================================\n');

            // Automatically trigger deposit to HyperCore after successful bridge
            // Ensure progress steps are set up for the 3-step process
            setProgressSteps([
                `Sending ${amount} ${selectedAsset} on ${selectedChainData?.name}`,
                `Receiving USDC on HyperEVM`,
                `Depositing to HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`
            ]);
            setProgressStep(2); // Steps 1 and 2 are done, starting step 3
            
            // Automatically trigger deposit with the bridged amount
            // Pass the bridged amount and HyperEVM config directly to handleDeposit
            console.log('\n========== AUTO-DEPOSIT AFTER BRIDGE ==========');
            console.log(`[Auto-Deposit] Starting automatic deposit of ${receivedAmountFormatted} USDC to HyperCore`);
            console.log(`[Auto-Deposit] Bridge verified successful - proceeding with deposit`);
            console.log('================================================\n');
            
            // Call handleDeposit with the bridged amount, overriding state values
            // This will only execute if the bridge was successful (verified above)
            await handleDeposit(receivedAmountFormatted, HYPEREVM.chainId, 'USDC');
        } catch (error: any) {
            // Check if user rejected the transaction
            const errorMsg = error?.message || error?.toString() || '';
            
            // Check for balance errors
            if (errorMsg.includes('BalanceError') || 
                errorMsg.includes('balance is too low') ||
                errorMsg.includes('Insufficient') ||
                error?.name === 'BalanceError') {
                console.error('[Exchange] Balance error:', error);
                setErrorMessage(`Insufficient balance. ${errorMsg.includes('Insufficient') ? errorMsg : `You don't have enough ${selectedAsset} on ${selectedChainData?.name} to complete this bridge. Please check your balance and try again.`}`);
                setTxStatus('error');
                setIsLoading(false);
                return;
            }
            
            const isUserRejection =
                errorMsg.toLowerCase().includes('user rejected') ||
                errorMsg.toLowerCase().includes('user denied') ||
                errorMsg.toLowerCase().includes('rejected by user') ||
                errorMsg.toLowerCase().includes('user cancelled') ||
                errorMsg.toLowerCase().includes('user canceled') ||
                error?.code === 4001 || // MetaMask user rejection code
                error?.code === 'ACTION_REJECTED';

            if (isUserRejection) {
                // User rejected - just reset to confirm step without showing error
                console.log('[Exchange] Transaction rejected by user');
                setTxStatus('idle');
                setErrorMessage('');
                return;
            }

            // Only show error for actual failures
            console.error('\n========== EXCHANGE FAILED ==========');
            console.error('[Exchange] Error:', error);
            console.error('======================================\n');

            if (errorMsg.includes('No route found')) {
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
        setDestinationDex('spot');
        setBridgedAmount('');
        setShowDepositAfterBridge(false);
        setProgressStep(0);
        setProgressSteps([]);
    };

    const handleDepositAfterBridge = () => {
        // Switch to HyperEVM deposit flow
        // Update progress steps to show all 3 steps (1 and 2 already done)
        setProgressSteps([
            `Sending ${bridgedAmount || amount} ${selectedAsset} on ${selectedChainData?.name}`,
            `Receiving USDC on HyperEVM`,
            `Depositing to HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`
        ]);
        setProgressStep(2); // Step 1 and 2 are complete, about to start step 3
        
        setSelectedChain(HYPEREVM.chainId);
        setSelectedAsset('USDC');
        setAmount(bridgedAmount); // Use the bridged amount
        setStep('amount'); // Go to amount step where they can select Spot/Perps
        setTxStatus('idle');
        setShowDepositAfterBridge(false);
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
                    <h3 className="text-xl font-bold">
                        {isHyperEVMSelected ? 'Deposit to Hyperliquid' : 'Exchange to HyperEVM'}
                    </h3>
                </div>
                {onClose && (
                    <button
                        onClick={() => {
                            resetForm();
                            onClose();
                        }}
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
                {step === 'asset' && !isHyperEVMSelected && (
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
                        <p className="text-[var(--muted)] text-sm">
                            {isHyperEVMSelected 
                                ? 'Enter amount to deposit to your Hyperliquid account'
                                : 'Enter amount to exchange'}
                        </p>

                        {isHyperEVMSelected ? (
                            // Deposit flow for HyperEVM
                            <div className="space-y-4">
                                <div className="card bg-black">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-[var(--muted)]">Deposit Amount</span>
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

                                {/* Destination Selection: Spot or Perps */}
                                <div className="card bg-black">
                                    <div className="mb-3">
                                        <label className="block text-sm font-semibold mb-2">
                                            Deposit Destination
                                        </label>
                                        <div className="text-xs text-[var(--muted)] mb-3">
                                            Choose where to deposit your USDC in HyperCore
                                        </div>
                                    </div>
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
                                    <div className="mt-3 p-3 bg-[var(--primary)]/5 rounded-lg border border-[var(--primary)]/20">
                                        <div className="text-xs text-[var(--muted)]">
                                            <strong>Why {destinationDex === 'spot' ? 'Spot' : 'Perps'}?</strong>
                                            {destinationDex === 'spot' 
                                                ? ' Spot accounts are used for spot trading (buying and selling assets at current market prices). Your funds will be deposited to your Spot balance in HyperCore.'
                                                : ' Perps accounts are used for perpetual futures trading (leveraged positions). Your funds will be deposited to your Perps margin account in HyperCore.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="card bg-[var(--primary)]/10 border border-[var(--primary)]/30 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="text-xl">💼</div>
                                        <div className="flex-1">
                                            <div className="font-semibold mb-1">Deposit to Hyperliquid {destinationDex === 'spot' ? 'Spot' : 'Perps'} Account</div>
                                            <div className="text-sm text-[var(--muted)]">
                                                Funds will be transferred from HyperEVM to your HyperCore {destinationDex === 'spot' ? 'Spot' : 'Perps'} account.
                                                {destinationDex === 'spot' && ' Make sure you\'re connected to the HyperEVM network.'}
                                                {destinationDex === 'perps' && ' This will be used as margin for perpetuals trading.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleContinue}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                    className="btn btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue to Deposit
                                </button>
                            </div>
                        ) : (
                            // Exchange flow for other chains
                            <>
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
                                    {estimatedReceivedAmount || (amount ? '~' + amount : '0.0')}
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] font-semibold">
                                    USDC
                                </div>
                            </div>
                            {estimatedReceivedAmount && amount && parseFloat(amount) > 0 && (
                                <div className="text-xs text-[var(--muted)] mt-1">
                                    Estimated amount after fees and exchange rate
                                </div>
                            )}
                        </div>

                                {/* Destination Selection: Spot or Perps for cross-chain deposits */}
                                <div className="card bg-black">
                                    <div className="mb-3">
                                        <label className="block text-sm font-semibold mb-2">
                                            Final Destination (HyperCore)
                                        </label>
                                        <div className="text-xs text-[var(--muted)] mb-3">
                                            Choose where to deposit your USDC after bridging to HyperEVM
                                        </div>
                                    </div>
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
                                    <div className="mt-3 p-3 bg-[var(--primary)]/5 rounded-lg border border-[var(--primary)]/20">
                                        <div className="text-xs text-[var(--muted)]">
                                            <strong>Why {destinationDex === 'spot' ? 'Spot' : 'Perps'}?</strong>
                                            {destinationDex === 'spot' 
                                                ? ' After bridging, your USDC will be automatically deposited to your Spot account for spot trading.'
                                                : ' After bridging, your USDC will be automatically deposited to your Perps account for perpetuals trading and used as margin.'}
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
                    </>
                )}

                {/* Step 4: Confirm */}
                {step === 'confirm' && txStatus === 'idle' && (
                    <>
                        <p className="text-[var(--muted)] text-sm">
                            {isHyperEVMSelected ? 'Review your deposit' : 'Review your exchange'}
                        </p>

                        <div className="space-y-3">
                            {isHyperEVMSelected ? (
                                <>
                                    <div className="card bg-black flex items-center justify-between">
                                        <span className="text-[var(--muted)]">Deposit Amount</span>
                                        <span className="font-semibold">{amount} USDC</span>
                                    </div>
                                    <div className="card bg-black flex items-center justify-between">
                                        <span className="text-[var(--muted)]">Destination</span>
                                        <span className="font-semibold">
                                            {destinationDex === 'spot' ? 'Spot Account' : 'Perps Account'}
                                        </span>
                                    </div>
                                    <div className="card bg-black flex items-center justify-between">
                                        <span className="text-[var(--muted)]">Network</span>
                                        <span className="font-semibold">HyperEVM → HyperCore</span>
                                    </div>
                                    <div className="card bg-black flex items-center justify-between">
                                        <span className="text-[var(--muted)]">Account</span>
                                        <span className="font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                                    </div>
                                    <div className="card bg-[var(--primary)]/10 border border-[var(--primary)]/30 p-3">
                                        <div className="text-xs text-[var(--muted)]">
                                            <strong>DestinationDex:</strong> {destinationDex === 'spot' ? '4294967295 (Spot)' : '0 (Perps)'}
                                            <br />
                                            {destinationDex === 'spot' 
                                                ? 'Funds will be deposited to your Spot account for spot trading.'
                                                : 'Funds will be deposited to your Perps account for perpetuals trading and used as margin.'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                            <div className="card bg-black flex items-center justify-between">
                                <span className="text-[var(--muted)]">From</span>
                                <span className="font-semibold">{amount} {selectedAsset} on {selectedChainData?.name}</span>
                            </div>
                            <div className="card bg-black flex items-center justify-between">
                                        <span className="text-[var(--muted)]">Bridge To</span>
                                <span className="font-semibold text-[var(--accent)]">~{amount} USDC on HyperEVM</span>
                            </div>
                                    <div className="card bg-black flex items-center justify-between">
                                        <span className="text-[var(--muted)]">Final Destination</span>
                                        <span className="font-semibold">
                                            HyperCore {destinationDex === 'spot' ? 'Spot' : 'Perps'} Account
                                        </span>
                            </div>
                            <div className="card bg-black flex items-center justify-between">
                                <span className="text-[var(--muted)]">Recipient</span>
                                <span className="font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                            </div>
                                    <div className="card bg-[var(--primary)]/10 border border-[var(--primary)]/30 p-3">
                                        <div className="text-xs text-[var(--muted)]">
                                            <strong>Note:</strong> After bridging to HyperEVM, your USDC will be automatically deposited to your HyperCore {destinationDex === 'spot' ? 'Spot' : 'Perps'} account.
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={isHyperEVMSelected ? () => handleDeposit() : handleExchange}
                            disabled={isLoading}
                            className="btn btn-accent w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isHyperEVMSelected ? 'Confirm Deposit' : 'Confirm Exchange'}
                        </button>
                    </>
                )}

                {/* Transaction Status with Progress Tracker */}
                {txStatus === 'pending' && progressSteps.length > 0 && (
                    <div className="space-y-6 py-6">
                        <div className="text-center">
                            <div className="text-5xl mb-4 animate-spin">⟳</div>
                            <h4 className="text-lg font-bold mb-2">
                                {isHyperEVMSelected ? 'Processing Deposit' : 'Processing Transaction'}
                            </h4>
                        </div>
                        
                        {/* Progress Steps Tracker */}
                        <div className="space-y-4">
                            {progressSteps.map((stepDesc, index) => {
                                const stepNumber = index + 1;
                                const isCompleted = stepNumber < progressStep;
                                const isCurrent = stepNumber === progressStep;
                                const isPending = stepNumber > progressStep;

                                return (
                                    <div key={index} className="flex items-start gap-4">
                                        {/* Step Indicator */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                                                isCompleted
                                                    ? 'bg-[var(--accent)] text-white'
                                                    : isCurrent
                                                    ? 'bg-[var(--primary)] text-white animate-pulse'
                                                    : 'bg-[var(--card-border)] text-[var(--muted)]'
                                            }`}>
                                                {isCompleted ? '✓' : stepNumber}
                                            </div>
                                            {index < progressSteps.length - 1 && (
                                                <div className={`w-1 flex-1 min-h-[40px] my-2 ${
                                                    isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'
                                                }`} />
                                            )}
                                        </div>
                                        
                                        {/* Step Description */}
                                        <div className="flex-1 pt-1">
                                            <div className={`font-semibold mb-1 ${
                                                isCurrent ? 'text-[var(--primary)]' : isCompleted ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                                            }`}>
                                                {stepDesc}
                                            </div>
                                            {isCurrent && (
                                                <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                                                    <span className="animate-pulse">●</span>
                                                    In progress...
                                                </div>
                                            )}
                                            {isCompleted && (
                                                <div className="text-xs text-[var(--accent)]">
                                                    ✓ Completed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Fallback for pending without progress steps */}
                {txStatus === 'pending' && progressSteps.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4 animate-spin">⟳</div>
                        <h4 className="text-lg font-bold mb-2">
                            {isHyperEVMSelected ? 'Processing Deposit' : 'Processing Exchange'}
                        </h4>
                        <p className="text-[var(--muted)] text-sm">
                            {isHyperEVMSelected 
                                ? `Depositing ${amount} USDC to your Hyperliquid ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account...`
                                : `Bridging ${amount} ${selectedAsset} to USDC on HyperEVM...`}
                        </p>
                    </div>
                )}

                {txStatus === 'success' && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">✓</div>
                        <h4 className="text-lg font-bold text-[var(--accent)] mb-2">
                            {/* Show "Deposit Successful!" if: 
                                1. Direct deposit on HyperEVM (isHyperEVMSelected), OR
                                2. Post-bridge deposit completed (progressSteps.length === 3 and progressStep === 3) */}
                            {(isHyperEVMSelected || (progressSteps.length === 3 && progressStep === 3)) 
                                ? 'Deposit Successful!' 
                                : 'Bridge Successful!'}
                        </h4>
                        <p className="text-[var(--muted)] text-sm mb-4">
                            {(isHyperEVMSelected || (progressSteps.length === 3 && progressStep === 3))
                                ? `${amount || bridgedAmount} USDC transferred from HyperEVM to HyperCore ${destinationDex === 'spot' ? 'Spot' : 'Perps'} account`
                                : `${bridgedAmount || amount} USDC is now on HyperEVM`}
                        </p>
                        {!isHyperEVMSelected && !(progressSteps.length === 3 && progressStep === 3) && showDepositAfterBridge && (
                            <div className="space-y-3">
                                <div className="card bg-[var(--primary)]/10 border border-[var(--primary)]/30 p-4 mb-4">
                                    <div className="text-sm text-[var(--muted)] mb-2">
                                        Your USDC is on HyperEVM. Ready to deposit to HyperCore.
                                    </div>
                                    <div className="text-xs text-[var(--muted)]">
                                        Destination: <strong>{destinationDex === 'spot' ? 'Spot' : 'Perps'} Account</strong>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleDepositAfterBridge} 
                                    className="btn btn-accent w-full py-4"
                                >
                                    Deposit to HyperCore {destinationDex === 'spot' ? 'Spot' : 'Perps'}
                                </button>
                                <button onClick={resetForm} className="btn btn-secondary w-full">
                                    Done
                                </button>
                            </div>
                        )}
                        {isHyperEVMSelected && (
                            <button onClick={resetForm} className="btn btn-secondary">
                                New Deposit
                            </button>
                        )}
                        {!isHyperEVMSelected && !showDepositAfterBridge && (
                        <button onClick={resetForm} className="btn btn-secondary">
                            New Exchange
                        </button>
                        )}
                    </div>
                )}

                {txStatus === 'error' && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">✗</div>
                        <h4 className="text-lg font-bold text-[var(--danger)] mb-2">
                            {isHyperEVMSelected ? 'Deposit Failed' : 'Exchange Failed'}
                        </h4>
                        <p className="text-[var(--muted)] text-sm mb-4">
                            {errorMessage}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
