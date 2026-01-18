import { NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { broadcasting_network_provider } from '@/salt/config';
import { ethers } from 'ethers';
import { recordAudit } from '@/audit';
import { MONSOON_ALM_ABI, ERC20_ABI } from '@/lib/contracts/abis';
import { DEPLOYED, HYPEREVM } from '@/lib/contracts/addresses';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orgId, accountId, tokenAddress, amount } = body;

        if (!orgId || !accountId || !tokenAddress || !amount) {
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

        // 2. Setup Contracts
        const provider = broadcasting_network_provider;
        const almAddress = HYPEREVM.MONSOON_ALM;
        const amountBig = BigInt(amount);

        // 3. Handle Approval (if ERC20)
        let needsApprove = true;
        // Check allowance
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const allowance = await tokenContract.allowance(safeAddress, almAddress);

        if (allowance.gte(amountBig)) {
            needsApprove = false;
        }

        if (needsApprove) {
            console.log(`[Vault] Approving ${amount} for ${almAddress}`);
            const erc20Interface = new ethers.utils.Interface(ERC20_ABI);
            const approveData = erc20Interface.encodeFunctionData("approve", [almAddress, amountBig]);

            const approveResult = await saltClient.submitTx({
                accountId,
                to: tokenAddress,
                value: "0",
                data: approveData
            });

            await recordAudit({
                actionType: "approval",
                actionCategory: "execution",
                account: { id: accountId, name: 'Salt Account', address: safeAddress },
                status: approveResult.success ? "pending" : "failed",
                result: { passed: approveResult.success, denials: [] },
                payload: { token: tokenAddress, amount: Number(amount), description: `Approve ALM spender` },
                txHash: approveResult.txHash || undefined,
                source: "user"
            });

            if (!approveResult.success) {
                return NextResponse.json({ error: 'Approval failed', result: approveResult }, { status: 500 });
            }
        }

        // 4. Handle Deposit
        console.log(`[Vault] Depositing ${amount} to ALM`);

        // Determine amount0 vs amount1
        let amount0 = BigInt(0);
        let amount1 = BigInt(0);

        if (tokenAddress.toLowerCase() === DEPLOYED.tokens.TOKEN0.address.toLowerCase()) {
            amount0 = amountBig;
        } else if (tokenAddress.toLowerCase() === DEPLOYED.tokens.TOKEN1.address.toLowerCase()) {
            amount1 = amountBig;
        } else {
            return NextResponse.json({ error: 'Unknown token address' }, { status: 400 });
        }

        const almInterface = new ethers.utils.Interface(MONSOON_ALM_ABI);
        const depositData = almInterface.encodeFunctionData("deposit", [
            amount0,
            amount1,
            safeAddress
        ]);

        const depositResult = await saltClient.submitTx({
            accountId,
            to: almAddress,
            value: "0",
            data: depositData
        });

        await recordAudit({
            actionType: "transfer",
            actionCategory: "execution",
            account: { id: accountId, name: 'Salt Account', address: safeAddress },
            status: depositResult.success ? "pending" : "failed",
            result: { passed: depositResult.success, denials: [] },
            payload: {
                amount: Number(amount),
                description: `Deposit ${amount} to MonsoonALM`
            },
            txHash: depositResult.txHash || undefined,
            source: "user"
        });

        return NextResponse.json({
            success: depositResult.success,
            txHash: depositResult.txHash,
            status: depositResult.status
        });

    } catch (error: any) {
        console.error('Error processing deposit:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
