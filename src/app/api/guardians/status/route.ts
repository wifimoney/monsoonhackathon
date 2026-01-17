import { NextResponse } from 'next/server';
import { getSaltClient } from '@/salt/client';
import { getGuardiansConfig, getLastHealthCheck } from '@/guardians/state';
import type { GuardianStatus, GuardianPolicy } from '@/guardians/types';

export async function GET() {
    try {
        const client = getSaltClient();
        let status: GuardianStatus;

        try {
            // Try to get real Salt status
            await client.authenticate();
            const orgs = await client.getOrganisations();

            // Find the org by ID from env, or use the one with accounts
            const targetOrgId = process.env.SALT_ORG_ID;
            let selectedOrg = orgs[0] as unknown as Record<string, unknown>;

            if (targetOrgId) {
                const found = orgs.find((o: unknown) => {
                    const org = o as Record<string, unknown>;
                    return org._id === targetOrgId || org.id === targetOrgId;
                });
                if (found) selectedOrg = found as unknown as Record<string, unknown>;
            }

            const orgId = (selectedOrg?._id || selectedOrg?.id || '') as string;
            const orgName = (selectedOrg?.name || 'Organization') as string;

            let account = { id: '', name: 'No Account', address: '' };
            if (orgId) {
                const accounts = await client.getAccounts(orgId);
                // Use SALT_ACCOUNT_ID from env if specified
                const targetAccountId = process.env.SALT_ACCOUNT_ID;
                let selectedAccount = accounts[0];

                if (targetAccountId) {
                    const found = accounts.find(a => a.id === targetAccountId);
                    if (found) selectedAccount = found;
                }

                if (selectedAccount) {
                    account = {
                        id: selectedAccount.id,
                        name: selectedAccount.name || 'Salt Account',
                        address: selectedAccount.address || '',
                    };
                }
            }

            status = {
                org: { id: orgId, name: orgName },
                account,
                quorum: {
                    required: 2,
                    humans: 2,
                    robos: 3,
                    total: 5,
                },
                network: {
                    chainId: 421614,
                    name: 'Arbitrum Sepolia',
                },
                health: 'ready',
                lastHeartbeat: Date.now(),
            };
        } catch {
            // Salt not available, return degraded status
            const lastCheck = getLastHealthCheck();
            const timeSinceCheck = Date.now() - lastCheck;

            status = {
                org: { id: '', name: 'Unknown' },
                account: { id: '', name: 'Unknown', address: '' },
                quorum: { required: 2, humans: 2, robos: 3, total: 5 },
                network: { chainId: 421614, name: 'Arbitrum Sepolia' },
                health: timeSinceCheck > 300000 ? 'offline' : 'degraded',
                lastHeartbeat: lastCheck,
            };
        }

        // Build policies from current config
        const config = getGuardiansConfig();
        const policies: GuardianPolicy[] = [
            {
                id: 'spend',
                name: 'Spend Limit',
                type: 'amount_limit',
                enabled: config.spend.enabled,
                config: { maxPerTrade: config.spend.maxPerTrade, maxDaily: config.spend.maxDaily },
                description: `Max $${config.spend.maxPerTrade}/trade, $${config.spend.maxDaily}/day`,
            },
            {
                id: 'venue',
                name: 'Venue Allowlist',
                type: 'allowlist',
                enabled: config.venue.enabled,
                config: { contracts: config.venue.allowedContracts.length },
                description: `${config.venue.allowedContracts.length} approved contracts`,
            },
            {
                id: 'rate',
                name: 'Rate Limit',
                type: 'rate_limit',
                enabled: config.rate.enabled,
                config: { maxPerDay: config.rate.maxPerDay, cooldown: config.rate.cooldownSeconds },
                description: `${config.rate.maxPerDay}/day, ${config.rate.cooldownSeconds}s cooldown`,
            },
            {
                id: 'timeWindow',
                name: 'Trading Hours',
                type: 'time_window',
                enabled: config.timeWindow.enabled,
                config: { start: config.timeWindow.startHour, end: config.timeWindow.endHour },
                description: `${config.timeWindow.startHour}:00 - ${config.timeWindow.endHour}:00 UTC`,
            },
        ];

        return NextResponse.json({
            success: true,
            status,
            policies,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
