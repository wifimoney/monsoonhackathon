import { createPublicClient, http, parseAbiItem, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Hyperliquid } from './hyperliquid';
import { auditLog } from '../audit/logger';
import { HYPEREVM, MONSOON_ALM_ABI } from '../lib/contracts';

// ============ CONFIG ============

const HYPEREVM_CHAIN = {
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    },
};

// ============ TYPES ============

interface AllocateToOBEvent {
    amount0: bigint;
    amount1: bigint;
    isBid: boolean;
    timestamp: bigint;
}

interface ExecutorConfig {
    privateKey: string;
    almAddress: string;
    asset: string;
    maxOrderSize: bigint;
    spreadBps: number;
}

// ============ MAIN EXECUTOR ============

export class OBExecutor {
    private client: ReturnType<typeof createPublicClient>;
    private hl: Hyperliquid;
    private config: ExecutorConfig;
    private isRunning: boolean = false;

    constructor(config: ExecutorConfig) {
        this.config = config;

        // Setup EVM client
        this.client = createPublicClient({
            chain: HYPEREVM_CHAIN,
            transport: http(),
        });

        // Setup Hyperliquid client
        const account = privateKeyToAccount(config.privateKey as `0x${string}`);
        this.hl = new Hyperliquid(account);
    }

    async start() {
        console.log('🎯 OB Executor starting...');
        console.log(`   ALM: ${this.config.almAddress}`);
        console.log(`   Asset: ${this.config.asset}`);

        this.isRunning = true;

        // Watch for AllocateToOB events
        const unwatch = this.client.watchContractEvent({
            address: this.config.almAddress as `0x${string}`,
            abi: [parseAbiItem(
                'event AllocateToOB(uint256 amount0, uint256 amount1, bool isBid, uint256 timestamp)'
            )],
            eventName: 'AllocateToOB',
            onLogs: async (logs) => {
                for (const log of logs) {
                    await this.handleAllocation(log.args as unknown as AllocateToOBEvent, log.transactionHash);
                }
            },
            onError: (error) => {
                console.error('❌ Event watch error:', error);
            },
        });

        console.log('✅ Executor running, listening for events...');

        // Return cleanup function
        return () => {
            this.isRunning = false;
            unwatch();
        };
    }

    private async handleAllocation(event: AllocateToOBEvent, txHash: string) {
        console.log(`\n📡 AllocateToOB event received`);
        console.log(`   isBid: ${event.isBid}`);
        console.log(`   amount0: ${formatEther(event.amount0)}`);
        console.log(`   amount1: ${formatEther(event.amount1)}`);
        console.log(`   txHash: ${txHash}`);

        try {
            // Get current mid price from HyperCore
            const midPrice = await this.hl.getMidPrice(this.config.asset);
            console.log(`   midPrice: $${midPrice}`);

            // Calculate order price with spread
            const spreadMultiplier = event.isBid
                ? (10000 - this.config.spreadBps) / 10000
                : (10000 + this.config.spreadBps) / 10000;

            const orderPrice = midPrice * spreadMultiplier;
            const orderSize = event.isBid ? event.amount1 : event.amount0;

            // Cap at max order size
            const cappedSize = orderSize > this.config.maxOrderSize
                ? this.config.maxOrderSize
                : orderSize;

            console.log(`   orderPrice: $${orderPrice.toFixed(2)}`);
            console.log(`   orderSize: ${formatEther(cappedSize)}`);

            // Place order
            const orderId = await this.hl.placeOrder({
                asset: this.config.asset,
                isBuy: event.isBid,
                size: Number(formatEther(cappedSize)),
                price: orderPrice,
                orderType: 'limit',
                reduceOnly: false,
            });

            console.log(`✅ Order placed: ${orderId}`);

            // Log to audit
            await auditLog({
                action: 'OB_ORDER_PLACED',
                orderId,
                asset: this.config.asset,
                isBid: event.isBid,
                size: formatEther(cappedSize),
                price: orderPrice.toString(),
                midPrice: midPrice.toString(),
                triggerTxHash: txHash,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            console.error('❌ Failed to place order:', error);

            await auditLog({
                action: 'OB_ORDER_FAILED',
                error: String(error),
                triggerTxHash: txHash,
                timestamp: new Date().toISOString(),
            });
        }
    }

    async cancelAllOrders() {
        console.log('🛑 Cancelling all orders...');
        await this.hl.cancelAllOrders(this.config.asset);
    }
}

// ============ ENTRY POINT ============

async function main() {
    const executor = new OBExecutor({
        privateKey: process.env.EXECUTOR_PRIVATE_KEY!,
        almAddress: HYPEREVM.MONSOON_ALM,
        asset: 'HYPE',
        maxOrderSize: BigInt(5000e18), // $5000 max per order
        spreadBps: 30, // 0.3% from mid
    });

    const cleanup = await executor.start();

    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        cleanup();
        await executor.cancelAllOrders();
        process.exit(0);
    });
}

// Only run if main script
if (require.main === module) {
    main().catch(console.error);
}
