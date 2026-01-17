import type { ActionIntent } from '@/agent/types';

export type AuditStatus = 'submitted' | 'confirmed' | 'denied' | 'failed';

export interface AuditEntry {
    id: string;
    timestamp: number;
    actionType: string;
    status: AuditStatus;
    market?: string;
    notionalUsd?: number;
    txHash?: string;
    reason?: string;
    policies?: string[];
    intent?: ActionIntent;
    metadata?: Record<string, unknown>;
}

const auditLog: AuditEntry[] = [];

export function recordAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const stored: AuditEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
    };
    auditLog.unshift(stored);
    if (auditLog.length > 200) {
        auditLog.pop();
    }
    return stored;
}

export function listAudit(limit = 50): AuditEntry[] {
    return auditLog.slice(0, limit);
}

export function latestAuditByType(actionType: string): AuditEntry | undefined {
    return auditLog.find((entry) => entry.actionType === actionType);
}
