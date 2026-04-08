/**
 * virtualInventory.ts — Phase 6 Virtual Inventory Gate
 * Virtual items = items the shop can source but doesn't physically have yet.
 * No payment link is ever generated until the owner confirms they have it.
 */
import { query } from './db';
import { redis } from './redis';
import { logAudit } from './reservationV2';
import { sendWhatsAppMessage } from './ycloud';

// ─── virtualInterestHandler ───────────────────────────────────────────────────
export async function virtualInterestHandler(
    productId: number,
    clientId: string,
    customerPhone: string
): Promise<void> {
    const virtualKey = `virtual:confirm:${productId}:${customerPhone}`;

    // Prevent duplicate requests from same customer
    try {
        const existing = await redis.get(virtualKey);
        if (existing) {
            await sendWhatsAppMessage(customerPhone, 'Aapki request pehle se registered hai. Owner ke confirm karte hi notify karenge!');
            return;
        }
        await redis.set(virtualKey, 'pending_owner', 'EX', 1800); // 30 min
    } catch { /* Redis unavailable — allow through */ }

    // Mark product as virtual_pending in DB
    await query(
        `UPDATE products SET status = 'virtual_pending' WHERE id = $1 AND client_id = $2 AND status = 'available'`,
        [productId, clientId]
    );

    // Record interest (so owner knows who to contact)
    await query(
        `INSERT INTO waitlists (client_id, product_id, hash_id, customer_phone, position, status)
         SELECT $1, $2, 'virtual', $3, COALESCE(MAX(position),0)+1, 'waiting'
         FROM waitlists WHERE product_id = $2
         ON CONFLICT DO NOTHING`,
        [clientId, productId, customerPhone]
    );

    await logAudit({
        clientId, productId, customerPhone,
        fromState: 'available', toState: 'virtual_pending',
        triggerEvent: 'virtual_interest_registered',
        redisKey: virtualKey,
    });

    await sendWhatsAppMessage(
        customerPhone,
        `📋 Noted! Yeh item abhi hamare paas nahi hai, par hum source kar sakte hain.\n\nOwner se confirm karke 30 minute mein aapko notify karenge. Thoda wait karein! 🙏`
    );
}

// ─── ownerConfirm ─────────────────────────────────────────────────────────────
export async function ownerConfirm(productId: number, clientId: string): Promise<void> {
    // Owner confirmed — mark item as physical and available
    await query(
        `UPDATE products SET item_type = 'physical', status = 'available',
         owner_confirmed = TRUE, owner_confirmed_at = NOW()
         WHERE id = $1 AND client_id = $2`,
        [productId, clientId]
    );

    // Clear all virtual:confirm keys for this product
    try {
        let cursor = '0';
        const match = `virtual:confirm:${productId}:*`;
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== '0');
    } catch { /* non-critical */ }

    await logAudit({
        clientId, productId, customerPhone: 'owner',
        fromState: 'virtual_pending', toState: 'available',
        triggerEvent: 'owner_confirmed_virtual_item',
        triggeredBy: 'owner',
    });

    // Notify first interested customer — they can now buy
    const firstInterested = await query(
        `SELECT customer_phone FROM waitlists
         WHERE product_id = $1 AND status = 'waiting'
         ORDER BY position ASC LIMIT 1`,
        [productId]
    );

    if (firstInterested.rows.length > 0) {
        await sendWhatsAppMessage(
            firstInterested.rows[0].customer_phone,
            `🎉 Good news! Jis item mein aapki interest thi woh ab available hai! Reply "buy" karo reserve karne ke liye!`
        );
    }
}

// ─── virtualTimeoutHandler ────────────────────────────────────────────────────
export async function virtualTimeoutHandler(productId: number, clientId: string): Promise<void> {
    // Owner never confirmed in 30 min — reset product, notify buyers
    await query(
        `UPDATE products SET status = 'available', item_type = 'virtual'
         WHERE id = $1 AND client_id = $2 AND status = 'virtual_pending'`,
        [productId, clientId]
    );

    await logAudit({
        clientId, productId, customerPhone: 'system',
        fromState: 'virtual_pending', toState: 'available',
        triggerEvent: 'virtual_owner_timeout',
    });

    // Notify all waiting customers
    const waitingBuyers = await query(
        `SELECT customer_phone FROM waitlists WHERE product_id = $1 AND status = 'waiting'`,
        [productId]
    );

    for (const buyer of waitingBuyers.rows) {
        await sendWhatsAppMessage(
            buyer.customer_phone,
            `Sorry, abhi source nahi kar paaye yeh item. Jab bhi available hoga, hum aapko sabse pehle notify karenge! 🙏`
        );
    }

    // Mark all as expired
    await query(
        `UPDATE waitlists SET status = 'expired' WHERE product_id = $1 AND status = 'waiting'`,
        [productId]
    );
}
