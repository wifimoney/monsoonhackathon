import { NextResponse } from 'next/server';

// Return agent configuration
// In production: Would be per-user from database
export async function GET() {
    return NextResponse.json({
        guardrails: {
            allowedMarkets: ['GOLD', 'OIL', 'SILVER', 'BTC', 'ETH'],
            maxPerTx: 250,
            cooldownSeconds: 60,
        },
        accountId: process.env.SALT_ACCOUNT_ID || '696a40b5b0f979ec8ece4482',
        chain: {
            name: 'HyperEVM Testnet',
            chainId: 998,
        },
    });
}
