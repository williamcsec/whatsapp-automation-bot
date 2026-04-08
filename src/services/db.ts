import { Pool, QueryResultRow } from 'pg';
import { ENV } from '../config/env';

// Prevent pool initialization if DATABASE_URL is somehow missing or malformed at boot
const pool = ENV.DATABASE_URL ? new Pool({
    connectionString: ENV.DATABASE_URL,
    max: 5,                        // Stay well under Supabase free-tier limit (~15)
    idleTimeoutMillis: 60000,      // Keep connections alive longer between sequential tests
    connectionTimeoutMillis: 10000, // Supabase remote Postgres needs more than 2s on cold start
}) : null;

if (!pool) {
    console.warn('[WARN] PostgreSQL Pool not initialized. DATABASE_URL is missing.');
}

/**
 * Single query execution wrapper
 * Safely executes a parameterized query and logs performance.
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
    if (!pool) throw new Error('Database pool not initialized');

    const start = Date.now();
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Specs requirement: Log DB queries to ensure <100ms
    // In production, we might want to sample this instead of logging *every* query
    console.log('[DB] Executed query', { text, durationMs: duration, rows: res.rowCount });

    return res;
}

/**
 * Transaction execution handler wrapper (CRITICAL FOR MONEY OPERATIONS)
 * Provides an atomic block for safe multi-table operations.
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!pool) throw new Error('Database pool not initialized');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function closePool() {
    if (pool) await pool.end();
}
