import { NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { ethers } from 'ethers';
import { recordAudit } from '@/audit';
import { MONSOON_ALM_ABI } from '@/lib/contracts/abis';
import { HYPEREVM } from '@/lib/contracts/addresses';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orgId, accountId, lpAmount } = body;

        if (!orgId || !accountId || !lpAmount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const saltClient = getSaltClient();
        if (!saltClient.getIsAuthenticated()) {
            await saltClient.authenticate();
        }

        // 1. Get Salt Account Address
        const accounts = await saltClient.getAccounts(orgId);
        const account = accounts.find((a: any) => a.id === accountId);
        if (!account || !account.address) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }
        const safeAddress = account.address;

        // 2. Execute Withdraw
        console.log(`[Vault] Withdrawing ${lpAmount} LP from ALM`);
        const almAddress = HYPEREVM.MONSOON_ALM;
        const lpAmountBig = BigInt(lpAmount);

        const almInterface = new ethers.utils.Interface(MONSOON_ALM_ABI);
        const withdrawData = almInterface.encodeFunctionData("withdraw", [
            lpAmountBig,
            safeAddress
        ]);

        const withdrawResult = await saltClient.submitTx({
            accountId,
            to: almAddress,
            value: "0",
            data: withdrawData
        });

        await recordAudit({
            actionType: "transfer",
            actionCategory: "execution",
            account: { id: accountId, name: 'Salt Account', address: safeAddress },
            status: withdrawResult.success ? "pending" : "failed",
            result: { passed: withdrawResult.success, denials: [] },
            payload: {
                amount: Number(lpAmount),
                description: `Withdraw ${lpAmount} LP from MonsoonALM`
            },
            txHash: withdrawResult.txHash || undefined,
            source: "user"
        });

        return NextResponse.json({
            success: withdrawResult.success,
            txHash: withdrawResult.txHash,
            status: withdrawResult.status
        });

    } catch (error: any) {
        console.error('Error processing withdraw:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
