import { app } from './app';
import { ENV, validateEnv } from './config/env';
import { redis } from './services/redis';
import { runExpiryCheck } from './services/expiryHandler'; // Phase 6: tiered expiry cron
import { runSystemHealthCheck } from './services/healthCron'; // Phase 8: native system health checks

async function startServer() {
    try {
        validateEnv();

        app.listen(ENV.PORT, () => {
            console.log(`[BOOT] AutomatXpress Server running on port ${ENV.PORT}`);
        });

        // Phase 6: Expiry scanner — runs every 60 seconds
        setInterval(() => {
            runExpiryCheck().catch(err => console.error('[EXPIRY_CRON] Error:', err));
        }, 60_000);
        console.log('[BOOT] Phase 6 expiry cron started (60s interval)');

        // Phase 8: System health scanner (avoids needing n8n) - runs every 5 mins
        setInterval(() => {
            runSystemHealthCheck().catch(err => console.error('[HEALTH_CRON] Error:', err));
        }, 300_000);
        console.log('[BOOT] Phase 8 system health cron started (5m interval)');

    } catch (error) {
        console.error('[FATAL] Failed to start server:', error);
        process.exit(1);
    }
}


// Graceful shutdown handlers
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await redis.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await redis.quit();
    process.exit(0);
});

startServer();
