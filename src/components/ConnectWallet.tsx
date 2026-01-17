'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { readContract } from '@wagmi/core';
import { wagmiConfig } from '@/lib/wagmi';
import { formatUnits } from 'viem';
import { CrossChainExchange } from './CrossChainExchange';

// HyperEVM USDC address
const HYPEREVM_USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f' as `0x${string}`;
const HYPEREVM_CHAIN_ID = 999;

// ERC20 ABI for balanceOf
const ERC20_BALANCE_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
] as const;

export function ConnectWallet() {
    const { address, isConnected, chain } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const [showFundMenu, setShowFundMenu] = useState(false);
    const [showCrossChainModal, setShowCrossChainModal] = useState(false);
    const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [previousBalance, setPreviousBalance] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch USDC balance on HyperEVM
    useEffect(() => {
        const fetchBalance = async () => {
            if (!address || !isConnected) {
                setUsdcBalance(null);
                return;
            }

            setIsLoadingBalance(true);
            try {
                // Always try to fetch balance from HyperEVM, regardless of current chain
                const balance = await readContract(wagmiConfig, {
                    address: HYPEREVM_USDC_ADDRESS,
                    abi: ERC20_BALANCE_ABI,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`],
                    chainId: HYPEREVM_CHAIN_ID,
                });

                // USDC has 6 decimals
                const balanceBigInt = balance as bigint;
                const formattedBalance = formatUnits(balanceBigInt, 6);
                const numericBalance = parseFloat(formattedBalance);
                const finalBalance = numericBalance > 0 ? formattedBalance : '0';
                
                // Only update balance if the difference is greater than 0.0001
                if (previousBalance !== null) {
                    const prevBalance = parseFloat(previousBalance);
                    const difference = Math.abs(numericBalance - prevBalance);
                    
                    // Only update if difference is significant (>0.0001)
                    if (difference > 0.0001) {
                        setUsdcBalance(finalBalance);
                        setPreviousBalance(finalBalance);
                    }
                    // If difference is small, keep the previous balance displayed
                } else {
                    // First load - always set
                    setUsdcBalance(finalBalance);
                    setPreviousBalance(finalBalance);
                }
            } catch (error: any) {
                // If balance fetch fails (e.g., chain not added to wallet, RPC error), set to null
                const errorMsg = error?.message || '';
                if (!errorMsg.includes('not configured') && !errorMsg.includes('user rejected')) {
                    console.log('[Balance] Could not fetch USDC balance:', error);
                }
                setUsdcBalance(null);
            } finally {
                setIsLoadingBalance(false);
            }
        };

        fetchBalance();
        // Only fetch once when address/connection changes, no auto-refresh to avoid frequent updates
    }, [address, isConnected]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFundMenu(false);
            }
        };

        if (showFundMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFundMenu]);

    if (isConnected && address) {
        return (
            <>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="status-dot connected" />
                        <span className="text-sm text-muted">
                            {chain?.name || 'Unknown Chain'}
                        </span>
                    </div>
                    <div className="card py-2 px-3 flex items-center gap-3">
                        <span className="font-mono text-sm">
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                        <button
                            onClick={() => disconnect()}
                            className="btn btn-secondary py-1 px-3 text-sm"
                        >
                            Disconnect
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* USDC Balance Display */}
                        {usdcBalance !== null && (
                            <div className="card py-1 px-3 flex items-center gap-2">
                                <span className="text-xs text-[var(--muted)]">HyperEVM:</span>
                                <span className="text-sm font-semibold">
                                    {isLoadingBalance && previousBalance ? (
                                        // Only show "..." when loading and we have a previous balance
                                        // (meaning we're refreshing, not initial load)
                                        <span className="animate-pulse">...</span>
                                    ) : (
                                        `${parseFloat(usdcBalance).toFixed(4)} USDC`
                                    )}
                                </span>
                            </div>
                        )}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowFundMenu(!showFundMenu)}
                                className="btn btn-primary py-1 px-3 text-sm flex items-center gap-2"
                            >
                                Deposit
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={`transition-transform ${showFundMenu ? 'rotate-180' : ''}`}
                                >
                                    <path d="M3 4.5L6 7.5L9 4.5" />
                                </svg>
                            </button>
                        {showFundMenu && (
                            <div className="absolute right-0 mt-2 w-56 card shadow-lg z-50">
                                <div className="px-4 py-3 border-b border-[var(--card-border)]">
                                    <h3 className="font-semibold text-sm">Fund Wallet</h3>
                                </div>
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            setShowCrossChainModal(true);
                                            setShowFundMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center gap-3"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        <span>Deposit</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCrossChainModal(true);
                                            setShowFundMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M8 12h8M12 8v8" />
                                                <circle cx="12" cy="12" r="10" />
                                            </svg>
                                            <span>Bridge</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4.5 3L7.5 6L4.5 9" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setShowFundMenu(false)}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center gap-3"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M8 3L4 7l4 4M16 21l4-4-4-4" />
                                        </svg>
                                        <span>Swap</span>
                                    </button>
                                    <button
                                        onClick={() => setShowFundMenu(false)}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center gap-3"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M12 8v8M8 12h8" />
                                        </svg>
                                        <span>Buy</span>
                                    </button>
                                    <button
                                        onClick={() => setShowFundMenu(false)}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center gap-3"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <path d="M9 3v18M3 9h18" />
                                        </svg>
                                        <span>Transfer</span>
                                    </button>
                                    <button
                                        onClick={() => setShowFundMenu(false)}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center gap-3"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 19V5M5 12l7-7 7 7" />
                                        </svg>
                                        <span>Withdraw</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* Cross Chain Exchange Modal (used for both Deposit and Bridge) */}
                {showCrossChainModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <CrossChainExchange 
                            onClose={() => {
                                setShowCrossChainModal(false);
                                // Refresh balance when modal closes (after deposit/bridge)
                                if (usdcBalance !== null) {
                                    const fetchBalance = async () => {
                                        if (!address) return;
                                        try {
                                            const balance = await readContract(wagmiConfig, {
                                                address: HYPEREVM_USDC_ADDRESS,
                                                abi: ERC20_BALANCE_ABI,
                                                functionName: 'balanceOf',
                                                args: [address as `0x${string}`],
                                                chainId: HYPEREVM_CHAIN_ID,
                                            });
                                            const formattedBalance = formatUnits(balance as bigint, 6);
                                            const numericBalance = parseFloat(formattedBalance);
                                            setUsdcBalance(numericBalance > 0 ? formattedBalance : '0');
                                        } catch (error) {
                                            // Silently fail if balance can't be fetched
                                        }
                                    };
                                    fetchBalance();
                                }
                            }} 
                        />
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="flex gap-2">
            {connectors.map((connector) => (
                <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    disabled={isPending}
                    className="btn btn-primary"
                >
                    {isPending ? (
                        <>
                            <span className="animate-spin">⟳</span>
                            Connecting...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Connect {connector.name}
                        </>
                    )}
                </button>
            ))}
        </div>
    );
}
