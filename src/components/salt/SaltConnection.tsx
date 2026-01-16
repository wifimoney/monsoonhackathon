'use client';

import { useState } from 'react';

interface SaltAccount {
    id: string;
    name: string;
    address: string;
}

interface Props {
    onConnected?: (account: SaltAccount) => void;
}

export function SaltConnection({ onConnected }: Props) {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<SaltAccount[]>([]);
    const [activeAccount, setActiveAccount] = useState<SaltAccount | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [signerAddress, setSignerAddress] = useState<string>('');

    const connectSalt = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Authenticate
            const authRes = await fetch('/api/salt/auth', { method: 'POST' });
            const authData = await authRes.json();

            if (!authData.success) throw new Error(authData.error);
            setSignerAddress(authData.address);

            // Step 2: Fetch accounts
            const accountsRes = await fetch('/api/salt/accounts');
            const accountsData = await accountsRes.json();

            if (!accountsData.success) throw new Error(accountsData.error);

            setAccounts(accountsData.accounts);
            setIsConnected(true);

            // Auto-select first account
            if (accountsData.accounts.length > 0) {
                await selectAccount(accountsData.accounts[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setIsLoading(false);
        }
    };

    const selectAccount = async (account: SaltAccount) => {
        const res = await fetch('/api/salt/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id }),
        });

        if (res.ok) {
            setActiveAccount(account);
            onConnected?.(account);
        }
    };

    return (
        <div className="card">
            <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Salt Account</h3>

            {!isConnected ? (
                <button
                    onClick={connectSalt}
                    disabled={isLoading}
                    className="btn btn-primary w-full"
                >
                    {isLoading ? (
                        <>
                            <span className="animate-spin">⟳</span>
                            Connecting...
                        </>
                    ) : (
                        'Connect Salt'
                    )}
                </button>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="status-dot connected" />
                        <span className="text-[var(--accent)] text-sm font-medium">Connected</span>
                    </div>

                    {signerAddress && (
                        <div className="text-xs text-[var(--muted)]">
                            Signer: <span className="font-mono">{signerAddress.slice(0, 10)}...{signerAddress.slice(-6)}</span>
                        </div>
                    )}

                    {activeAccount && (
                        <div className="bg-black/50 rounded-lg p-3 border border-[var(--card-border)]">
                            <p className="text-white text-sm font-medium">
                                {activeAccount.name}
                            </p>
                            <p className="text-[var(--muted)] text-xs font-mono truncate">
                                {activeAccount.address}
                            </p>
                        </div>
                    )}

                    {accounts.length > 1 && (
                        <select
                            value={activeAccount?.id || ''}
                            onChange={(e) => {
                                const acc = accounts.find(a => a.id === e.target.value);
                                if (acc) selectAccount(acc);
                            }}
                            className="w-full bg-black text-white text-sm rounded-lg p-2 border border-[var(--card-border)]"
                        >
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name || acc.address.slice(0, 10) + '...'}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {error && (
                <p className="text-[var(--danger)] text-sm mt-3">{error}</p>
            )}
        </div>
    );
}
