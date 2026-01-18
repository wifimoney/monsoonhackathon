'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CrossChainExchange } from './CrossChainExchange';

export function ConnectWallet() {
    const { address, isConnected, chain, connector } = useAccount();
    const { disconnect } = useDisconnect();
    const { connect, connectors } = useConnect();
    const [showFundMenu, setShowFundMenu] = useState(false);
    const [showCrossChainModal, setShowCrossChainModal] = useState(false);
    const [showWalletSelector, setShowWalletSelector] = useState(false);
    const [availableAddresses, setAvailableAddresses] = useState<string[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<string | undefined>();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const walletSelectorRef = useRef<HTMLDivElement>(null);

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
                            if (!selectedAddress || !accounts.includes(selectedAddress)) {
                                setSelectedAddress(accounts[0]);
                            }
                        }
                    } else if (window.ethereum) {
                        // Fallback: request accounts from MetaMask/ethereum provider
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        if (accounts && accounts.length > 0) {
                            setAvailableAddresses(accounts);
                            if (!selectedAddress || !accounts.includes(selectedAddress)) {
                                setSelectedAddress(accounts[0]);
                            }
                        }
                    } else {
                        // If no multiple accounts available, just use current address
                        if (address) {
                            setAvailableAddresses([address]);
                            setSelectedAddress(address);
                        }
                    }
                } catch (error) {
                    console.error('[ConnectWallet] Error fetching addresses:', error);
                    // Fallback to current address
                    if (address) {
                        setAvailableAddresses([address]);
                        setSelectedAddress(address);
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

    // Handle address switching
    const handleAddressSwitch = async (newAddress: string) => {
        if (newAddress === address) {
            setShowWalletSelector(false);
            return;
        }

        try {
            // Disconnect current connection
            disconnect();

            // Small delay to ensure disconnect completes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Reconnect with the selected address
            // Note: This depends on wallet support for account switching
            if (window.ethereum && window.ethereum.isMetaMask) {
                // Request specific account
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: { account: newAddress } }]
                });
            }

            // Reconnect with the same connector
            if (connector) {
                connect({ connector });
            }

            setSelectedAddress(newAddress);
            setShowWalletSelector(false);
        } catch (error) {
            console.error('[ConnectWallet] Error switching address:', error);
        }
    };

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
                                    {availableAddresses.length > 0 ? (
                                        availableAddresses.map((addr) => (
                                            <button
                                                key={addr}
                                                onClick={() => handleAddressSwitch(addr)}
                                                className={`w-full text-left px-4 py-3 hover:bg-[var(--card-border)] transition-colors flex items-center justify-between gap-3 ${addr.toLowerCase() === address?.toLowerCase()
                                                        ? 'bg-[var(--primary)]/10 border-l-2 border-[var(--primary)]'
                                                        : ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${addr.toLowerCase() === address?.toLowerCase()
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
                                                {addr.toLowerCase() !== address?.toLowerCase() && (
                                                    <svg
                                                        width="12"
                                                        height="12"
                                                        viewBox="0 0 12 12"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        className="flex-shrink-0"
                                                    >
                                                        <path d="M4.5 3L7.5 6L4.5 9" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-[var(--muted)] text-center">
                                            No additional wallets available
                                        </div>
                                    )}
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