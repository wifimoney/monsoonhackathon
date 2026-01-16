#!/usr/bin/env npx ts-node

/**
 * Check if Salt account is connected and authenticated
 */

import { getSaltClient } from '../src/salt/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('🔍 Checking Salt Account Connection\n');
    console.log('='.repeat(60));

    const client = getSaltClient();

    // Check if already authenticated
    console.log('1️⃣  Checking authentication status...');
    const isAuth = client.getIsAuthenticated();
    console.log(`   Status: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}`);

    if (!isAuth) {
        console.log('\n2️⃣  Attempting to authenticate...');
        try {
            const result = await client.authenticate();
            console.log(`   ✅ Authentication successful`);
            console.log(`   Address: ${result.address}`);
        } catch (error: any) {
            console.error(`   ❌ Authentication failed: ${error.message}`);
            process.exit(1);
        }
    }

    // Get organizations
    console.log('\n3️⃣  Fetching organizations...');
    try {
        const orgs = await client.getOrganisations();
        console.log(`   ✅ Found ${orgs.length} organization(s)`);
        orgs.forEach((org: any, i: number) => {
            console.log(`      [${i}] ${org.name || org._id}`);
        });

        // Get accounts from first org
        if (orgs.length > 0) {
            console.log('\n4️⃣  Fetching accounts...');
            for (const org of orgs) {
                const accounts = await client.getAccounts(org._id);
                if (accounts.length > 0) {
                    console.log(`   ✅ Found ${accounts.length} account(s) in "${org.name}"`);
                    accounts.forEach((acc: any, i: number) => {
                        console.log(`      [${i}] ${acc.name || 'Unnamed'}`);
                        console.log(`          ID: ${acc.id}`);
                        console.log(`          Address: ${acc.address}`);
                    });

                    // Check active account
                    const activeId = client.getActiveAccountId();
                    console.log(`\n   🎯 Active account: ${activeId || 'None set'}`);

                    if (!activeId && accounts.length > 0) {
                        console.log(`\n   ℹ️  Setting first account as active...`);
                        client.setActiveAccount(accounts[0].id);
                        console.log(`   ✅ Active account set to: ${accounts[0].id}`);
                    }

                    break;
                }
            }
        }
    } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Salt account is connected and ready!');
    console.log('\nYou can now use the agent at http://localhost:3000/trade');
}

main().catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});
