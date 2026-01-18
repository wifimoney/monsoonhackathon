// Off-Chain Executor for Monsoon
// Listens for AllocateToOB events and places orders on HyperLiquid

import { createPublicClient, http, parseAbiItem } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

// Import from single source of truth
import deployedAddresses from '../../contracts/addresses.arbitrum-sepolia.json';

const CHAIN_ID = deployedAddresses.chainId;
const RPC_URL = deployedAddresses.rpcUrl;
const MONSOON_ALM = deployedAddresses.contracts.MonsoonALM;

// Event signature for AllocateToOB
const ALLOCATE_EVENT = parseAbiItem('event AllocateToOB(uint256 amount0, uint256 amount1)');

interface OrderParams {
    asset: string;
    side: 'buy' | 'sell';
    price: number;
    size: number;
}

export class OBExecutor {
    private client;
    private isRunning = false;

    constructor() {
        this.client = createPublicClient({
            chain: arbitrumSepolia,
            transport: http(RPC_URL),
        });
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🎯 OB Executor starting...');
        console.log(`   Chain ID: ${CHAIN_ID}`);
        console.log(`   RPC: ${RPC_URL}`);
        console.log(`   ALM: ${MONSOON_ALM}`);
        console.log('');

        // Watch for AllocateToOB events
        this.client.watchContractEvent({
            address: MONSOON_ALM as `0x${string}`,
            abi: [ALLOCATE_EVENT],
            eventName: 'AllocateToOB',
            onLogs: (logs) => {
                for (const log of logs) {
                    this.handleAllocation(log);
                }
            },
        });

        console.log('✅ Executor running, listening for AllocateToOB events...');
    }

    private async handleAllocation(log: unknown) {
        console.log('');
        console.log('📥 AllocateToOB event received!');
        console.log('   Log:', JSON.stringify(log, null, 2));

        // Get mid price from HyperLiquid
        const midPrice = await this.fetchMidPrice();
        console.log(`   Mid price: $${midPrice}`);

        // Calculate order parameters
        const spreadBps = 30; // 0.3% spread
        const bidPrice = midPrice * (1 - spreadBps / 10000);
        const askPrice = midPrice * (1 + spreadBps / 10000);

        console.log(`   Bid: $${bidPrice.toFixed(2)}`);
        console.log(`   Ask: $${askPrice.toFixed(2)}`);

        // Place orders
        await this.placeOrder({ asset: 'HYPE', side: 'buy', price: bidPrice, size: 1 });
        await this.placeOrder({ asset: 'HYPE', side: 'sell', price: askPrice, size: 1 });

        console.log('✅ Orders placed successfully');
    }

    private async fetchMidPrice(): Promise<number> {
        // In production, fetch from HyperLiquid API
        // For demo, return mock price
        return 2000;
    }

    private async placeOrder(params: OrderParams): Promise<void> {
        console.log(`📤 Placing ${params.side.toUpperCase()} order: ${params.size} ${params.asset} @ $${params.price.toFixed(2)}`);
        // In production, call HyperLiquid API
        // For demo, just log
    }

    stop() {
        this.isRunning = false;
        console.log('⏹️ Executor stopped');
    }
}

// Main entry point
async function main() {
    console.log('========================================');
    console.log('🌧️  MONSOON OB EXECUTOR');
    console.log('========================================');
    console.log('');

    const executor = new OBExecutor();
    await executor.start();

    // Keep alive
    process.on('SIGINT', () => {
        console.log('');
        executor.stop();
        process.exit(0);
    });
}

main().catch(console.error);
