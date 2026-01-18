import { NextResponse } from 'next/server';
import { GuardianService } from '@/lib/guardian-service';
import { recordAudit } from '@/audit';
import { DEPLOYED } from '@/lib/contracts/addresses';

interface SimulateRequest {
    action: 'deposit' | 'withdraw';
    amount: string;  // In token units (e.g., "100" for 100 USDC)
    tokenAddress?: string;
}

export async function POST(request: Request) {
    try {
        const body: SimulateRequest = await request.json();
        const { action, amount, tokenAddress } = body;

        if (!action || !amount) {
            return NextResponse.json({ error: 'Missing action or amount' }, { status: 400 });
        }

        const amountNumber = parseFloat(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Determine token symbol for logging
        let tokenSymbol = 'UNKNOWN';
        if (tokenAddress) {
            if (tokenAddress.toLowerCase() === DEPLOYED.tokens.TOKEN0.address.toLowerCase()) {
                tokenSymbol = DEPLOYED.tokens.TOKEN0.symbol;
            } else if (tokenAddress.toLowerCase() === DEPLOYED.tokens.TOKEN1.address.toLowerCase()) {
                tokenSymbol = DEPLOYED.tokens.TOKEN1.symbol;
            }
        }

        console.log(`[Vault Simulate] ${action} ${amountNumber} ${tokenSymbol}`);

        // Run Guardian policy check
        const policyResult = await GuardianService.validateVaultAction({
            action,
            amountUsd: amountNumber, // Assuming 1:1 for stablecoins, adjust as needed
            tokenSymbol
        });

        // Record simulation audit
        await recordAudit({
            actionType: action,
            actionCategory: "policy",
            status: policyResult.success ? "approved" : "denied",
            result: { passed: policyResult.success, denials: policyResult.denials || [] },
            payload: {
                amount: amountNumber,
                token: tokenSymbol,
                description: `Vault ${action} simulation`
            },
            source: "user",
            account: { id: "VAULT_USER", name: "Vault User", address: "0x0000000000000000000000000000000000000000" }
        });

        if (!policyResult.success) {
            return NextResponse.json({
                approved: false,
                reason: policyResult.reason,
                denials: policyResult.denials
            });
        }

        return NextResponse.json({
            approved: true,
            message: `${action} of ${amountNumber} ${tokenSymbol} approved by guardians`
        });

    } catch (error: any) {
        console.error('Error in vault simulation:', error);
        return NextResponse.json({ error: error.message || 'Simulation failed' }, { status: 500 });
    }
}
