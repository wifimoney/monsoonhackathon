/**
 * Price Updater Service
 * 
 * Pushes prices to HyperCoreQuoter when precompile is unavailable.
 * Runs as a separate service alongside the executor.
 */

import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Hyperliquid } from './hyperliquid';
import { HYPEREVM, HYPERCORE_QUOTER_ABI } from '../lib/contracts';

const HYPEREVM_CHAIN = {
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    },
};

async function main() {
    const account = privateKeyToAccount(process.env.UPDATER_PRIVATE_KEY as `0x${string}`);

    const walletClient = createWalletClient({
        account,
        chain: HYPEREVM_CHAIN,
        transport: http(),
    });

    const hl = new Hyperliquid(account);

    console.log('🔄 Price Updater starting...');
    console.log(`   Quoter: ${HYPEREVM.HYPERCORE_QUOTER}`);
    console.log(`   Updater: ${account.address}`);

    // Update every 30 seconds
    const UPDATE_INTERVAL = 30_000;

    async function updatePrice() {
        try {
            // Get price from Hyperliquid API
            const midPrice = await hl.getMidPrice('HYPE');
            const priceWei = parseEther(midPrice.toString());

            console.log(`📊 Updating price: $${midPrice}`);

            // Send to quoter contract
            const hash = await walletClient.writeContract({
                address: HYPEREVM.HYPERCORE_QUOTER as `0x${string}`,
                abi: HYPERCORE_QUOTER_ABI,
                functionName: 'updatePrice',
                args: [priceWei],
            });

            console.log(`   tx: ${hash}`);
        } catch (error) {
            console.error('❌ Price update failed:', error);
        }
    }

    // Initial update
    await updatePrice();

    // Schedule updates
    setInterval(updatePrice, UPDATE_INTERVAL);

    console.log(`✅ Price updater running (every ${UPDATE_INTERVAL / 1000}s)`);
}

// Only run if main script
if (require.main === module) {
    main().catch(console.error);
}
