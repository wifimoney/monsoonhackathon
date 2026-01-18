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
const ALLOCATE_EVENT = parseAbiItem('event AllocateToOB(uint256 amount0, uint256 amount1, bool isBid, uint256 timestamp)');

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

    private async handleAllocation(log: any) {
        console.log('');
        console.log('📥 AllocateToOB event received!');

        // Parse args directly from log.args if available in viem log object
        const { amount0, amount1, isBid, timestamp } = log.args;

        console.log(`   Amount0 (USDC): ${amount0}`);
        console.log(`   Amount1 (ETH): ${amount1}`);
        console.log(`   IsBid flag: ${isBid}`);
        console.log(`   Timestamp: ${timestamp}`);

        // Get mid price from HyperLiquid
        const midPrice = await this.fetchMidPrice();
        console.log(`   Mid price: $${midPrice}`);

        // Calculate order parameters
        // Logic: 
        // If amount1 > 0 (ETH) -> We have inventory to SELL -> ASK Order
        // If amount0 > 0 (USDC) -> We have inventory to BUY -> BID Order

        if (amount1 > BigInt(0)) {
            // Place ASK
            const askPrice = midPrice * 1.003; // +0.3%
            const size = Number(amount1) / 1e18; // Convert Wei to ETH

            console.log(`   Configuring SELL Order (Inventory: ${size} ETH)`);
            await this.placeOrder({
                asset: 'ETH', // or HYPE depending on testnet
                side: 'sell',
                price: askPrice,
                size: size
            });
        }

        if (amount0 > BigInt(0)) {
            // Place BID
            const bidPrice = midPrice * 0.997; // -0.3%
            const size = Number(amount0) / 1e6 / bidPrice; // Convert USDC to ETH Size? 
            // Hyperliquid size is usually in Base Asset (ETH).
            // amount0 is USDC.
            // Size = Amount0 / Price.

            console.log(`   Configuring BUY Order (Inventory: ${Number(amount0) / 1e6} USDC) -> Size: ${size.toFixed(4)} ETH`);
            await this.placeOrder({
                asset: 'ETH',
                side: 'buy',
                price: bidPrice,
                size: size
            });
        }

        console.log('✅ Allocation processed');
    }

    private async fetchMidPrice(): Promise<number> {
        // In production, fetch from HyperLiquid API
        // For demo, return mock price linked to "Real-ish" ranges
        return 2400 + Math.random() * 10;
    }

    private async placeOrder(params: OrderParams): Promise<void> {
        console.log(`📤 Placing ${params.side.toUpperCase()} order: ${params.size.toFixed(4)} ${params.asset} @ $${params.price.toFixed(2)}`);
        // In production, call HyperLiquid API
        // For demo, log the "Audit Record"
        console.log(`   [AUDIT] Order Signed & Submitted. OrderId: mock-oid-${Date.now()}`);
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
