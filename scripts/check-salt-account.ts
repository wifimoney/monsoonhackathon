#!/usr/bin/env npx ts-node

/**
 * Check Salt Account Chain Configuration
 */

import { Salt } from 'salt-sdk';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ORCHESTRATION_RPC = process.env.ORCHESTRATION_NETWORK_RPC_NODE_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

async function main() {
    console.log('🔍 Checking Salt Account Configuration\n');
    console.log('='.repeat(60));

    if (!PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not set in .env.local');
        process.exit(1);
    }

    // Create provider and signer
    const provider = new ethers.providers.StaticJsonRpcProvider({
        url: ORCHESTRATION_RPC,
        skipFetchSetup: true,
    });
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const signer = wallet.connect(provider);

    console.log(`🔑 Signer: ${await signer.getAddress()}\n`);

    // Initialize Salt
    const salt = new Salt({ environment: 'TESTNET' });

    // Authenticate
    await salt.authenticate(signer);
    console.log('✅ Authenticated\n');

    // Get organizations
    const orgs = await salt.getOrganisations();

    // Find account
    let foundAccount: any = null;
    let foundOrg: any = null;

    for (const org of orgs) {
        const accounts = await salt.getAccounts(org._id);
        if (accounts.length > 0) {
            foundAccount = accounts[0];
            foundOrg = org;
            break;
        }
    }

    if (!foundAccount) {
        console.log('❌ No accounts found');
        process.exit(1);
    }

    console.log('📋 Account Details:');
    console.log('='.repeat(60));
    console.log(`Organization: ${foundOrg.name || foundOrg._id}`);
    console.log(`Account Name: ${foundAccount.name || 'Unnamed'}`);
    console.log(`Account ID: ${foundAccount.id}`);
    console.log(`Address: ${foundAccount.publicKey}`);
    console.log('');

    // Print full account object to see all properties
    console.log('🔍 Full Account Object:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(foundAccount, null, 2));
    console.log('');

    // Check for chain-specific properties
    if (foundAccount.chainId) {
        console.log(`\n🔗 Chain ID: ${foundAccount.chainId}`);
        const chainNames: Record<number, string> = {
            1: 'Ethereum Mainnet',
            11155111: 'Ethereum Sepolia',
            421614: 'Arbitrum Sepolia',
            42161: 'Arbitrum One',
            84532: 'Base Sepolia',
            8453: 'Base',
            998: 'HyperEVM Testnet',
            999: 'HyperEVM Mainnet',
            50312: 'Somnia Shannon Testnet',
        };
        console.log(`   Network: ${chainNames[foundAccount.chainId] || 'Unknown'}`);
    }

    if (foundAccount.network) {
        console.log(`\n🌐 Network: ${foundAccount.network}`);
    }

    if (foundAccount.blockchain) {
        console.log(`\n⛓️  Blockchain: ${foundAccount.blockchain}`);
    }
}

main().catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});
