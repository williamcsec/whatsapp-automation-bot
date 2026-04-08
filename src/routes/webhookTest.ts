import { Router, Request, Response } from 'express';
import { query } from '../services/db';
import { redis } from '../services/redis';
import { ENV } from '../config/env';

export const webhookTestRouter = Router();

interface ServiceCheck {
    service: string;
    status: 'healthy' | 'down' | 'unknown';
    latency_ms: number;
    error?: string;
}

/**
 * GET /webhook/test — Connection health for all integrations.
 * Used by the Super Admin dashboard's System Health page.
 */
webhookTestRouter.get('/test', async (req: Request, res: Response) => {
    const checks: ServiceCheck[] = [];

    // 1. Postgres
    try {
        const start = Date.now();
        await query('SELECT 1');
        checks.push({ service: 'postgres', status: 'healthy', latency_ms: Date.now() - start });
    } catch (err: any) {
        checks.push({ service: 'postgres', status: 'down', latency_ms: 0, error: err.message });
    }

    // 2. Redis
    try {
        const start = Date.now();
        await redis.ping();
        checks.push({ service: 'redis', status: 'healthy', latency_ms: Date.now() - start });
    } catch (err: any) {
        checks.push({ service: 'redis', status: 'down', latency_ms: 0, error: err.message });
    }

    // 3. YCloud API  
    try {
        const start = Date.now();
        const resp = await fetch('https://api.ycloud.com/v2/whatsapp/phoneNumbers', {
            headers: { 'X-API-Key': ENV.YCLOUD_API_KEY || '' },
            signal: AbortSignal.timeout(5000),
        });
        checks.push({
            service: 'ycloud',
            status: resp.ok ? 'healthy' : 'down',
            latency_ms: Date.now() - start,
            error: resp.ok ? undefined : `HTTP ${resp.status}`,
        });
    } catch (err: any) {
        checks.push({ service: 'ycloud', status: 'down', latency_ms: 0, error: err.message });
    }

    // 4. Groq API
    try {
        const start = Date.now();
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY || ''}` },
            signal: AbortSignal.timeout(5000),
        });
        checks.push({
            service: 'groq',
            status: resp.ok ? 'healthy' : 'down',
            latency_ms: Date.now() - start,
            error: resp.ok ? undefined : `HTTP ${resp.status}`,
        });
    } catch (err: any) {
        checks.push({ service: 'groq', status: 'down', latency_ms: 0, error: err.message });
    }

    // 5. Cashfree (sandbox)
    try {
        const start = Date.now();
        const resp = await fetch('https://sandbox.cashfree.com/pg/orders', {
            method: 'POST',
            headers: {
                'x-client-id': ENV.CASHFREE_APP_ID || '',
                'x-client-secret': ENV.CASHFREE_SECRET_KEY || '',
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}), // Empty body will return 400 but proves connectivity
            signal: AbortSignal.timeout(5000),
        });
        // 400 means connected but bad request — that's fine, proves reachability
        checks.push({
            service: 'cashfree',
            status: resp.status === 400 || resp.ok ? 'healthy' : 'down',
            latency_ms: Date.now() - start,
            error: resp.status >= 500 ? `HTTP ${resp.status}` : undefined,
        });
    } catch (err: any) {
        checks.push({ service: 'cashfree', status: 'down', latency_ms: 0, error: err.message });
    }

    const allHealthy = checks.every(c => c.status === 'healthy');

    res.status(200).json({
        overall: allHealthy ? 'ALL_SYSTEMS_OPERATIONAL' : 'ISSUE_DETECTED',
        timestamp: new Date().toISOString(),
        checks,
    });
});
