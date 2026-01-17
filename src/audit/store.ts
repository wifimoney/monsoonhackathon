import type { AuditRecord, AuditFilter, CreateAuditInput, AuditStats, AuditStatus } from './types';
import { getDatabase } from './db';

// ============ CORE CRUD ============

/**
 * Record a new audit entry
 */
export function recordAudit(input: CreateAuditInput): AuditRecord {
    const db = getDatabase();

    const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = Date.now();

    const record: AuditRecord = {
        id,
        timestamp,
        actionType: input.actionType,
        actionCategory: input.actionCategory,
        account: input.account,
        payload: input.payload || {},
        status: input.status,
        result: {
            passed: input.result?.passed ?? true,
            denials: input.result?.denials || [],
        },
        txHash: input.txHash,
        orderId: input.orderId,
        fillPrice: input.fillPrice,
        fillAmount: input.fillAmount,
        gasUsed: input.gasUsed,
        gasCost: input.gasCost,
        source: input.source,
    };

    const stmt = db.prepare(`
        INSERT INTO audit_records (
            id, timestamp, action_type, action_category,
            account_id, account_name, account_address,
            payload, status, passed, denials,
            tx_hash, order_id, fill_price, fill_amount,
            gas_used, gas_cost, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        record.id,
        record.timestamp,
        record.actionType,
        record.actionCategory,
        record.account.id,
        record.account.name,
        record.account.address,
        JSON.stringify(record.payload),
        record.status,
        record.result.passed ? 1 : 0,
        JSON.stringify(record.result.denials || []),
        record.txHash || null,
        record.orderId || null,
        record.fillPrice || null,
        record.fillAmount || null,
        record.gasUsed || null,
        record.gasCost || null,
        record.source
    );

    return record;
}

/**
 * Get filtered audit records
 */
export function getAuditRecords(filter: AuditFilter = {}): { records: AuditRecord[]; total: number; hasMore: boolean } {
    const db = getDatabase();

    const limit = filter.limit || 20;
    const offset = filter.offset || 0;

    let whereClause = '1=1';
    const params: any[] = [];

    if (filter.status?.length) {
        whereClause += ` AND status IN (${filter.status.map(() => '?').join(',')})`;
        params.push(...filter.status);
    }

    if (filter.actionType?.length) {
        whereClause += ` AND action_type IN (${filter.actionType.map(() => '?').join(',')})`;
        params.push(...filter.actionType);
    }

    if (filter.actionCategory?.length) {
        whereClause += ` AND action_category IN (${filter.actionCategory.map(() => '?').join(',')})`;
        params.push(...filter.actionCategory);
    }

    if (filter.source?.length) {
        whereClause += ` AND source IN (${filter.source.map(() => '?').join(',')})`;
        params.push(...filter.source);
    }

    if (filter.accountId) {
        whereClause += ' AND account_id = ?';
        params.push(filter.accountId);
    }

    if (filter.fromTimestamp) {
        whereClause += ' AND timestamp >= ?';
        params.push(filter.fromTimestamp);
    }

    if (filter.toTimestamp) {
        whereClause += ' AND timestamp <= ?';
        params.push(filter.toTimestamp);
    }

    if (filter.search) {
        whereClause += ' AND (action_type LIKE ? OR account_name LIKE ? OR tx_hash LIKE ?)';
        const searchPattern = `%${filter.search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_records WHERE ${whereClause}`);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Get records
    const stmt = db.prepare(`
        SELECT * FROM audit_records 
        WHERE ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as any[];

    const records: AuditRecord[] = rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        actionType: row.action_type,
        actionCategory: row.action_category,
        account: {
            id: row.account_id,
            name: row.account_name || 'Unknown',
            address: row.account_address,
        },
        payload: JSON.parse(row.payload || '{}'),
        status: row.status as AuditStatus,
        result: {
            passed: row.passed === 1,
            denials: JSON.parse(row.denials || '[]'),
        },
        txHash: row.tx_hash,
        orderId: row.order_id,
        fillPrice: row.fill_price,
        fillAmount: row.fill_amount,
        gasUsed: row.gas_used,
        gasCost: row.gas_cost,
        source: row.source,
    }));

    return {
        records,
        total,
        hasMore: offset + records.length < total,
    };
}

/**
 * Get single audit record by ID
 */
