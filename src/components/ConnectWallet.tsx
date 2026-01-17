'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CrossChainExchange } from './CrossChainExchange';

export function ConnectWallet() {
    const { address, isConnected, chain } = useAccount();
    const { disconnect } = useDisconnect();
    const [showFundMenu, setShowFundMenu] = useState(false);
    const [showCrossChainModal, setShowCrossChainModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

                {/* Cross Chain Exchange Modal (used for both Deposit and Bridge) */}
                {showCrossChainModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <CrossChainExchange onClose={() => setShowCrossChainModal(false)} />
                    </div>
                )}
            </>
        );
    }

    // Use RainbowKit's ConnectButton for unified wallet connection
    return <ConnectButton />;
}
