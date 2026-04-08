/**
 * waitlist.ts — Phase 6 Waitlist Queue Management
 * Uses Redis sorted sets as primary queue + Postgres waitlists table as backup.
 */
import { redis } from './redis';
import { query } from './db';
import { sendWhatsAppMessage } from './ycloud';
import { reserveProduct } from './reservationV2';
import { logAudit } from './reservationV2';

// ─── addToWaitlist ────────────────────────────────────────────────────────────
export async function addToWaitlist(
    productId: number,
    clientId: string,
    hashId: string,
    customerPhone: string,
    customerName?: string
): Promise<number> {
    // Determine next queue position from DB
    const posResult = await query(
        `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
         FROM waitlists WHERE product_id = $1 AND status = 'waiting'`,
        [productId]
    );
    const position: number = posResult.rows[0].next_pos;

    // Write to Postgres
    await query(
        `INSERT INTO waitlists (client_id, product_id, hash_id, customer_phone, customer_name, position, status)
         VALUES ($1,$2,$3,$4,$5,$6,'waiting')
         ON CONFLICT (product_id, customer_phone) WHERE status = 'waiting' DO NOTHING`,
        [clientId, productId, hashId, customerPhone, customerName ?? null, position]
    );

    // Write to Redis sorted set (score = position for ordering)
    const queueKey = `reserve:item:${productId}:waitlist`;
    const payload = JSON.stringify({ phone: customerPhone, clientId, hashId, position, addedAt: Date.now() });
    try {
        await redis.zadd(queueKey, position, payload);
        await redis.expire(queueKey, 86400); // 24hrs TTL
    } catch (redisErr) {
        console.error('[WAITLIST] Redis zadd failed (DB state is safe):', redisErr);
    }

    await logAudit({
        clientId, productId, customerPhone,
        fromState: 'browsing', toState: 'waitlisted',
        triggerEvent: 'added_to_waitlist',
        metadata: { position },
    });

    return position;
}

// ─── notifyNextInWaitlist ─────────────────────────────────────────────────────
export async function notifyNextInWaitlist(productId: number, clientId: string): Promise<void> {
    const queueKey = `reserve:item:${productId}:waitlist`;
    let success = false;

    // FIX 12: Use an iterative loop instead of recursion to prevent stack overflow
    // if we rapidly burn through multiple waitlist members who fail reservation checks
    while (!success) {
        let nextEntry: any = null;
        try {
            // ZPOPMIN: remove + return the lowest-score (first in queue) member
            const results = await redis.zpopmin(queueKey, 1);
            if (results && results.length >= 2) {
                nextEntry = JSON.parse(results[0] as string);
            }
        } catch {
            // Redis unavailable — fall back to DB
            const r = await query(
                `SELECT customer_phone, client_id, hash_id FROM waitlists
                 WHERE product_id = $1 AND status = 'waiting'
                 ORDER BY position ASC LIMIT 1`,
                [productId]
            );
            if (r.rows.length > 0) {
                nextEntry = { phone: r.rows[0].customer_phone, clientId: r.rows[0].client_id, hashId: r.rows[0].hash_id };
            }
        }

        if (!nextEntry) {
            console.log(`[WAITLIST] No one in queue for product ${productId}`);
            return; // Nobody left, exit loop
        }

        const { phone, hashId } = nextEntry;

        // Update DB status
        await query(
            `UPDATE waitlists SET status = 'notified', notified_at = NOW(),
             notification_expires_at = NOW() + INTERVAL '10 minutes'
             WHERE product_id = $1 AND customer_phone = $2 AND status = 'waiting'`,
            [productId, phone]
        );

        // Attempt to auto-reserve for them
        const result = await reserveProduct(productId, clientId, phone, hashId);

        if (result.success) {
            await sendWhatsAppMessage(
                phone,
                `🎉 Aapki bari aa gayi! Item available hai.\n\n${result.message}`
            );
            await logAudit({
                clientId, productId, customerPhone: phone,
                fromState: 'waitlisted', toState: 'hard_reserved',
                triggerEvent: 'waitlist_notified_and_reserved',
            });
            success = true; // Mission accomplished, exit loop
        }
        // If it failed, success is still false, loop will continue to grab the next member
    }
}

// ─── clearWaitlistForProduct ──────────────────────────────────────────────────
export async function clearWaitlistForProduct(productId: number, clientId: string): Promise<void> {
    const queueKey = `reserve:item:${productId}:waitlist`;

    try {
        const allMembers = await redis.zrange(queueKey, 0, -1);
        for (const member of allMembers) {
            const person = JSON.parse(member);
            await query(
                `UPDATE waitlists SET status = 'expired' WHERE product_id = $1 AND customer_phone = $2`,
                [productId, person.phone]
            );
        }
        await redis.del(queueKey);
    } catch {
        // Best-effort cleanup
        await query(`UPDATE waitlists SET status = 'expired' WHERE product_id = $1 AND status = 'waiting'`, [productId]);
    }

    await logAudit({
        clientId, productId, customerPhone: 'system',
        fromState: 'active', toState: 'cleared',
        triggerEvent: 'product_sold_waitlist_cleared',
    });
}
