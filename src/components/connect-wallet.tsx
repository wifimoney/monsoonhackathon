'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CrossChainExchange } from './cross-chain-exchange';

// Extend Window interface for ethereum provider
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: any[] }) => Promise<any>;
            isMetaMask?: boolean;
        };
    }
}

export function ConnectWallet() {
    const { address, isConnected, chain, connector } = useAccount();
    const { disconnect } = useDisconnect();
    const [showFundMenu, setShowFundMenu] = useState(false);
    const [showCrossChainModal, setShowCrossChainModal] = useState(false);
    const [showWalletSelector, setShowWalletSelector] = useState(false);
    const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const walletSelectorRef = useRef<HTMLDivElement>(null);

    // Ensure component is mounted for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Debug: Log modal state changes
    useEffect(() => {
        if (showCrossChainModal) {
            console.log('[ConnectWallet] Modal state changed: showCrossChainModal =', showCrossChainModal);
        }
    }, [showCrossChainModal]);

    // Fetch available addresses from wallet when connected
    useEffect(() => {
        if (isConnected && connector) {
            const fetchAddresses = async () => {
                try {
                    // Try to get accounts from the wallet provider
                    if (connector && 'getAccounts' in connector) {
                        const accounts = await (connector as any).getAccounts();
                        if (accounts && accounts.length > 0) {
                            setAvailableAddresses(accounts);
                        }
                    } else if (window.ethereum) {
                        // Fallback: request accounts from MetaMask/ethereum provider
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        if (accounts && accounts.length > 0) {
                            setAvailableAddresses(accounts);
                        }
                    } else {
                        // If no multiple accounts available, just use current address
                        if (address) {
                            setAvailableAddresses([address]);
                        }
                    }
                } catch (error) {
                    console.error('[ConnectWallet] Error fetching addresses:', error);
                    // Fallback to current address
                    if (address) {
                        setAvailableAddresses([address]);
                    }
                }
            };
            fetchAddresses();
        }
    }, [isConnected, connector, address]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFundMenu(false);
            }
            if (walletSelectorRef.current && !walletSelectorRef.current.contains(event.target as Node)) {
                setShowWalletSelector(false);
            }
        };

        if (showFundMenu || showWalletSelector) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFundMenu, showWalletSelector]);

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
                    
                    {/* Wallet Address Selector */}
                    {availableAddresses.length > 1 && (
                        <div className="relative" ref={walletSelectorRef}>
                            <button
                                onClick={() => setShowWalletSelector(!showWalletSelector)}
                                className="card py-2 px-3 flex items-center gap-2 hover:border-[var(--primary)] transition-colors"
                            >
                                <span className="font-mono text-sm">
                        {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={`transition-transform ${showWalletSelector ? 'rotate-180' : ''}`}
                                >
                                    <path d="M3 4.5L6 7.5L9 4.5" />
                                </svg>
                            </button>
                            
                            {showWalletSelector && (
                                <div className="absolute right-0 mt-2 w-72 card shadow-lg z-50 max-h-96 overflow-y-auto">
                                    <div className="px-4 py-3 border-b border-[var(--card-border)]">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-sm">Wallets</h3>
                                            <span className="text-xs text-[var(--muted)]">
                                                {availableAddresses.length} {availableAddresses.length === 1 ? 'wallet' : 'wallets'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        {availableAddresses.map((addr) => (
                                            <button
                                                key={addr}
                                                onClick={() => {
                                                    // Note: Actual switching would require wallet support
                                                    setShowWalletSelector(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center justify-between gap-3 ${
                                                    addr.toLowerCase() === address?.toLowerCase() 
                                                        ? 'bg-[var(--primary)]/10 border-l-2 border-[var(--primary)]' 
                                                        : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                        addr.toLowerCase() === address?.toLowerCase() 
                                                            ? 'bg-[var(--primary)]' 
                                                            : 'bg-[var(--muted)]'
                                                    }`} />
                                                    <span className="font-mono text-sm truncate">
                                                        {addr.slice(0, 6)}...{addr.slice(-4)}
                                                    </span>
                                                </div>
                                                {addr.toLowerCase() === address?.toLowerCase() && (
                                                    <span className="text-xs text-[var(--primary)] font-medium flex-shrink-0">
                                                        Connected
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 border-t border-[var(--card-border)]">
                                        <button
                                            onClick={() => {
                                                disconnect();
                                                setShowWalletSelector(false);
                                            }}
                                            className="w-full btn btn-secondary py-2 text-sm"
                                        >
                        Disconnect
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('[ConnectWallet] Deposit button clicked, opening modal');
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
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('[ConnectWallet] Bridge button clicked, opening modal');
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

                {/* Cross Chain Exchange Modal - Rendered in Portal */}
                {mounted && showCrossChainModal && createPortal(
                    <CrossChainExchange onClose={() => setShowCrossChainModal(false)} />,
                    document.body
                )}
            </>
        );
    }

    // Use RainbowKit's ConnectButton for unified wallet connection
    return <ConnectButton />;
}
