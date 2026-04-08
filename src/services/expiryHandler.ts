/**
 * expiryHandler.ts — Phase 6 Cron-Based Expiry Scanner
 * Runs every 60 seconds. Handles tiered timer expiry for all active reservations.
 * This is the fallback for Redis keyspace notifications that may be missed.
 */
import { query } from './db';
import { releaseReservation } from './reservationV2';
import { notifyNextInWaitlist } from './waitlist';
import { setGraceWindow, getGraceWindow } from './redis';
import { sendWhatsAppMessage } from './ycloud';

let isRunning = false;

export async function runExpiryCheck(): Promise<void> {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;

    try {
        // Find all orders that should have expired by now
        const expired = await query(
            `SELECT po.id, po.client_id, po.customer_phone, po.product_id,
                    po.cf_order_id, po.payment_link, po.product_price, po.status
             FROM pending_orders po
             WHERE po.expires_at < NOW()
               AND po.status IN ('pending_payment','payment_initiated','payment_processing','discount_hold')`,
            []
        );

        for (const order of expired.rows) {
            await handleExpiredOrder(order);
        }
    } catch (err) {
        console.error('[EXPIRY_HANDLER] Cron scan error:', err);
    } finally {
        isRunning = false;
    }
}

async function handleExpiredOrder(order: {
    id: number;
    client_id: string;
    customer_phone: string;
    product_id: number;
    cf_order_id: string;
    payment_link: string;
    product_price: number;
    status: string;
}): Promise<void> {
    console.log(`[EXPIRY] Processing expired order ${order.id} (${order.status}) for product ${order.product_id}`);

    if (order.status === 'payment_initiated' || order.status === 'payment_processing') {
        // Before releasing: query Cashfree to confirm payment didn't complete silently
        try {
            const cfStatus = await queryCashfreeOrderStatus(order.cf_order_id, order.client_id);
            if (cfStatus === 'PAID') {
                console.log(`[EXPIRY] Cashfree confirms PAID for order ${order.cf_order_id} — skipping expiry`);
                // Mark as paid — the payment webhook may have been missed
                await query(
                    `UPDATE pending_orders SET status = 'paid_confirmed', last_state_change_at = NOW() WHERE id = $1`,
                    [order.id]
                );
                return;
            }
            if (cfStatus === 'ACTIVE') {
                // Payment still in progress — extend 5 more minutes
                const extendedExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
                await query(
                    `UPDATE pending_orders SET expires_at = $1, last_state_change_at = NOW() WHERE id = $2`,
                    [extendedExpiry, order.id]
                );
                await sendWhatsAppMessage(order.customer_phone, 'Thoda aur wait kar sakte hain — aapka payment still processing hai. 5 min mein complete hoga!');
                return;
            }
        } catch (cfErr) {
            console.error('[EXPIRY] Cashfree status check failed:', cfErr);
        }
    }

    if (order.status === 'discount_hold') {
        // Discount timer expired — release and notify buyer
        await releaseReservation(order.product_id, order.client_id, 'discount_hold_expired');
        await sendWhatsAppMessage(order.customer_phone, 'Discount offer expire ho gayi. Normal price pe try karein — item abhi bhi available hai!');
        await notifyNextInWaitlist(order.product_id, order.client_id);
        return;
    }

    // Standard expiry: check if grace window is still valid
    const existingGrace = await getGraceWindow(order.product_id);

    if (!existingGrace) {
        // First expiry — set grace window and notify buyer
        await setGraceWindow(order.product_id, {
            originalPhone: order.customer_phone,
            clientId: order.client_id,
            expiredAt: Date.now(),
        });

        // Reset product to available in DB but DON'T release Redis yet (grace window holds it)
        await query(
            `UPDATE pending_orders SET status = 'expired', last_state_change_at = NOW() WHERE id = $1`,
            [order.id]
        );

        await sendWhatsAppMessage(
            order.customer_phone,
            `⏰ Aapka reservation expire ho gaya!\n\n2 minute ke andar koi bhi message karein toh item phir se reserve ho jaayega — sirf aapke liye! 🛒`
        );
    } else {
        // Grace window already expired OR belongs to different phone — full release
        await releaseReservation(order.product_id, order.client_id, 'timer_and_grace_expired');
        await notifyNextInWaitlist(order.product_id, order.client_id);
    }
}

// ─── Cashfree Order Status Check ─────────────────────────────────────────────
async function queryCashfreeOrderStatus(cfOrderId: string, clientId: string): Promise<string> {
    // Get client's Cashfree credentials
    const clientResult = await query(`SELECT cashfree_app_id, cashfree_secret_key FROM clients WHERE client_id = $1`, [clientId]);
    if (!clientResult.rows[0]) return 'UNKNOWN';

    const { cashfree_app_id, cashfree_secret_key } = clientResult.rows[0];

    try {
        const response = await fetch(`https://api.cashfree.com/pg/orders/${cfOrderId}`, {
            headers: {
                'x-client-id': cashfree_app_id,
                'x-client-secret': cashfree_secret_key,
                'x-api-version': '2023-08-01',
            },
        });
        if (!response.ok) return 'UNKNOWN';
        const data = await response.json() as any;
        return data.order_status ?? 'UNKNOWN'; // PAID | ACTIVE | EXPIRED
    } catch {
        return 'UNKNOWN';
    }
}

// Export for use by paymentWebhook.ts
export { queryCashfreeOrderStatus };
