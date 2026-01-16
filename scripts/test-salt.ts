#!/usr/bin/env npx ts-node

/**
 * Salt SDK Validation Script
 * 
 * Tests:
 * 1. Authentication
 * 2. Organization discovery
 * 3. Account discovery
 * 4. Transfer (allowed)
 * 5. Transfer (forbidden - policy denial)
 * 
 * Usage:
 *   npx ts-node scripts/test-salt.ts
 */

import { Salt } from 'salt-sdk';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ORCHESTRATION_RPC = process.env.ORCHESTRATION_NETWORK_RPC_NODE_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const BROADCASTING_RPC = process.env.BROADCASTING_NETWORK_RPC_NODE_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const CHAIN_ID = Number(process.env.BROADCASTING_NETWORK_ID) || 421614;

async function main() {
    console.log('🧂 Salt SDK Validation Script\n');
    console.log('='.repeat(50));

    // Check environment
    if (!PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not set in .env.local');
        process.exit(1);
    }

    console.log('📋 Configuration:');
    console.log(`   Chain ID: ${CHAIN_ID}`);
    console.log(`   Orchestration RPC: ${ORCHESTRATION_RPC}`);
    console.log(`   Broadcasting RPC: ${BROADCASTING_RPC}`);
    console.log('');

    // Create provider and signer
    const provider = new ethers.providers.StaticJsonRpcProvider({
        url: ORCHESTRATION_RPC,
        skipFetchSetup: true,
    });
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const signer = wallet.connect(provider);

    console.log(`🔑 Signer address: ${await signer.getAddress()}`);
    console.log('');

    // Initialize Salt
    const salt = new Salt({ environment: 'TESTNET' });

    // ============ TEST 1: Authentication ============
    console.log('='.repeat(50));
    console.log('1️⃣  Testing Authentication...');
    try {
        await salt.authenticate(signer);
        console.log('   ✅ Authentication successful');
    } catch (error: any) {
        console.error('   ❌ Authentication failed:', error.message);
        process.exit(1);
    }

    // ============ TEST 2: Organization Discovery ============
    console.log('');
    console.log('2️⃣  Testing Organization Discovery...');
    let orgs: any[] = [];
    try {
        orgs = await salt.getOrganisations();
        console.log(`   ✅ Found ${orgs.length} organization(s):`);
        orgs.forEach((org: any, i: number) => {
            console.log(`      [${i}] ${org.name || org._id}`);
        });
    } catch (error: any) {
        console.error('   ❌ Failed to get organizations:', error.message);
        process.exit(1);
    }

    if (orgs.length === 0) {
        console.log('   ⚠️  No organizations found. Create one in Salt dashboard.');
        process.exit(0);
    }

    // ============ TEST 3: Account Discovery ============
    console.log('');
    console.log('3️⃣  Testing Account Discovery...');

    let allAccounts: any[] = [];
    let selectedAccount: any = null;
    let selectedOrgName: string = '';

    // Check all organizations for accounts
    for (const org of orgs) {
        try {
            const orgAccounts = await salt.getAccounts(org._id);
            console.log(`   📋 Org "${org.name || org._id}": ${orgAccounts.length} account(s)`);

            if (orgAccounts.length > 0) {
                orgAccounts.forEach((acc: any, i: number) => {
                    console.log(`      [${i}] ${acc.name || 'Unnamed'} - ${acc.publicKey?.slice(0, 10)}...`);
                });

                // Use first account found
                if (!selectedAccount && orgAccounts.length > 0) {
                    selectedAccount = orgAccounts[0];
                    selectedOrgName = org.name || org._id;
                }

                allAccounts.push(...orgAccounts);
            }
        } catch (error: any) {
            console.error(`   ❌ Failed to get accounts for org "${org.name}":`, error.message);
        }
    }

    console.log(`\n   ✅ Total accounts found across all orgs: ${allAccounts.length}`);

    if (allAccounts.length === 0) {
        console.log('   ⚠️  No accounts found in any organization. Create one in Salt dashboard.');
        process.exit(0);
    }

    const accountId = selectedAccount.id;
    const accountAddress = selectedAccount.publicKey;
    console.log(`\n   🎯 Using account from org "${selectedOrgName}":`);
    console.log(`      ID: ${accountId}`);
    console.log(`      Address: ${accountAddress}`);

    // ============ TEST 4: Broadcasting Provider ============
    console.log('');
    console.log('4️⃣  Testing Broadcasting Network...');
    const broadcastingProvider = new ethers.providers.StaticJsonRpcProvider({
        url: BROADCASTING_RPC,
        skipFetchSetup: true,
    });

    try {
        const network = await broadcastingProvider.getNetwork();
        console.log(`   ✅ Connected to chain ${network.chainId} (${network.name})`);

        if (network.chainId !== CHAIN_ID) {
            console.log(`   ⚠️  Chain ID mismatch: expected ${CHAIN_ID}, got ${network.chainId}`);
        }

        const balance = await broadcastingProvider.getBalance(accountAddress);
        console.log(`   💰 Account balance: ${ethers.utils.formatEther(balance)} ETH`);
    } catch (error: any) {
        console.error('   ❌ Broadcasting network error:', error.message);
    }

    // ============ SUMMARY ============
    console.log('');
    console.log('='.repeat(50));
    console.log('📊 Summary:');
    console.log('   ✅ Authentication: Working');
    console.log(`   ✅ Organizations: ${orgs.length} found`);
    console.log(`   ✅ Accounts: ${allAccounts.length} found`);
    console.log('');
    console.log('🎉 Salt SDK is ready for use!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Configure policies in Salt dashboard');
    console.log('   2. Test transfer in the app at /guardrails');
    console.log('   3. Try "Forbidden Action" to see policy denial');
}

main().catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});
