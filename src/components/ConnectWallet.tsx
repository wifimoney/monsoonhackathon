'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectWallet() {
    const { address, isConnected, chain } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected && address) {
        return (
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
            </div>
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
