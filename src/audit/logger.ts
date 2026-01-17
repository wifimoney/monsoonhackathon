/**
 * Audit Logger
 * 
 * Logs all actions to SQLite database for the Audit tab.
 */

import Database from 'better-sqlite3';
import path from 'path';

// ============ TYPES ============

export interface AuditEntry {
    action: string;
    timestamp?: string;
    [key: string]: any;
}

// ============ DATABASE SETUP ============

const DB_PATH = path.join(process.cwd(), 'data', 'audit.db');
const db = new Database(DB_PATH);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    data TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
`);

// ============ LOGGING FUNCTIONS ============

const insertStmt = db.prepare(`
  INSERT INTO audit_log (action, data, timestamp) VALUES (?, ?, ?)
`);

export async function auditLog(entry: AuditEntry): Promise<void> {
    const timestamp = entry.timestamp || new Date().toISOString();
    const { action, ...data } = entry;

    try {
        insertStmt.run(action, JSON.stringify(data), timestamp);
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
}

// ============ QUERY FUNCTIONS ============

export function getAuditLogs(params: {
    action?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
}): AuditEntry[] {
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const queryParams: any[] = [];

    if (params.action) {
        query += ' AND action = ?';
        queryParams.push(params.action);
    }

    if (params.startDate) {
        query += ' AND timestamp >= ?';
        queryParams.push(params.startDate);
    }

    if (params.endDate) {
        query += ' AND timestamp <= ?';
        queryParams.push(params.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (params.limit) {
        query += ' LIMIT ?';
        queryParams.push(params.limit);
    }

    if (params.offset) {
        query += ' OFFSET ?';
        queryParams.push(params.offset);
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => ({
        id: row.id,
        action: row.action,
        ...JSON.parse(row.data),
        timestamp: row.timestamp,
    }));
}

export function getAuditStats(): {
    totalEntries: number;
    actionCounts: Record<string, number>;
    recentActions: AuditEntry[];
} {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM audit_log');
    const total = (totalStmt.get() as any).count;

    const countsStmt = db.prepare(`
    SELECT action, COUNT(*) as count 
    FROM audit_log 
    GROUP BY action 
    ORDER BY count DESC
  `);
    const counts = countsStmt.all() as any[];

    const recentStmt = db.prepare(`
    SELECT * FROM audit_log 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
    const recent = recentStmt.all() as any[];

    return {
        totalEntries: total,
        actionCounts: Object.fromEntries(counts.map(c => [c.action, c.count])),
        recentActions: recent.map(row => ({
            id: row.id,
            action: row.action,
            ...JSON.parse(row.data),
            timestamp: row.timestamp,
        })),
    };
}
