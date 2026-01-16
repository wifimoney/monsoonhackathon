import { NextRequest, NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { recordEvent } from '@/guardians/state';

/**
 * POST /api/guardians/test/salt-denied
 * Execute a transfer that SHOULD fail (violates policy)
 * - reason=recipient: Send to non-allowlisted address (0xdead...)
 * - reason=amount: Send too much (exceeds limit)
 */
export async function POST(request: NextRequest) {
    const logs: string[] = [];
    const log = (msg: string) => logs.push(msg);

    try {
        const body = await request.json().catch(() => ({}));
        const reason = body.reason || 'recipient';

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

        log(`Using account: ${account.name}`);

        let recipient: string;
        let amount: string;
        let expectedReason: string;

        if (reason === 'recipient') {
            // Send to a forbidden address (not in allowlist)
            recipient = '0x000000000000000000000000000000000000dEaD';
            amount = '0.0001';
            expectedReason = 'Recipient not in allowlist';
            log(`Testing denied recipient: ${recipient}`);
        } else {
            // Send too much (should exceed amount limit if configured)
            recipient = process.env.ALLOWED_RECIPIENT || '0x000000000000000000000000000000000000dEaD';
            amount = '1000'; // 1000 ETH - way over any reasonable limit
            expectedReason = 'Amount exceeds policy limit';
            log(`Testing denied amount: ${amount} ETH`);
        }

        log(`Attempting transfer to ${recipient}...`);

        const result = await client.transfer({
            accountId: account.id,
            to: recipient,
            token: 'ETH',
            amount,
        });

        logs.push(...(result.logs || []));

        // Record the event
        const event = recordEvent(
            'transfer',
            {
                to: recipient.slice(0, 10) + '...',
                token: 'ETH',
                amount: parseFloat(amount),
            },
            result.success,
            result.policyBreach ? [{
                guardian: reason === 'recipient' ? 'venue' : 'spend',
                name: reason === 'recipient' ? 'Venue Guardian' : 'Spend Guardian',
                reason: result.policyBreach.reason || expectedReason,
                severity: 'block',
            }] : (result.success ? [] : [{
                guardian: reason === 'recipient' ? 'venue' : 'spend',
                name: reason === 'recipient' ? 'Venue Guardian' : 'Spend Guardian',
                reason: expectedReason,
                severity: 'block',
            }]),
            result.txHash
        );

        // For a "denied" test, success means the denial worked!
        const testPassed = !result.success;

        return NextResponse.json({
            success: testPassed,
            message: testPassed
                ? `🚫 Guardian correctly refused: ${result.policyBreach?.reason || expectedReason}`
                : '⚠️ Unexpectedly succeeded - check Salt policy config!',
            event,
            policyBreach: result.policyBreach,
            logs,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log(`Error: ${message}`);

        // Check if the error itself is a policy denial
        const isPolicyDenial = message.includes('policy') ||
            message.includes('denied') ||
            message.includes('allowlist');

        recordEvent(
            'transfer',
            { token: 'ETH' },
            false,
            [{
                guardian: 'venue',
                name: 'Salt Policy',
                reason: message,
                severity: 'block',
            }]
        );

        return NextResponse.json({
            success: isPolicyDenial, // Policy denial = test passed
            message: isPolicyDenial
                ? `🚫 Guardian correctly refused: ${message}`
                : `❌ Test error: ${message}`,
            logs,
        }, { status: isPolicyDenial ? 200 : 500 });
    }
}
