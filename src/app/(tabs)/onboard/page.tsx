'use client';

import { useAccount } from 'wagmi';

export default function OnboardPage() {
    const { isConnected } = useAccount();

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="card bg-gradient-to-br from-[var(--card)] to-[var(--primary)]/10 border-[var(--primary)]/30">
                <h2 className="text-3xl font-bold mb-4">
                    Welcome to Salt DeFi Dashboard
                </h2>
                <p className="text-[var(--muted)] text-lg max-w-2xl">
                    Non-custodial asset management with transaction guardrails.
                    Connect your wallet to start managing your DeFi strategies securely.
                </p>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className={`card ${isConnected ? 'border-[var(--accent)]' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isConnected ? 'bg-[var(--accent)] text-black' : 'bg-[var(--card-border)] text-[var(--muted)]'
                            }`}>
                            {isConnected ? '✓' : '1'}
                        </div>
                        <h3 className="text-lg font-semibold">Connect Wallet</h3>
                    </div>
                    <p className="text-[var(--muted)]">
                        Connect your Web3 wallet to authenticate with Salt's MPC protocol.
                    </p>
                    {isConnected && (
                        <div className="mt-4 text-sm text-[var(--accent)]">
                            ✓ Wallet connected
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex items-center justify-center font-bold text-[var(--muted)]">
                            2
                        </div>
                        <h3 className="text-lg font-semibold">Set Guardrails</h3>
                    </div>
                    <p className="text-[var(--muted)]">
                        Configure transaction policies and spending limits for your accounts.
                    </p>
                </div>

                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex items-center justify-center font-bold text-[var(--muted)]">
                            3
                        </div>
                        <h3 className="text-lg font-semibold">Deploy Strategies</h3>
                    </div>
                    <p className="text-[var(--muted)]">
                        Execute yield strategies while Salt validates every transaction.
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="text-[var(--primary)]">🔐</span>
                        MPC Security
                    </h3>
                    <p className="text-[var(--muted)]">
                        Salt uses distributed Multi-Party Computation to ensure no single party
                        can access your private keys. Transactions require consensus from multiple
                        signers before execution.
                    </p>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="text-[var(--accent)]">🛡️</span>
                        Transaction Guardrails
                    </h3>
                    <p className="text-[var(--muted)]">
                        Define policies that automatically reject transactions outside your
                        parameters. Protect against unauthorized transfers and contract interactions.
                    </p>
                </div>
            </div>

            {/* Networks */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Supported Networks</h3>
                <div className="flex flex-wrap gap-3">
                    {['Ethereum Sepolia', 'Arbitrum Sepolia', 'Base Sepolia', 'Polygon Amoy', 'Somnia Shannon'].map((network) => (
                        <span
                            key={network}
                            className="px-3 py-1.5 rounded-full bg-[var(--card-border)] text-sm"
                        >
                            {network}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
