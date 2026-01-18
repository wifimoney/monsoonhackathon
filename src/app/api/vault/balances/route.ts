import { NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { broadcasting_network_provider } from '@/salt/config';
import { ethers } from 'ethers';

// Minimal ERC20 ABI for balance check
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const orgId = searchParams.get('orgId');

    if (!accountId || !orgId) {
        return NextResponse.json({ error: 'Missing accountId or orgId' }, { status: 400 });
    }

    try {
        const saltClient = getSaltClient();

        // Auth if needed
        if (!saltClient.getIsAuthenticated()) {
            await saltClient.authenticate();
        }

        // Get Account Address
        const accounts = await saltClient.getAccounts(orgId);
        const account = accounts.find((a: any) => a.id === accountId);

        if (!account || !account.address) {
            return NextResponse.json({ error: 'Account not found or no address' }, { status: 404 });
        }

        const address = account.address;
        const provider = broadcasting_network_provider;

        // 1. Native Balance
        const natBalance = await provider.getBalance(address);
        const native = {
            symbol: 'ETH', // or generic 'NATIVE'
            balance: ethers.utils.formatEther(natBalance),
            raw: natBalance.toString()
        };

        // 2. Token Balances (Mock Tokens)
        // We should get these from addresses config, but for now we read env or assume defaults.
        // Ideally we import addresses from @/lib/contracts/addresses.ts, checking DEPLOYED
        const { DEPLOYED } = await import('@/lib/contracts/addresses');

        const tokens = [];

        if (DEPLOYED.tokens.TOKEN0) {
            const t0 = new ethers.Contract(DEPLOYED.tokens.TOKEN0.address, ERC20_ABI, provider);
            const b0 = await t0.balanceOf(address);
            tokens.push({
                symbol: DEPLOYED.tokens.TOKEN0.symbol,
                address: DEPLOYED.tokens.TOKEN0.address,
                balance: ethers.utils.formatUnits(b0, DEPLOYED.tokens.TOKEN0.decimals),
                raw: b0.toString()
            });
        }

        if (DEPLOYED.tokens.TOKEN1) {
            const t1 = new ethers.Contract(DEPLOYED.tokens.TOKEN1.address, ERC20_ABI, provider);
            const b1 = await t1.balanceOf(address);
            tokens.push({
                symbol: DEPLOYED.tokens.TOKEN1.symbol,
                address: DEPLOYED.tokens.TOKEN1.address,
                balance: ethers.utils.formatUnits(b1, DEPLOYED.tokens.TOKEN1.decimals),
                raw: b1.toString()
            });
        }

        return NextResponse.json({
            address,
            native,
            tokens
        });

    } catch (error) {
        console.error('Error fetching balances:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
