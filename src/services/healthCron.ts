import { query } from './db';
import { redis } from './redis';

/**
 * Native Node.js cron replacement for n8n system health checks.
 * Pings primary infra (Postgres, Redis) and writes their status to the system_health table.
 */
export async function runSystemHealthCheck() {
    // 1. Check Postgres
    try {
        const startPg = Date.now();
        await query('SELECT 1');
        const latencyPg = Date.now() - startPg;

        await query(
            `INSERT INTO system_health (service_name, status, latency_ms) VALUES ($1, $2, $3)`,
            ['postgres', 'healthy', latencyPg]
        );
    } catch (error: any) {
        console.error('[HEALTH_CRON] Postgres check failed:', error);
        await query(
            `INSERT INTO system_health (service_name, status, error_msg) VALUES ($1, $2, $3)`,
            ['postgres', 'down', error.message]
        ).catch(() => { }); // If PG is totally down, this insert will fail too, but we tried.
    }

    // 2. Check Redis
    try {
        const startRedis = Date.now();
        await redis.ping();
        const latencyRedis = Date.now() - startRedis;

        await query(
            `INSERT INTO system_health (service_name, status, latency_ms) VALUES ($1, $2, $3)`,
            ['redis', 'healthy', latencyRedis]
        );
    } catch (error: any) {
        console.error('[HEALTH_CRON] Redis check failed:', error);
        await query(
            `INSERT INTO system_health (service_name, status, error_msg) VALUES ($1, $2, $3)`,
            ['redis', 'down', error.message]
        );
    }

    // Cleanup old health logs (> 7 days)
    try {
        await query(`DELETE FROM system_health WHERE checked_at < NOW() - INTERVAL '7 days'`);
    } catch (e) { }
}
