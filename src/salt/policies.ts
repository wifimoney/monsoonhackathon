/**
 * Salt Policy Definitions for Monsoon
 * 
 * These policies are enforced by Robo Guardians before any transaction is broadcast.
 */

export interface MonsoonPolicy {
    deposit: DepositPolicy;
    rebalance: RebalancePolicy;
    obOrder: OBOrderPolicy;
}

export interface DepositPolicy {
    maxAmountPerTx: bigint;      // Max single deposit
    dailyLimit: bigint;           // Max daily deposits
    allowedTokens: string[];      // Whitelisted token addresses
    requiresConfirmation: boolean; // Require user confirmation
}

export interface RebalancePolicy {
    maxOBAllocationPct: number;   // Max % of reserves to OB (e.g., 30)
    minAMMReservePct: number;     // Min % to keep in AMM (e.g., 50)
    cooldownSeconds: number;      // Min time between rebalances
    maxDailyRebalances: number;   // Max rebalances per day
}

export interface OBOrderPolicy {
    maxOrderSize: bigint;         // Max single order
    maxSpreadBps: number;         // Max distance from mid
    allowedAssets: string[];      // Whitelisted assets
    maxOpenOrders: number;        // Max concurrent orders
}

// ============ DEFAULT POLICIES ============

export const DEFAULT_MONSOON_POLICY: MonsoonPolicy = {
    deposit: {
        maxAmountPerTx: BigInt(10_000e18),      // $10k max per deposit
        dailyLimit: BigInt(50_000e18),           // $50k daily limit
        allowedTokens: [],                       // Set at runtime
        requiresConfirmation: true,
    },
    rebalance: {
        maxOBAllocationPct: 30,                  // Max 30% to orderbook
        minAMMReservePct: 50,                    // Keep 50% in AMM
        cooldownSeconds: 3600,                   // 1 hour cooldown
        maxDailyRebalances: 10,                  // Max 10 rebalances/day
    },
    obOrder: {
        maxOrderSize: BigInt(5_000e18),          // $5k max per order
        maxSpreadBps: 100,                       // Max 1% from mid
        allowedAssets: ['HYPE'],                 // Only HYPE for now
        maxOpenOrders: 4,                        // Max 4 open orders
    },
};

// ============ POLICY VALIDATOR ============

export class PolicyValidator {
    private policy: MonsoonPolicy;
    private dailyDeposits: bigint = 0n;
    private dailyRebalances: number = 0;
    private lastRebalanceTime: number = 0;
    private lastResetDay: number = 0;

    constructor(policy: MonsoonPolicy = DEFAULT_MONSOON_POLICY) {
        this.policy = policy;
    }

    resetDailyCounters() {
        const today = Math.floor(Date.now() / 86400000);
        if (today !== this.lastResetDay) {
            this.dailyDeposits = 0n;
            this.dailyRebalances = 0;
            this.lastResetDay = today;
        }
    }

    validateDeposit(amount: bigint, tokenAddress: string): { valid: boolean; reason?: string } {
        this.resetDailyCounters();

        if (amount > this.policy.deposit.maxAmountPerTx) {
            return { valid: false, reason: `Amount exceeds max per tx (${this.policy.deposit.maxAmountPerTx})` };
        }

        if (this.dailyDeposits + amount > this.policy.deposit.dailyLimit) {
            return { valid: false, reason: `Would exceed daily limit` };
        }

        if (this.policy.deposit.allowedTokens.length > 0 &&
            !this.policy.deposit.allowedTokens.includes(tokenAddress.toLowerCase())) {
            return { valid: false, reason: `Token not whitelisted` };
        }

        return { valid: true };
    }

    validateRebalance(
        currentOBPct: number,
        proposedOBPct: number,
        currentAMMPct: number
    ): { valid: boolean; reason?: string } {
        this.resetDailyCounters();

        const now = Date.now() / 1000;
        if (now - this.lastRebalanceTime < this.policy.rebalance.cooldownSeconds) {
            const remaining = this.policy.rebalance.cooldownSeconds - (now - this.lastRebalanceTime);
            return { valid: false, reason: `Cooldown active (${Math.ceil(remaining)}s remaining)` };
        }

        if (this.dailyRebalances >= this.policy.rebalance.maxDailyRebalances) {
            return { valid: false, reason: `Daily rebalance limit reached` };
        }

        if (proposedOBPct > this.policy.rebalance.maxOBAllocationPct) {
            return { valid: false, reason: `OB allocation exceeds max (${this.policy.rebalance.maxOBAllocationPct}%)` };
        }

        const resultingAMMPct = 100 - proposedOBPct;
        if (resultingAMMPct < this.policy.rebalance.minAMMReservePct) {
            return { valid: false, reason: `AMM reserve would fall below min (${this.policy.rebalance.minAMMReservePct}%)` };
        }

        return { valid: true };
    }

    validateOBOrder(
        asset: string,
        size: bigint,
        spreadBps: number,
        currentOpenOrders: number
    ): { valid: boolean; reason?: string } {
        if (!this.policy.obOrder.allowedAssets.includes(asset)) {
            return { valid: false, reason: `Asset not allowed` };
        }

        if (size > this.policy.obOrder.maxOrderSize) {
            return { valid: false, reason: `Order size exceeds max` };
        }

        if (spreadBps > this.policy.obOrder.maxSpreadBps) {
            return { valid: false, reason: `Spread exceeds max (${this.policy.obOrder.maxSpreadBps} bps)` };
        }

        if (currentOpenOrders >= this.policy.obOrder.maxOpenOrders) {
            return { valid: false, reason: `Max open orders reached` };
        }

        return { valid: true };
    }

    recordDeposit(amount: bigint) {
        this.dailyDeposits += amount;
    }

    recordRebalance() {
        this.dailyRebalances++;
        this.lastRebalanceTime = Date.now() / 1000;
    }
}
