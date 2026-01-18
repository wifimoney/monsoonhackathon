// Off-Chain Executor for Monsoon
// Listens for AllocateToOB events and places orders on HyperLiquid

import { createPublicClient, http, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Hyperliquid } from './hyperliquid';

// Import from single source of truth
import deployedAddresses from '../../contracts/addresses.hyperevm-testnet.json';

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
    private hyperliquid: Hyperliquid | null = null;
    private isRunning = false;
    private auditEndpoint: string;

    constructor(auditEndpoint = 'http://localhost:3000/api/audit') {
        // Create HyperEVM client (where MonsoonALM is deployed)
        this.client = createPublicClient({
            transport: http(RPC_URL),
        });
        this.auditEndpoint = auditEndpoint;

        // Initialize Hyperliquid client with executor private key
        const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
        if (privateKey) {
            const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
            this.hyperliquid = new Hyperliquid(account);
            console.log(`   Executor Address: ${account.address}`);
        } else {
            console.warn('⚠️ EXECUTOR_PRIVATE_KEY not set - orders will be simulated');
        }
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🎯 OB Executor starting...');
        console.log(`   Chain ID: ${CHAIN_ID}`);
        console.log(`   RPC: ${RPC_URL}`);
        console.log(`   ALM: ${MONSOON_ALM}`);
        console.log(`   HyperLiquid: ${this.hyperliquid ? 'Connected' : 'Simulated'}`);
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
    }

    private async handleAllocation(log: unknown) {
        console.log('');
        console.log('📥 AllocateToOB event received!');
        console.log('   Log:', JSON.stringify(log, null, 2));

        try {
            // Get mid price from HyperLiquid
            const midPrice = await this.fetchMidPrice();
            console.log(`   Mid price: $${midPrice}`);

            // Calculate order parameters
            const spreadBps = 30; // 0.3% spread
            const bidPrice = midPrice * (1 - spreadBps / 10000);
            const askPrice = midPrice * (1 + spreadBps / 10000);
            const orderSize = 1; // Fixed size for demo

            console.log(`   Bid: $${bidPrice.toFixed(2)}`);
            console.log(`   Ask: $${askPrice.toFixed(2)}`);

            // Place bid order
            const bidResult = await this.placeOrder({
                asset: 'HYPE',
                side: 'buy',
                price: bidPrice,
                size: orderSize
            });
            console.log(`   Bid Order ID: ${bidResult}`);

            // Place ask order
            const askResult = await this.placeOrder({
                asset: 'HYPE',
                side: 'sell',
                price: askPrice,
                size: orderSize
            });
            console.log(`   Ask Order ID: ${askResult}`);

            console.log('✅ Orders placed successfully');

        } catch (error) {
            console.error('❌ Error handling allocation:', error);
            await this.recordAudit({
                actionType: 'order',
                actionCategory: 'execution',
                status: 'failed',
                account: { id: 'EXECUTOR', name: 'OB Executor', address: MONSOON_ALM },
                result: { passed: false, denials: [] },
                payload: { error: String(error), description: 'AllocateToOB handler failed' },
                source: 'automation'
            });
        }
    }

    private async fetchMidPrice(): Promise<number> {
        if (this.hyperliquid) {
            try {
                return await this.hyperliquid.getMidPrice('HYPE');
            } catch (error) {
                console.warn('Failed to fetch mid price from HyperLiquid, using fallback');
            }
        }
        // Fallback mock price
        return 24.50;
    }

    private async placeOrder(params: OrderParams): Promise<string> {
        const notionalUsd = params.price * params.size;
        console.log(`📤 Placing ${params.side.toUpperCase()} order: ${params.size} ${params.asset} @ $${params.price.toFixed(2)}`);

        let orderId = `SIM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        let success = true;

        if (this.hyperliquid) {
            try {
                orderId = await this.hyperliquid.placeOrder({
                    asset: params.asset,
                    isBuy: params.side === 'buy',
                    size: params.size,
                    price: params.price,
                    orderType: 'limit',
                    reduceOnly: false
                });
            } catch (error) {
                console.error(`   Order failed: ${error}`);
                success = false;
            }
        }

        // Record audit
        await this.recordAudit({
            actionType: 'order',
            actionCategory: 'execution',
            status: success ? 'pending' : 'failed',
            account: { id: 'EXECUTOR', name: 'OB Executor', address: MONSOON_ALM },
            result: { passed: success, denials: [] },
            payload: {
                market: params.asset,
                side: params.side,
                price: params.price,
                amount: notionalUsd,
                description: `Automated ${params.side} order from AllocateToOB`
            },
            orderId,
            source: 'automation'
        });

        return orderId;
    }

    private async recordAudit(payload: AuditPayload): Promise<void> {
        try {
            await fetch(this.auditEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.warn('Failed to record audit:', error);
        }
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
