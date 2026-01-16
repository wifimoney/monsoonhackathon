import { BigNumber } from "ethers";

// ============================================
// Policy & Guardrails Types
// ============================================

export interface PolicyBreach {
    denied: boolean;
    reason: string;
    rule: string;
    details?: Record<string, unknown>;
}

export interface MonsoonGuardrails {
    enabled: boolean;
    allowedRecipients: string[];
    allowedMarkets: string[];    // e.g., ['GOLD', 'OIL']
    maxPerTx: number;            // e.g., 250 (USDH)
    maxLeverage?: number;        // e.g., 3
    cooldownSeconds?: number;    // e.g., 60
}

// ============================================
// Transfer & Transaction Types
// ============================================

export interface TransferParams {
    accountId: string;
    to: string;
    token: string;
    amount: string;
}

export interface SubmitTxParams {
    accountId: string;
    to: string;
    data: string;
    value?: string;
}

export interface TransferResult {
    success: boolean;
    txHash?: string;
    status: 'pending' | 'confirmed' | 'failed' | 'denied';
    policyBreach?: PolicyBreach;
    logs?: string[];
}

export interface TxResult {
    success: boolean;
    txHash?: string;
    status: 'pending' | 'confirmed' | 'failed' | 'denied';
    policyBreach?: PolicyBreach;
    logs?: string[];
}

// ============================================
// Account Types
// ============================================

export interface SaltAccount {
    id: string;
    name: string;
    address: string;
    orgId?: string;
}

export interface SaltOrganization {
    _id: string;
    name: string;
    members: Array<{
        name: string;
        address: string;
        role: string;
        accessLevel: number;
        status: string;
    }>;
}

// ============================================
// Agent Types (from original migration)
// ============================================

export interface Deposit {
    accountAddress: string;
    accountId: string;
    balance: BigNumber;
    depositAmount: BigNumber;
}

export interface Strategy {
    sweepFunction: (params: {
        accountAddress: string;
        accountId?: string;
        amount?: BigNumber;
    }) => Promise<void>;
}

export type AgentState = "watching" | "sweeping" | "sleeping";

// ============================================
// Config Types
// ============================================

export interface SaltConfig {
    privateKey: string;
    orchestrationRpcUrl: string;
    broadcastingRpcUrl: string;
    broadcastingNetworkId: number;
    agent?: string;
}
