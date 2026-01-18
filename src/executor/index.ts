// Off-Chain Executor for Monsoon
// Listens for AllocateToOB events and places orders on HyperLiquid

import { createPublicClient, http, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { Hyperliquid } from './hyperliquid';

// Import from single source of truth
import deployedAddresses from '../../contracts/addresses.hyperevm-testnet.json';

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

interface AuditPayload {
    actionType: string;
    actionCategory: string;
    status: string;
    account: { id: string; name: string; address: string };
    result: { passed: boolean; denials: any[] };
    payload: any;
    orderId?: string;
    source: string;
}

export class OBExecutor {
    private client;
    private hl: Hyperliquid;
    private account;
    private isRunning = false;
    private hedgingInterval: NodeJS.Timeout | null = null;
    private readonly HEDGE_THRESHOLD_ETH = 0.1; // Rebalance if delta > 0.1 ETH

    constructor(auditEndpoint = 'http://localhost:3000/api/audit') {
        // Create HyperEVM client (where MonsoonALM is deployed)
        this.client = createPublicClient({
            transport: http(RPC_URL),
        });

        let pk = process.env.EXECUTOR_PRIVATE_KEY;
        if (!pk) throw new Error("EXECUTOR_PRIVATE_KEY not set");
        if (!pk.startsWith('0x')) pk = `0x${pk}`;
        this.account = privateKeyToAccount(pk as `0x${string}`);
        this.hl = new Hyperliquid(this.account);
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🎯 OB Executor starting...');
        console.log(`   Chain ID: ${CHAIN_ID}`);
        console.log(`   RPC: ${RPC_URL}`);
        console.log(`   ALM: ${MONSOON_ALM}`);
        console.log(`   HyperLiquid: ${this.hl ? 'Connected' : 'Simulated'}`);
        console.log('');

        // Watch for AllocateToOB events on HyperEVM
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

        // Start Hedging Loop
        this.startHedging();
    }

    private startHedging() {
        console.log('🛡️  Starting Delta Hedging Service (Interval: 10s)');
        this.hedgingInterval = setInterval(() => this.runHedgingLogic(), 10000);
    }

    private async runHedgingLogic() {
        try {
            const userState = await this.hl.getUserState(this.account.address);
            if (!userState || !userState.assetPositions) return;

            // Simple naive calculation: Sum all linear position sizes (assuming ETH mainly)
            // In reality, you'd weight by beta or delta.
            let netDelta = 0;
            for (const pos of userState.assetPositions) {
                const size = parseFloat(pos.position.szi);
                if (pos.coin === 'ETH') {
                    netDelta += size;
                }
            }

            console.log(`   [HEDGE] Current Net Delta: ${netDelta.toFixed(4)} ETH`);

            if (Math.abs(netDelta) > this.HEDGE_THRESHOLD_ETH) {
                console.log(`   ⚠️ DELTA MISALIGNMENT DETECTED! Threshold: ${this.HEDGE_THRESHOLD_ETH}`);
                const side = netDelta > 0 ? 'sell' : 'buy';
                const size = Math.abs(netDelta);

                console.log(`   🛡️  EXECUTING HEDGE: ${side.toUpperCase()} ${size.toFixed(4)} ETH`);

                // Close the gap
                await this.placeOrder({
                    asset: 'ETH',
                    side: side,
                    price: 0, // Market order (simulated by using aggressive limit or market flag)
                    size: size
                }, true); // IsHedge = true
            }

        } catch (e) {
            console.error('Error in hedging logic:', e);
        }
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

    private async placeOrder(params: OrderParams, isHedge = false): Promise<void> {
        console.log(`📤 Placing ${isHedge ? '[HEDGE] ' : ''}${params.side.toUpperCase()} order: ${params.size.toFixed(4)} ${params.asset} @ ${params.price ? '$' + params.price.toFixed(2) : 'MARKET'}`);

        try {
            // Using the actual HL client now
            // const mid = await this.hl.getMidPrice(params.asset);
            const oid = await this.hl.placeOrder({
                asset: params.asset,
                isBuy: params.side === 'buy',
                size: params.size,
                price: params.price || (params.side === 'buy' ? 100000 : 0.01), // Market mimicking
                orderType: 'limit', // HL API usually requires limit with TIF
                reduceOnly: false
            });
            console.log(`   ✅ Order Submitted. OID: ${oid}`);
        } catch (e) {
            console.error(`   ❌ Order Failed:`, e);
            // Fallback for demo if API fails (e.g. no funds)
            console.log(`   [MOCK-FALLBACK] Order "Filled" locally.`);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.hedgingInterval) clearInterval(this.hedgingInterval);
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
