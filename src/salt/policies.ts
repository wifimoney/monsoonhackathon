// Salt Policy Types and Validation

export interface DepositPolicy {
    maxAmountPerTx: bigint;       // Max single deposit
    maxDailyAmount: bigint;        // Max daily deposit volume
    allowedTokens: string[];       // Whitelist of token addresses
    requireGuardianApproval: boolean;
}

export interface RebalancePolicy {
    maxAllocationPercent: number;  // Max % of reserves to allocate to OB (e.g., 30)
    minTimeBetweenRebalances: number; // Seconds between rebalances
    requireGuardianApproval: boolean;
}

export interface OBOrderPolicy {
    maxSpreadBps: number;          // Max spread in basis points
    maxOrderSizePercent: number;   // Max order size as % of allocation
    allowedAssets: number[];       // HyperCore asset indices
}

export interface PolicyValidationResult {
    valid: boolean;
    reason?: string;
    policyId?: string;
}

export class PolicyValidator {
    private depositPolicy: DepositPolicy;
    private rebalancePolicy: RebalancePolicy;
    private obOrderPolicy: OBOrderPolicy;

    constructor(
        depositPolicy: DepositPolicy,
        rebalancePolicy: RebalancePolicy,
        obOrderPolicy: OBOrderPolicy
    ) {
        this.depositPolicy = depositPolicy;
        this.rebalancePolicy = rebalancePolicy;
        this.obOrderPolicy = obOrderPolicy;
    }

    validateDeposit(amount: bigint, token: string): PolicyValidationResult {
        // Check max amount
        if (amount > this.depositPolicy.maxAmountPerTx) {
            return {
                valid: false,
                reason: `Amount exceeds max per transaction (${this.depositPolicy.maxAmountPerTx})`,
                policyId: 'deposit.maxAmountPerTx',
            };
        }

        // Check allowed tokens
        if (!this.depositPolicy.allowedTokens.includes(token.toLowerCase())) {
            return {
                valid: false,
                reason: `Token ${token} not in allowed list`,
                policyId: 'deposit.allowedTokens',
            };
        }

        return { valid: true };
    }

    validateRebalance(
        allocationPercent: number,
        lastRebalanceTime: number
    ): PolicyValidationResult {
        // Check allocation percent
        if (allocationPercent > this.rebalancePolicy.maxAllocationPercent) {
            return {
                valid: false,
                reason: `Allocation ${allocationPercent}% exceeds max ${this.rebalancePolicy.maxAllocationPercent}%`,
                policyId: 'rebalance.maxAllocationPercent',
            };
        }

        // Check time since last rebalance
        const timeSince = Date.now() / 1000 - lastRebalanceTime;
        if (timeSince < this.rebalancePolicy.minTimeBetweenRebalances) {
            return {
                valid: false,
                reason: `Must wait ${this.rebalancePolicy.minTimeBetweenRebalances - timeSince}s before next rebalance`,
                policyId: 'rebalance.minTimeBetweenRebalances',
            };
        }

        return { valid: true };
    }

    validateOBOrder(
        spreadBps: number,
        orderSizePercent: number,
        assetIndex: number
    ): PolicyValidationResult {
        // Check spread
        if (spreadBps > this.obOrderPolicy.maxSpreadBps) {
            return {
                valid: false,
                reason: `Spread ${spreadBps}bps exceeds max ${this.obOrderPolicy.maxSpreadBps}bps`,
                policyId: 'obOrder.maxSpreadBps',
            };
        }

        // Check order size
        if (orderSizePercent > this.obOrderPolicy.maxOrderSizePercent) {
            return {
                valid: false,
                reason: `Order size ${orderSizePercent}% exceeds max ${this.obOrderPolicy.maxOrderSizePercent}%`,
                policyId: 'obOrder.maxOrderSizePercent',
            };
        }

        // Check asset allowed
        if (!this.obOrderPolicy.allowedAssets.includes(assetIndex)) {
            return {
                valid: false,
                reason: `Asset index ${assetIndex} not allowed`,
                policyId: 'obOrder.allowedAssets',
            };
        }

        return { valid: true };
    }
}

// Default policies for Monsoon
export const DEFAULT_DEPOSIT_POLICY: DepositPolicy = {
    maxAmountPerTx: BigInt(100000) * BigInt(10 ** 6), // 100k USDC
    maxDailyAmount: BigInt(1000000) * BigInt(10 ** 6), // 1M USDC daily
    allowedTokens: [
        '0xaa6a7b7faa7f28566fe5c3cfc628a1ee0583a0ba', // mUSDC
        '0xe4e118a0b252a631b19789d84f504b10167466e2', // mWETH
    ],
    requireGuardianApproval: false,
};

export const DEFAULT_REBALANCE_POLICY: RebalancePolicy = {
    maxAllocationPercent: 30,      // Max 30% to OB
    minTimeBetweenRebalances: 300, // 5 minutes
    requireGuardianApproval: true,
};

export const DEFAULT_OB_ORDER_POLICY: OBOrderPolicy = {
    maxSpreadBps: 50,              // 0.5% max spread
    maxOrderSizePercent: 20,       // 20% of allocation per order
    allowedAssets: [0],            // Only HYPE for now
};

// Create default validator
export const defaultValidator = new PolicyValidator(
    DEFAULT_DEPOSIT_POLICY,
    DEFAULT_REBALANCE_POLICY,
    DEFAULT_OB_ORDER_POLICY
);
