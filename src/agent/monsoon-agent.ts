import { getSaltClient } from '@/salt/client';
import { ACTIVE_CHAIN } from '@/salt/chains';
import type {
    ActionIntent,
    MonsoonAgentConfig,
    ExecutionResult,
    PreCheckResult,
} from './types';

/**
 * MonsoonAgent - Policy-controlled trading agent
 * 
 * Parses natural language → ActionIntent → Salt execution
 */
export class MonsoonAgent {
    private salt = getSaltClient();
    private config: MonsoonAgentConfig;
    private lastActionTime = 0;

    constructor(config: MonsoonAgentConfig) {
        this.config = config;
    }

    /**
     * Parse natural language into ActionIntent
     * 
     * Examples:
     * - "buy $100 of GOLD" → { type: 'SPOT_BUY', market: 'GOLD', amount: 100 }
     * - "sell 50 OIL" → { type: 'SPOT_SELL', market: 'OIL', amount: 50 }
     */
    parseIntent(input: string): ActionIntent | null {
        const lower = input.toLowerCase().trim();

        // Match: "buy $100 of GOLD" or "buy 100 GOLD"
        const buyMatch = lower.match(/buy\s+\$?(\d+(?:\.\d+)?)\s+(?:of\s+)?(\w+)/);
        if (buyMatch) {
            return {
                type: 'SPOT_BUY',
                amount: parseFloat(buyMatch[1]),
                market: buyMatch[2].toUpperCase(),
            };
        }

        // Match: "sell $50 GOLD" or "sell 50 GOLD"
        const sellMatch = lower.match(/sell\s+\$?(\d+(?:\.\d+)?)\s+(?:of\s+)?(\w+)/);
        if (sellMatch) {
            return {
                type: 'SPOT_SELL',
                amount: parseFloat(sellMatch[1]),
                market: sellMatch[2].toUpperCase(),
            };
        }

        // Match: "send 10 USDC to 0x..."
        const transferMatch = lower.match(/(?:send|transfer)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(0x[a-f0-9]{40})/i);
        if (transferMatch) {
            return {
                type: 'TRANSFER',
                amount: parseFloat(transferMatch[1]),
                token: transferMatch[2].toUpperCase(),
                to: transferMatch[3],
            };
        }

        return null;
    }

    /**
     * Local pre-check (mirrors Salt policy for fast feedback)
     * 
     * This runs BEFORE Salt to give instant feedback, but Salt is the real enforcer
     */
    preCheck(intent: ActionIntent): PreCheckResult {
        // Check market allowlist
        if (intent.type === 'SPOT_BUY' || intent.type === 'SPOT_SELL') {
            if (!this.config.guardrails.allowedMarkets.includes(intent.market)) {
                return {
                    valid: false,
                    reason: `Market ${intent.market} not in allowlist. Allowed: ${this.config.guardrails.allowedMarkets.join(', ')}`
                };
            }

            if (intent.amount > this.config.guardrails.maxPerTx) {
                return {
                    valid: false,
                    reason: `Amount $${intent.amount} exceeds max $${this.config.guardrails.maxPerTx} per transaction`
                };
            }
        }

        // Check cooldown
        const elapsed = Date.now() - this.lastActionTime;
        const cooldownMs = this.config.guardrails.cooldownSeconds * 1000;

        if (this.lastActionTime > 0 && elapsed < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
            return {
                valid: false,
                reason: `Cooldown active: ${remaining}s remaining`
            };
        }

        return { valid: true };
    }

    /**
     * Execute via Salt (the real enforcement happens here)
     */
    async execute(intent: ActionIntent): Promise<ExecutionResult> {
        // Ensure authenticated
        if (!this.salt.getIsAuthenticated()) {
            await this.salt.authenticate();
        }

        // Pre-check locally (fast feedback)
        const preCheck = this.preCheck(intent);
        if (!preCheck.valid) {
            return {
                success: false,
                stage: 'pre_check',
                error: preCheck.reason,
                intent,
            };
        }

        // Convert intent to Salt tx params
        const txParams = this.intentToTxParams(intent);

        try {
            const result = await this.salt.submitTx({
                accountId: this.config.accountId,
                chainId: ACTIVE_CHAIN.chainId,
                ...txParams,
            });

            // Check for policy denial from Salt
            if (result.policyBreach?.denied) {
                return {
                    success: false,
                    stage: 'salt_policy',
                    policyBreach: result.policyBreach,
                    intent,
                };
            }

            // Success - update cooldown
            this.lastActionTime = Date.now();

            return {
                success: true,
                stage: 'confirmed',
                txHash: result.txHash,
                intent,
            };
        } catch (error: any) {
            // Handle Salt SDK policy denial errors
            if (error.rejectedPolicies || error.type === 'PolicyDenied') {
                return {
                    success: false,
                    stage: 'salt_policy',
                    policyBreach: {
                        denied: true,
                        rejectedPolicies: error.rejectedPolicies,
                        reason: error.reason || error.message,
                        details: error.details,
                    },
                    intent,
                };
            }

            // Other errors
            return {
                success: false,
                stage: 'broadcast',
                error: error.message || 'Transaction failed',
                intent,
            };
        }
    }

    /**
     * Convert ActionIntent to Salt tx params
     */
    private intentToTxParams(intent: ActionIntent): { to: string; data: string; value?: string } {
        switch (intent.type) {
            case 'SPOT_BUY':
                return this.buildSpotBuyTx(intent.market, intent.amount);
            case 'SPOT_SELL':
                return this.buildSpotSellTx(intent.market, intent.amount);
            case 'TRANSFER':
                // For transfers, we'd use salt.transfer() instead
                // But for demo, encode as a simple ETH transfer
                return {
                    to: intent.to,
                    data: '0x',
                    value: intent.amount.toString(),
                };
            default:
                throw new Error('Unknown intent type');
        }
    }

    /**
     * Build spot buy transaction calldata
     * 
     * For hackathon: Using simulated router address
     * In production: Would encode actual Hyperliquid spot order
     */
    private buildSpotBuyTx(market: string, amount: number): { to: string; data: string } {
        // Simulated Hyperliquid router on HyperEVM
        const HYPERLIQUID_ROUTER = '0x1111111111111111111111111111111111111111';

        // Simulated calldata: swap(USDH → market token, amount)
        // In production: Would use ethers.utils.defaultAbiCoder.encode(...)
        const data = `0xdeadbeef${market.toLowerCase()}${amount.toString(16).padStart(8, '0')}`;

        return { to: HYPERLIQUID_ROUTER, data };
    }

    /**
     * Build spot sell transaction calldata
     */
    private buildSpotSellTx(market: string, amount: number): { to: string; data: string } {
        const HYPERLIQUID_ROUTER = '0x1111111111111111111111111111111111111111';

        // Simulated calldata: swap(market token → USDH, amount)
        const data = `0xcafebabe${market.toLowerCase()}${amount.toString(16).padStart(8, '0')}`;

        return { to: HYPERLIQUID_ROUTER, data };
    }

    /**
     * Get current agent configuration
     */
    getConfig(): MonsoonAgentConfig {
        return this.config;
    }

    /**
     * Update guardrails (for UI configuration)
     */
    updateGuardrails(guardrails: Partial<MonsoonAgentConfig['guardrails']>): void {
        this.config.guardrails = {
            ...this.config.guardrails,
            ...guardrails,
        };
    }
}
