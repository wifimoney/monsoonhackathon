// Audit Logger
// Logs all actions to a local SQLite database for transparency

interface AuditEntry {
    id: string;
    timestamp: string;
    action: string;
    details: Record<string, unknown>;
    actor: string;
    status: 'pending' | 'confirmed' | 'denied';
    txHash?: string;
}

// In-memory store (in production, use SQLite)
const auditLog: AuditEntry[] = [];

/**
 * Log an action to the audit trail
 */
export function logAction(
    action: string,
    details: Record<string, unknown>,
    actor: string,
    status: 'pending' | 'confirmed' | 'denied' = 'pending',
    txHash?: string
): string {
    const entry: AuditEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date().toISOString(),
        action,
        details,
        actor,
        status,
        txHash,
    };

    auditLog.push(entry);
    console.log('[Audit] Logged:', entry);

    return entry.id;
}

/**
 * Update an existing audit entry
 */
export function updateEntry(
    id: string,
    updates: Partial<Pick<AuditEntry, 'status' | 'txHash'>>
): boolean {
    const entry = auditLog.find((e) => e.id === id);
    if (!entry) return false;

    Object.assign(entry, updates);
    console.log('[Audit] Updated:', entry);
    return true;
}

/**
 * Get all audit entries
 */
export function getEntries(filter?: {
    action?: string;
    actor?: string;
    status?: string;
    limit?: number;
}): AuditEntry[] {
    let results = [...auditLog];

    if (filter?.action) {
        results = results.filter((e) => e.action === filter.action);
    }
    if (filter?.actor) {
        results = results.filter((e) => e.actor === filter.actor);
    }
    if (filter?.status) {
        results = results.filter((e) => e.status === filter.status);
    }

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
        results = results.slice(0, filter.limit);
    }

    return results;
}

/**
 * Get audit statistics
 */
export function getStats() {
    return {
        total: auditLog.length,
        pending: auditLog.filter((e) => e.status === 'pending').length,
        confirmed: auditLog.filter((e) => e.status === 'confirmed').length,
        denied: auditLog.filter((e) => e.status === 'denied').length,
    };
}

// Export types
export type { AuditEntry };
