// ============ APPROVAL TYPES ============

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';

export type ActionType =
    | 'auto_hedge'
    | 'deploy_liquidity'
    | 'rebalance_vault'
    | 'basket_trade'
    | 'transfer'
    | 'spot_trade';

export interface ActionDetails {
    // Common
    amount?: number;
    token?: string;
    market?: string;

    // Auto-hedge
    deltaThreshold?: number;
    hedgeSize?: number;

    // Deploy liquidity
    venue?: string;
    lpAmount?: number;

    // Rebalance
    targetAllocation?: Record<string, number>;

    // Basket trade
    basket?: Array<{ symbol: string; weight: number }>;

    // Transfer
    recipient?: string;
}

export interface PolicyCheckResult {
    passed: boolean;
    denials: Array<{
        guardian: string;
        reason: string;
    }>;
}

export interface PendingAction {
    id: string;
    type: ActionType;
    title: string;
    description: string;
    details: ActionDetails;
    proposedAt: number;
    expiresAt: number;
    status: ApprovalStatus;
    policyCheck: PolicyCheckResult;
    proposedBy: 'user' | 'agent';
    executedTxHash?: string;
}

// ============ ACTION METADATA ============

export const ACTION_INFO: Record<ActionType, {
    name: string;
    icon: string;
    description: string;
    requiresApproval: boolean;
}> = {
    auto_hedge: {
        name: 'Auto-Hedge Delta',
        icon: '⚖️',
        description: 'Automatically hedge delta exposure when it exceeds threshold',
        requiresApproval: true,
    },
    deploy_liquidity: {
        name: 'Deploy Liquidity',
        icon: '💧',
        description: 'Deploy liquidity to orderbook or AMM',
        requiresApproval: true,
    },
    rebalance_vault: {
        name: 'Rebalance Vault',
        icon: '🔄',
        description: 'Rebalance vault to target allocation',
        requiresApproval: true,
    },
    basket_trade: {
        name: 'Execute Basket Trade',
        icon: '📦',
        description: 'Execute a basket of trades atomically',
        requiresApproval: true,
    },
    transfer: {
        name: 'Transfer',
        icon: '↗️',
        description: 'Transfer funds to another address',
        requiresApproval: true,
    },
    spot_trade: {
        name: 'Spot Trade',
        icon: '💱',
        description: 'Execute a spot buy or sell',
        requiresApproval: false,
    },
};

// ============ REQUEST/RESPONSE TYPES ============

export interface ProposeActionRequest {
    type: ActionType;
    details: ActionDetails;
    proposedBy?: 'user' | 'agent';
}

export interface ApproveActionRequest {
    action: 'approve' | 'reject';
}
