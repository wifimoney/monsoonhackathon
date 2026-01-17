import Database from 'better-sqlite3';
import path from 'path';

// Database path - in project root for development
const DB_PATH = path.join(process.cwd(), 'data', 'audit.db');

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get or create database connection
 */
export function getDatabase(): Database.Database {
    if (!db) {
        // Ensure data directory exists
        const fs = require('fs');
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        initializeSchema();
    }
    return db;
}

/**
 * Initialize database schema
 */
function initializeSchema(): void {
    const database = db!;

    // Main audit records table
    database.exec(`
        CREATE TABLE IF NOT EXISTS audit_records (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            action_type TEXT NOT NULL,
            action_category TEXT NOT NULL,
            
            -- Account (stored as JSON)
            account_id TEXT,
            account_name TEXT,
            account_address TEXT,
            
            -- Payload (stored as JSON for flexibility)
            payload TEXT,
            
            -- Result
            status TEXT NOT NULL,
            passed INTEGER NOT NULL,
            denials TEXT,
            
            -- Receipts
            tx_hash TEXT,
            order_id TEXT,
            fill_price REAL,
            fill_amount REAL,
            
            -- Gas
            gas_used TEXT,
            gas_cost TEXT,
            
            -- Source
            source TEXT NOT NULL,
            
            -- Indexes
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        );
        
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_records(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_records(status);
        CREATE INDEX IF NOT EXISTS idx_audit_action_type ON audit_records(action_type);
        CREATE INDEX IF NOT EXISTS idx_audit_tx_hash ON audit_records(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_audit_order_id ON audit_records(order_id);
        CREATE INDEX IF NOT EXISTS idx_audit_account_id ON audit_records(account_id);
    `);
}

/**
 * Close database connection (for cleanup)
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Clear all audit records (for testing)
 */
export function clearAuditRecords(): void {
    const database = getDatabase();
    database.exec('DELETE FROM audit_records');
}