export function getAuditRecord(id: string): AuditRecord | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM audit_records WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
        id: row.id,
        timestamp: row.timestamp,
        actionType: row.action_type,
        actionCategory: row.action_category,
        account: {
            id: row.account_id,
            name: row.account_name || 'Unknown',
            address: row.account_address,
        },
        payload: JSON.parse(row.payload || '{}'),
        status: row.status as AuditStatus,
        result: {
            passed: row.passed === 1,
            denials: JSON.parse(row.denials || '[]'),
        },
        txHash: row.tx_hash,
        orderId: row.order_id,
        fillPrice: row.fill_price,
        fillAmount: row.fill_amount,
        gasUsed: row.gas_used,
        gasCost: row.gas_cost,
        source: row.source,
    };
}

/**
 * Get audit statistics
 */
export function getAuditStats(): AuditStats {
    const db = getDatabase();

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM audit_records').get() as { count: number };
    const last24hRow = db.prepare('SELECT COUNT(*) as count FROM audit_records WHERE timestamp >= ?').get(oneDayAgo) as { count: number };
    const last7dRow = db.prepare('SELECT COUNT(*) as count FROM audit_records WHERE timestamp >= ?').get(sevenDaysAgo) as { count: number };
    const passedRow = db.prepare('SELECT COUNT(*) as count FROM audit_records WHERE passed = 1').get() as { count: number };

    const byStatusRows = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM audit_records 
        GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    const byActionTypeRows = db.prepare(`
        SELECT action_type, COUNT(*) as count 
        FROM audit_records 
        GROUP BY action_type
        ORDER BY count DESC
        LIMIT 10
    `).all() as Array<{ action_type: string; count: number }>;

    const volumeRow = db.prepare(`
        SELECT SUM(fill_amount) as volume 
        FROM audit_records 
        WHERE fill_amount IS NOT NULL
    `).get() as { volume: number | null };

    const denialRows = db.prepare(`
        SELECT denials FROM audit_records WHERE passed = 0 AND denials IS NOT NULL
    `).all() as Array<{ denials: string }>;

    // Parse denial breakdown
    const denialCounts: Record<string, { count: number; reasons: Record<string, number> }> = {};
    for (const row of denialRows) {
        try {
            const denials = JSON.parse(row.denials);
            for (const d of denials) {
                if (!denialCounts[d.guardian]) {
                    denialCounts[d.guardian] = { count: 0, reasons: {} };
                }
                denialCounts[d.guardian].count++;
                denialCounts[d.guardian].reasons[d.reason] = (denialCounts[d.guardian].reasons[d.reason] || 0) + 1;
            }
        } catch { }
    }

    const denialBreakdown = Object.entries(denialCounts).map(([guardian, data]) => ({
        guardian,
        count: data.count,
        topReason: Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
    }));

    // Build byStatus with defaults
    const byStatus: Record<AuditStatus, number> = {
        approved: 0,
        denied: 0,
        pending: 0,
        filled: 0,
        partial: 0,
        failed: 0,
    };
    for (const row of byStatusRows) {
        if (row.status in byStatus) {
            byStatus[row.status as AuditStatus] = row.count;
        }
    }

    return {
        total: totalRow.count,
        last24h: last24hRow.count,
        last7d: last7dRow.count,
        byStatus,
        byActionType: Object.fromEntries(byActionTypeRows.map(r => [r.action_type, r.count])),
        successRate: totalRow.count > 0 ? (passedRow.count / totalRow.count) * 100 : 0,
        totalVolume: volumeRow.volume || 0,
        denialBreakdown,
    };
}

/**
 * Export audit records as CSV
 */
export function exportAuditCsv(filter: AuditFilter = {}): string {
    const { records } = getAuditRecords({ ...filter, limit: 10000 });

    const headers = [
        'ID', 'Timestamp', 'Action Type', 'Category', 'Account',
        'Status', 'Passed', 'TX Hash', 'Fill Price', 'Fill Amount', 'Source'
    ];

    const rows = records.map(r => [
        r.id,
        new Date(r.timestamp).toISOString(),
        r.actionType,
        r.actionCategory,
        r.account.name,
        r.status,
        r.result.passed ? 'Yes' : 'No',
        r.txHash || '',
        r.fillPrice?.toString() || '',
        r.fillAmount?.toString() || '',
        r.source
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
}
