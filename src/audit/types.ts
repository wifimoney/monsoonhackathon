import type { GuardianDenial } from '@/guardians/types';

// ============ AUDIT RECORD ============
export interface AuditRecord {
    id: string;
    timestamp: number;

    // Action categorization
    actionType: 'trade' | 'transfer' | 'stake' | 'swap' | 'approval' | 'test' | 'order';
    actionCategory: 'execution' | 'order' | 'policy' | 'system';

    // Account context
    account: {
        id: string;
        name: string;
        address: string;
    };

    // Action details
    payload: {
        market?: string;
        side?: 'long' | 'short' | 'buy' | 'sell';
        amount?: number;
        price?: number;
        leverage?: number;
        to?: string;
        token?: string;
        strategy?: string;
        description?: string;
    };

    // Result
    status: AuditStatus;
    result: {
        passed: boolean;
        denials: GuardianDenial[];
    };

    // Receipts (when applicable)
    txHash?: string;
    orderId?: string;
    fillPrice?: number;
    fillAmount?: number;

    // Gas & costs
    gasUsed?: string;
    gasCost?: string;

    // Source
    source: 'user' | 'agent' | 'automation' | 'test';
}

export type AuditStatus = 'approved' | 'denied' | 'pending' | 'filled' | 'partial' | 'failed';

// ============ FILTERING ============
export interface AuditFilter {
    status?: AuditStatus[];
    actionType?: AuditRecord['actionType'][];
    actionCategory?: AuditRecord['actionCategory'][];
    source?: AuditRecord['source'][];
    accountId?: string;
    fromTimestamp?: number;
    toTimestamp?: number;
    search?: string; // Search in txHash, orderId, market
    limit?: number;
    offset?: number;
}

// ============ STATISTICS ============
export interface AuditStats {
    total: number;
    last24h: number;
    last7d: number;
    byStatus: Record<AuditStatus, number>;
    byActionType: Record<string, number>;
    successRate: number; // percentage
    totalVolume: number; // in USD equivalent
    denialBreakdown: {
        guardian: string;
        count: number;
        topReason: string;
    }[];
}

// ============ API RESPONSES ============
export interface AuditListResponse {
    success: boolean;
    records: AuditRecord[];
    total: number;
    hasMore: boolean;
    offset: number;
}

export interface AuditStatsResponse {
    success: boolean;
    stats: AuditStats;
}

// ============ HELPER TYPES ============
export type CreateAuditInput = Omit<AuditRecord, 'id' | 'timestamp'>;

export const AUDIT_STATUS_COLORS: Record<AuditStatus, string> = {
    approved: 'green',
    denied: 'red',
    pending: 'yellow',
    filled: 'green',
    partial: 'blue',
    failed: 'orange',
};

export const AUDIT_STATUS_ICONS: Record<AuditStatus, string> = {
    approved: '✅',
    denied: '🚫',
    pending: '⏳',
    filled: '✅',
    partial: '📊',
    failed: '❌',
};
