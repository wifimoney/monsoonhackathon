import { Account } from 'viem';

// ============ TYPES ============

interface OrderParams {
    asset: string;
    isBuy: boolean;
    size: number;
    price: number;
    orderType: 'limit' | 'market';
    reduceOnly: boolean;
}

interface OrderResponse {
    status: string;
    response: {
        data: {
            statuses: Array<{
                resting?: { oid: number };
                filled?: { totalSz: string; avgPx: string; oid: number };
                error?: string;
            }>;
        };
    };
}

// ============ HYPERLIQUID CLIENT ============

export class Hyperliquid {
    private account: Account;
    private baseUrl: string;

    constructor(account: Account, useTestnet = true) {
        this.account = account;
        this.baseUrl = useTestnet
            ? 'https://api.hyperliquid-testnet.xyz'
            : 'https://api.hyperliquid.xyz';
    }

    // ============ INFO API ============

    async getMidPrice(asset: string): Promise<number> {
        const response = await fetch(`${this.baseUrl}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'allMids',
            }),
        });

        const data = await response.json();
        return parseFloat(data[asset] || '0');
    }

    async getOrderBook(asset: string): Promise<{
        bids: Array<{ price: string; size: string }>;
        asks: Array<{ price: string; size: string }>;
    }> {
        const response = await fetch(`${this.baseUrl}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'l2Book',
                coin: asset,
            }),
        });

        const data = await response.json();
        return {
            bids: data.levels[0] || [],
            asks: data.levels[1] || [],
        };
    }

    async getUserState(user: string): Promise<any> {
        const response = await fetch(`${this.baseUrl}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'clearinghouseState',
                user: user,
            }),
        });

        const data = await response.json();
        return data;
    }

    // ============ EXCHANGE API ============

    async placeOrder(params: OrderParams): Promise<string> {
        const timestamp = Date.now();

        // Build order action
        const action = {
            type: 'order',
            orders: [{
                a: this.getAssetIndex(params.asset), // Asset index
                b: params.isBuy,
                p: params.price.toFixed(5),
                s: params.size.toFixed(4),
                r: params.reduceOnly,
                t: {
                    limit: {
                        tif: 'Gtc', // Good til cancelled
                    },
                },
            }],
            grouping: 'na',
        };

        // Sign and send
        const signature = await this.signAction(action, timestamp);

        const response = await fetch(`${this.baseUrl}/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                nonce: timestamp,
                signature,
            }),
        });

        const result: OrderResponse = await response.json();

        if (result.response?.data?.statuses?.[0]?.error) {
            throw new Error(result.response.data.statuses[0].error);
        }

        const status = result.response?.data?.statuses?.[0];
        const orderId = status?.resting?.oid || status?.filled?.oid;

        return orderId?.toString() || 'unknown';
    }

    async cancelOrder(asset: string, orderId: number): Promise<void> {
        const timestamp = Date.now();

        const action = {
            type: 'cancel',
            cancels: [{
                a: this.getAssetIndex(asset),
                o: orderId,
            }],
        };

        const signature = await this.signAction(action, timestamp);

        await fetch(`${this.baseUrl}/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                nonce: timestamp,
                signature,
            }),
        });
    }

    async cancelAllOrders(asset: string): Promise<void> {
        const timestamp = Date.now();

        const action = {
            type: 'cancelByCloid',
            cancels: [{
                asset: this.getAssetIndex(asset),
            }],
        };

        const signature = await this.signAction(action, timestamp);

        await fetch(`${this.baseUrl}/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                nonce: timestamp,
                signature,
            }),
        });
    }

    // ============ HELPERS ============

    private getAssetIndex(asset: string): number {
        // Map asset symbols to indices
        // Check Hyperliquid docs for current mappings
        const assetMap: Record<string, number> = {
            'BTC': 0,
            'ETH': 1,
            'HYPE': 2, // Verify this
            // Add more as needed
        };
        return assetMap[asset] ?? 0;
    }

    private async signAction(action: any, timestamp: number): Promise<string> {
        // Create EIP-712 signature for Hyperliquid
        // This is simplified - check Hyperliquid docs for exact format
        const message = JSON.stringify({ action, nonce: timestamp });

        if (!this.account || !('signMessage' in this.account) || typeof this.account.signMessage !== 'function') {
            throw new Error('Account does not support message signing');
        }

        const signature = await this.account.signMessage({ message });
        return signature;
    }
}
