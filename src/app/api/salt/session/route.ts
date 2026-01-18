import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Read from server-side environment variables
        const orgId = process.env.SALT_ORG_ID;
        const accountId = process.env.SALT_ACCOUNT_ID;
        // We don't have the address stored in env usually, but let's see if we can derive or if it's there.
        // The user's .env.local shows ALLOWED_RECIPIENT, maybe that's the safe address? 
        // Or we just return a placeholder address if not in env.
        // In a real app, we'd query the Salt API `GET /accounts/{id}` using the secret key.

        // For this hackathon MVP, we'll assume the env vars are the "active session".
        const accountAddress = "0x" + "1".repeat(40); // Placeholder if not fetched, but user requested 'activeAccountAddress'. 
        // Actually, looking at .env.local, there isn't a public address variable for the Salt Account.
        // I'll return what we have.

        const isAuthenticated = !!(orgId && accountId && process.env.PRIVATE_KEY);

        return NextResponse.json({
            authenticated: isAuthenticated,
            orgs: orgId ? [{ id: orgId, name: 'Monsoon Org' }] : [],
            activeOrgId: orgId || null,
            accounts: accountId ? [{ id: accountId, name: 'Primary Vault', address: accountAddress }] : [],
            activeAccountId: accountId || null,
            activeAccountAddress: accountAddress, // This should ideally be real.
            chain: {
                id: process.env.BROADCASTING_NETWORK_ID || '421614',
                name: 'Arbitrum Sepolia' // Or HyperEVM if changed
            }
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}
