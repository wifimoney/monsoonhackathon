import type { PendingAction, ActionType, ActionDetails, ProposeActionRequest, ApprovalStatus } from './types';
import { ACTION_INFO } from './types';
import { checkAllGuardians } from '@/guardians/risk-engine';
import type { ActionIntent } from '@/agent/types';

// ============ IN-MEMORY STORE ============

const pendingActions: Map<string, PendingAction> = new Map();
const ACTION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ============ HELPERS ============

function generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTitle(type: ActionType, details: ActionDetails): string {
    const info = ACTION_INFO[type];
    switch (type) {
        case 'auto_hedge':
            return `${info.name}: $${details.hedgeSize || 50} hedge`;
        case 'deploy_liquidity':
            return `${info.name}: $${details.lpAmount || 100} to ${details.venue || 'OB'}`;
        case 'rebalance_vault':
            return `${info.name}`;
        case 'basket_trade':
            return `${info.name}: ${details.basket?.length || 0} assets`;
        case 'transfer':
            return `${info.name}: $${details.amount} ${details.token || 'ETH'}`;
        case 'spot_trade':
            return `${info.name}: $${details.amount} ${details.market || 'GOLD'}`;
        default:
            return info.name;
    }
}

function createDescription(type: ActionType, details: ActionDetails): string {
    switch (type) {
        case 'auto_hedge':
            return `Hedge delta exposure by $${details.hedgeSize || 50} when delta exceeds $${details.deltaThreshold || 50}`;
        case 'deploy_liquidity':
            return `Deploy $${details.lpAmount || 100} liquidity to ${details.venue || 'orderbook'}`;
        case 'rebalance_vault':
            return `Rebalance vault to target allocation`;
        case 'basket_trade':
            const symbols = details.basket?.map(b => b.symbol).join(', ') || 'multiple assets';
            return `Execute basket trade: ${symbols}`;
        case 'transfer':
            return `Transfer $${details.amount} ${details.token || 'ETH'} to ${details.recipient?.slice(0, 10)}...`;
        case 'spot_trade':
            return `Trade $${details.amount} ${details.market || 'GOLD'}`;
        default:
            return 'Pending action';
    }
}

function buildIntentFromDetails(type: ActionType, details: ActionDetails): ActionIntent {
    return {
        type: 'SPOT_MARKET_ORDER',
        market: details.market || 'ETH/USD',
        side: 'BUY',
        notionalUsd: details.amount || 100,
        maxSlippageBps: 50,
        validForSeconds: 60,
        rationale: [`${type} action`],
        riskNotes: [],
    };
}

// ============ CORE FUNCTIONS ============

export function proposeAction(request: ProposeActionRequest): PendingAction {
    const id = generateId();
    const now = Date.now();

    // Run policy check
    const intent = buildIntentFromDetails(request.type, request.details);
    const policyResult = checkAllGuardians(intent);

    const action: PendingAction = {
        id,
        type: request.type,
        title: createTitle(request.type, request.details),
        description: createDescription(request.type, request.details),
        details: request.details,
        proposedAt: now,
        expiresAt: now + ACTION_EXPIRY_MS,
        status: 'pending',
        policyCheck: {
            passed: policyResult.passed,
            denials: policyResult.denials.map(d => ({
                guardian: d.guardian,
                reason: d.reason,
            })),
        },
        proposedBy: request.proposedBy || 'user',
    };

    pendingActions.set(id, action);
    return action;
}

export function approveAction(id: string): PendingAction | null {
    const action = pendingActions.get(id);
    if (!action) return null;

    if (action.status !== 'pending') {
        return action; // Already processed
    }

    // Check if policy still passes
    if (!action.policyCheck.passed) {
        action.status = 'rejected';
        return action;
    }

    action.status = 'approved';
    // In real implementation, this would trigger Salt execute
    // For demo, we'll mark as executed immediately
    action.status = 'executed';
    action.executedTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    return action;
}

export function rejectAction(id: string): PendingAction | null {
    const action = pendingActions.get(id);
    if (!action) return null;

    action.status = 'rejected';
    return action;
}

export function getAction(id: string): PendingAction | null {
    return pendingActions.get(id) || null;
}

export function getPendingActions(): PendingAction[] {
    const now = Date.now();
    const actions: PendingAction[] = [];

    for (const [id, action] of pendingActions) {
        // Mark expired actions
        if (action.status === 'pending' && now > action.expiresAt) {
            action.status = 'expired';
        }
        actions.push(action);
    }

    // Sort by proposedAt (newest first)
    return actions.sort((a, b) => b.proposedAt - a.proposedAt);
}

export function getPendingCount(): number {
    return [...pendingActions.values()].filter(a => a.status === 'pending').length;
}

export function clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, action] of pendingActions) {
        if (action.status === 'expired' || (action.status !== 'pending' && now - action.proposedAt > 60 * 60 * 1000)) {
            pendingActions.delete(id);
            cleared++;
        }
    }

    return cleared;
}

// ============ DEMO HELPERS ============

export function proposeDemoActions(): PendingAction[] {
    const demos: ProposeActionRequest[] = [
        {
            type: 'auto_hedge',
            details: { deltaThreshold: 50, hedgeSize: 75, market: 'ETH-PERP' },
            proposedBy: 'agent',
        },
        {
            type: 'deploy_liquidity',
            details: { lpAmount: 200, venue: 'Hyperliquid OB', token: 'USDC' },
            proposedBy: 'agent',
        },
        {
            type: 'rebalance_vault',
            details: { targetAllocation: { ETH: 40, BTC: 30, GOLD: 30 } },
            proposedBy: 'agent',
        },
    ];

    return demos.map(d => proposeAction(d));
}
