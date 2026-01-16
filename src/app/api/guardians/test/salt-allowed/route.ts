import { NextRequest, NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { recordEvent } from '@/guardians/state';

/**
 * POST /api/guardians/test/salt-allowed
 * Execute a small transfer that SHOULD succeed (within policy limits)
 */
export async function POST(request: NextRequest) {
    const logs: string[] = [];
    const log = (msg: string) => logs.push(msg);

    try {
        const client = getSaltClient();
        log('Authenticating with Salt...');
        await client.authenticate();

        const orgs = await client.getOrganisations();
        if (orgs.length === 0) {
            throw new Error('No organizations found');
        }

        // Use SALT_ORG_ID from env to find correct org
        const targetOrgId = process.env.SALT_ORG_ID;
        let selectedOrg = orgs[0] as unknown as Record<string, unknown>;

        if (targetOrgId) {
            const found = orgs.find((o: unknown) => {
                const org = o as Record<string, unknown>;
                return org._id === targetOrgId || org.id === targetOrgId;
            });
            if (found) selectedOrg = found as unknown as Record<string, unknown>;
        }

        const orgId = (selectedOrg._id || selectedOrg.id) as string;
        log(`Using org: ${selectedOrg.name || 'Unknown'} (${orgId})`);

        const accounts = await client.getAccounts(orgId);
        if (accounts.length === 0) {
            throw new Error('No accounts found in organization. Create an account in Salt Dashboard.');
        }

        // Use SALT_ACCOUNT_ID from env if specified
        const targetAccountId = process.env.SALT_ACCOUNT_ID;
        let account = accounts[0];

        if (targetAccountId) {
            const found = accounts.find(a => a.id === targetAccountId);
            if (found) account = found;
        }

        log(`Using account: ${account.name} (${account.address})`);

        // Execute a small transfer to ALLOWED_RECIPIENT
        const allowedRecipient = process.env.ALLOWED_RECIPIENT;
        if (!allowedRecipient) {
            throw new Error('ALLOWED_RECIPIENT not configured in .env.local');
        }

        log(`Transferring 0.00001 ETH to ${allowedRecipient}...`);

        const result = await client.transfer({
            accountId: account.id,
            to: allowedRecipient,
            token: 'ETH',
            amount: '0.00001', // Very small amount for testing
        });

        logs.push(...(result.logs || []));

        // Record the event
        const event = recordEvent(
            'transfer',
            {
                to: allowedRecipient.slice(0, 10) + '...',
                token: 'ETH',
                amount: 0.00001,
            },
            result.success,
            result.policyBreach ? [{
                guardian: 'venue',
                name: 'Salt Policy',
                reason: result.policyBreach.reason || 'Policy denied',
                severity: 'block',
            }] : [],
            result.txHash
        );

        return NextResponse.json({
            success: result.success,
            message: result.success
                ? '✅ Guardian signed and broadcast transaction'
                : `🚫 Guardian refused: ${result.policyBreach?.reason || 'Unknown'}`,
            event,
            txHash: result.txHash,
            explorerUrl: result.txHash
                ? `https://sepolia.arbiscan.io/tx/${result.txHash}`
                : undefined,
            logs,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log(`Error: ${message}`);

        // Record failed event
        recordEvent(
            'transfer',
            { token: 'ETH', amount: 0.00001 },
            false,
            [{
                guardian: 'venue',
                name: 'Salt Connection',
                reason: message,
                severity: 'block',
            }]
        );

        return NextResponse.json({
            success: false,
            message: `❌ Test failed: ${message}`,
            logs,
        }, { status: 500 });
    }
}
